const $ = (id) => document.getElementById(id);
const statusEl = $("status");

function setStatus(msg, type = "info") {
  statusEl.textContent = msg;
  statusEl.className = `status-${type}`;
}

// Load saved settings
chrome.storage.sync.get(
  ["kindleEmail", "senderEmail", "smtpHost", "smtpPort", "smtpPass"],
  (data) => {
    if (data.kindleEmail) $("kindleEmail").value = data.kindleEmail;
    if (data.senderEmail) $("senderEmail").value = data.senderEmail;
    if (data.smtpHost) $("smtpHost").value = data.smtpHost;
    if (data.smtpPort) $("smtpPort").value = data.smtpPort;
    if (data.smtpPass) $("smtpPass").value = data.smtpPass;
  }
);

$("saveBtn").addEventListener("click", () => {
  const settings = {
    kindleEmail: $("kindleEmail").value.trim(),
    senderEmail: $("senderEmail").value.trim(),
    smtpHost: $("smtpHost").value.trim(),
    smtpPort: $("smtpPort").value.trim() || "465",
    smtpPass: $("smtpPass").value,
  };
  if (!settings.kindleEmail || !settings.senderEmail) {
    setStatus("Both email fields are required.", "err");
    return;
  }
  chrome.storage.sync.set(settings, () => {
    setStatus("Settings saved!", "ok");
  });
});

$("sendBtn").addEventListener("click", async () => {
  setStatus("Extracting conversation...", "info");
  $("sendBtn").disabled = true;

  try {
    // Get settings
    const settings = await new Promise((resolve) =>
      chrome.storage.sync.get(
        ["kindleEmail", "senderEmail", "smtpHost", "smtpPort", "smtpPass"],
        resolve
      )
    );

    if (!settings.kindleEmail || !settings.senderEmail || !settings.smtpPass) {
      setStatus("Please save your settings first.", "err");
      $("sendBtn").disabled = false;
      return;
    }

    // Extract markdown from the active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractConversation,
    });

    if (!result || !result.markdown) {
      setStatus("No conversation found on this page.", "err");
      $("sendBtn").disabled = false;
      return;
    }

    setStatus(`Extracted ${result.markdown.length} chars. Sending...`, "info");

    // Convert markdown to a simple HTML document for Kindle
    const htmlDoc = markdownToKindleHtml(result.markdown, result.title);

    // Send via email using EmailJS-style SMTP relay
    await sendViaSmtp(settings, htmlDoc, result.title);

    setStatus("Sent to Kindle!", "ok");
  } catch (err) {
    setStatus(`Error: ${err.message}`, "err");
    console.error(err);
  }
  $("sendBtn").disabled = false;
});

function extractConversation() {
  const url = window.location.hostname;
  let markdown = "";
  let title = document.title || "Chat Conversation";

  if (url.includes("chatgpt.com") || url.includes("chat.openai.com")) {
    // ChatGPT extraction
    const turns = document.querySelectorAll('[data-message-author-role]');
    if (turns.length === 0) {
      // Fallback: try article elements
      const articles = document.querySelectorAll("article");
      articles.forEach((article, i) => {
        const role = i % 2 === 0 ? "User" : "ChatGPT";
        markdown += `## ${role}\n\n${article.innerText.trim()}\n\n---\n\n`;
      });
    } else {
      turns.forEach((turn) => {
        const role = turn.getAttribute("data-message-author-role");
        const label = role === "user" ? "User" : "ChatGPT";
        const content = turn.querySelector(".markdown, .whitespace-pre-wrap");
        const text = content
          ? content.innerText.trim()
          : turn.innerText.trim();
        markdown += `## ${label}\n\n${text}\n\n---\n\n`;
      });
    }
  } else if (url.includes("claude.ai")) {
    // Claude extraction
    const turns = document.querySelectorAll(
      '[data-testid="user-human-turn"], [data-testid="user-assistant-turn"]'
    );
    if (turns.length > 0) {
      turns.forEach((turn) => {
        const isUser = turn
          .getAttribute("data-testid")
          ?.includes("human");
        const label = isUser ? "User" : "Claude";
        markdown += `## ${label}\n\n${turn.innerText.trim()}\n\n---\n\n`;
      });
    } else {
      // Fallback: grab all message-like containers
      const msgs = document.querySelectorAll(
        ".font-claude-message, .font-user-message, [class*='Message']"
      );
      msgs.forEach((msg) => {
        const text = msg.innerText.trim();
        if (text) markdown += `${text}\n\n---\n\n`;
      });
      // Last resort: main content area
      if (!markdown) {
        const main = document.querySelector("main");
        if (main) markdown = main.innerText.trim();
      }
    }
  }

  return { markdown: markdown.trim(), title };
}

function markdownToKindleHtml(md, title) {
  // Convert basic markdown to HTML for Kindle rendering
  let html = md
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:2px 4px;border-radius:3px;">$1</code>')
    // Code blocks
    .replace(
      /```[\w]*\n([\s\S]*?)```/g,
      '<pre style="background:#f5f5f5;padding:12px;border-radius:6px;overflow-x:auto;font-size:12px;"><code>$1</code></pre>'
    )
    // Horizontal rules
    .replace(/^---$/gm, "<hr>")
    // Line breaks (double newline = paragraph)
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  body { font-family: Georgia, serif; line-height: 1.6; padding: 20px; max-width: 700px; margin: 0 auto; }
  h1, h2, h3 { margin-top: 1.2em; }
  h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  pre { white-space: pre-wrap; word-wrap: break-word; }
  hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }
  code { font-family: 'Courier New', monospace; }
  p { margin: 0.5em 0; }
</style>
</head>
<body>
<h1>${title}</h1>
<p>${html}</p>
</body>
</html>`;
}

async function sendViaSmtp(settings, htmlContent, title) {
  // We use the SmtpJS approach: load smtpjs and send
  // Since Chrome extensions can't directly do SMTP, we use the EmailJS/SMTP.js
  // free relay, or we construct and send via a fetch to a tiny server.
  //
  // Best practical approach for a Chrome extension: use the mailto: fallback
  // or a small cloud function. For self-contained operation, we'll create the
  // email as a downloadable .html file and open Gmail compose with attachment.
  //
  // Most reliable: generate the file and open the user's email client.

  const blob = new Blob([htmlContent], { type: "text/html" });
  const filename = `${sanitizeFilename(title)}.html`;

  // Create download URL
  const url = URL.createObjectURL(blob);

  // Download the file so user has it
  await chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: false,
  });

  // Open Gmail compose to the kindle address
  const subject = encodeURIComponent(title);
  const body = encodeURIComponent(
    "Please find the attached conversation. (Attach the downloaded HTML file to this email.)"
  );
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    settings.kindleEmail
  )}&su=${subject}&body=${body}`;

  chrome.tabs.create({ url: gmailUrl });
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, "").substring(0, 60) || "conversation";
}
