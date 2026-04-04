const $ = (id) => document.getElementById(id);
const statusEl = $("status");

function setStatus(msg, type = "info") {
  statusEl.textContent = msg;
  statusEl.className = `status-${type}`;
}

// ── Settings toggle ──────────────────────────────────────────────
$("settingsToggle").addEventListener("click", () => {
  const body = $("settingsBody");
  const arrow = $("settingsArrow");
  body.classList.toggle("open");
  arrow.classList.toggle("open");
});

// ── Load saved settings ──────────────────────────────────────────
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

// ── Queue Management ─────────────────────────────────────────────

// Queue is stored in chrome.storage.local as an array of { title, markdown, addedAt }
let queue = [];

function loadQueue() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["conversationQueue"], (data) => {
      queue = data.conversationQueue || [];
      resolve();
    });
  });
}

function saveQueue() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ conversationQueue: queue }, resolve);
  });
}

function renderQueue() {
  const list = $("queueList");
  $("queueCount").textContent = queue.length;
  $("sendBtn").disabled = queue.length === 0;

  if (queue.length === 0) {
    list.innerHTML = '<div class="queue-empty">No conversations queued yet.</div>';
    return;
  }

  list.innerHTML = queue
    .map(
      (item, i) => `
    <div class="queue-item" data-index="${i}">
      <span class="num">${i + 1}</span>
      <span class="title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</span>
      <span class="chars">${formatChars(item.markdown.length)}</span>
      <button class="remove" data-index="${i}">&times;</button>
    </div>`
    )
    .join("");

  // Attach remove handlers
  list.querySelectorAll(".remove").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index, 10);
      queue.splice(idx, 1);
      await saveQueue();
      renderQueue();
      setStatus("Removed from queue.", "info");
    });
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatChars(n) {
  if (n > 1000) return `${(n / 1000).toFixed(1)}k chars`;
  return `${n} chars`;
}

// Init queue on popup open
loadQueue().then(renderQueue);

// ── Add to Queue ─────────────────────────────────────────────────
$("queueBtn").addEventListener("click", async () => {
  setStatus("Extracting conversation...", "info");
  $("queueBtn").disabled = true;

  try {
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
      $("queueBtn").disabled = false;
      return;
    }

    queue.push({
      title: result.title,
      markdown: result.markdown,
      addedAt: new Date().toISOString(),
    });
    await saveQueue();
    renderQueue();

    setStatus(
      `Added "${result.title.substring(0, 30)}..." to queue (${queue.length} total).`,
      "ok"
    );
  } catch (err) {
    setStatus(`Error: ${err.message}`, "err");
    console.error(err);
  }
  $("queueBtn").disabled = false;
});

// ── Clear Queue ──────────────────────────────────────────────────
$("clearBtn").addEventListener("click", async () => {
  queue = [];
  await saveQueue();
  renderQueue();
  setStatus("Queue cleared.", "info");
});

// ── Send Queue to Kindle ─────────────────────────────────────────
$("sendBtn").addEventListener("click", async () => {
  if (queue.length === 0) {
    setStatus("Queue is empty. Add conversations first.", "err");
    return;
  }

  setStatus("Stitching documents...", "info");
  $("sendBtn").disabled = true;

  try {
    const settings = await new Promise((resolve) =>
      chrome.storage.sync.get(
        ["kindleEmail", "senderEmail", "smtpHost", "smtpPort", "smtpPass"],
        resolve
      )
    );

    if (!settings.kindleEmail || !settings.senderEmail) {
      setStatus("Please configure your email settings first.", "err");
      $("sendBtn").disabled = false;
      return;
    }

    // Build one stitched HTML document with title pages between each conversation
    const stitchedHtml = buildStitchedDocument(queue);
    const docTitle =
      queue.length === 1
        ? queue[0].title
        : `${queue.length} Conversations - ${new Date().toLocaleDateString()}`;

    setStatus(`Stitched ${queue.length} conversations. Sending...`, "info");

    await sendToKindle(settings, stitchedHtml, docTitle);

    // Clear queue after successful send
    queue = [];
    await saveQueue();
    renderQueue();

    setStatus("Sent to Kindle!", "ok");
  } catch (err) {
    setStatus(`Error: ${err.message}`, "err");
    console.error(err);
  }
  $("sendBtn").disabled = queue.length === 0;
});

// ── Conversation Extraction (injected into page) ─────────────────
function extractConversation() {
  const url = window.location.hostname;
  let markdown = "";
  let title = document.title || "Chat Conversation";

  if (url.includes("chatgpt.com") || url.includes("chat.openai.com")) {
    const turns = document.querySelectorAll("[data-message-author-role]");
    if (turns.length === 0) {
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
    const turns = document.querySelectorAll(
      '[data-testid="user-human-turn"], [data-testid="user-assistant-turn"]'
    );
    if (turns.length > 0) {
      turns.forEach((turn) => {
        const isUser = turn.getAttribute("data-testid")?.includes("human");
        const label = isUser ? "User" : "Claude";
        markdown += `## ${label}\n\n${turn.innerText.trim()}\n\n---\n\n`;
      });
    } else {
      const msgs = document.querySelectorAll(
        ".font-claude-message, .font-user-message, [class*='Message']"
      );
      msgs.forEach((msg) => {
        const text = msg.innerText.trim();
        if (text) markdown += `${text}\n\n---\n\n`;
      });
      if (!markdown) {
        const main = document.querySelector("main");
        if (main) markdown = main.innerText.trim();
      }
    }
  }

  return { markdown: markdown.trim(), title };
}

// ── Build Stitched Document ──────────────────────────────────────
function buildStitchedDocument(items) {
  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Table of contents
  const tocEntries = items
    .map(
      (item, i) =>
        `<li><a href="#conv-${i + 1}" style="color:#e94560;text-decoration:none;">${escapeHtml(item.title)}</a></li>`
    )
    .join("\n");

  // Each conversation as a section with a title page
  const sections = items
    .map((item, i) => {
      const sectionHtml = markdownToHtml(item.markdown);
      const addedDate = new Date(item.addedAt).toLocaleString();
      return `
      <!-- Title page for conversation ${i + 1} -->
      <div style="page-break-before:always;text-align:center;padding:80px 20px 40px;">
        <h1 id="conv-${i + 1}" style="font-size:28px;color:#1a1a2e;margin-bottom:12px;">${escapeHtml(item.title)}</h1>
        <p style="color:#888;font-size:14px;">Conversation ${i + 1} of ${items.length}</p>
        <p style="color:#aaa;font-size:12px;">Added ${addedDate}</p>
        <hr style="margin:30px auto;width:40%;border:none;border-top:2px solid #e94560;">
      </div>

      <!-- Conversation content -->
      <div style="padding:0 10px;">
        <p>${sectionHtml}</p>
      </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${items.length} Conversations - ${now}</title>
<style>
  body { font-family: Georgia, serif; line-height: 1.6; padding: 20px; max-width: 700px; margin: 0 auto; color: #222; }
  h1, h2, h3 { margin-top: 1.2em; }
  h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  pre { white-space: pre-wrap; word-wrap: break-word; background: #f5f5f5; padding: 12px; border-radius: 6px; font-size: 12px; }
  hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }
  code { font-family: 'Courier New', monospace; }
  p { margin: 0.5em 0; }
  a { color: #e94560; }
  .cover { text-align: center; padding: 60px 20px; }
  .cover h1 { font-size: 32px; color: #1a1a2e; }
  .toc { margin: 20px auto; max-width: 500px; }
  .toc ol { padding-left: 20px; }
  .toc li { margin: 8px 0; font-size: 16px; }
</style>
</head>
<body>

<!-- Cover page -->
<div class="cover">
  <h1>Chat Conversations</h1>
  <p style="color:#888;font-size:16px;">${items.length} conversation${items.length > 1 ? "s" : ""} collected on ${now}</p>
  <hr style="margin:30px auto;width:30%;border:none;border-top:3px solid #e94560;">
</div>

<!-- Table of contents -->
<div class="toc">
  <h2 style="text-align:center;border:none;">Table of Contents</h2>
  <ol>${tocEntries}</ol>
</div>

${sections}

</body>
</html>`;
}

// ── Markdown to HTML ─────────────────────────────────────────────
function markdownToHtml(md) {
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /`([^`]+)`/g,
      '<code style="background:#f0f0f0;padding:2px 4px;border-radius:3px;">$1</code>'
    )
    .replace(
      /```[\w]*\n([\s\S]*?)```/g,
      '<pre><code>$1</code></pre>'
    )
    .replace(/^---$/gm, "<hr>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

// ── Send to Kindle ───────────────────────────────────────────────
async function sendToKindle(settings, htmlContent, title) {
  const blob = new Blob([htmlContent], { type: "text/html" });
  const filename = `${sanitizeFilename(title)}.html`;
  const url = URL.createObjectURL(blob);

  await chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: false,
  });

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
  return (
    name.replace(/[^a-zA-Z0-9_\- ]/g, "").substring(0, 60) || "conversation"
  );
}
