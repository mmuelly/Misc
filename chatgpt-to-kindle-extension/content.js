// Content script - injected into ChatGPT and Claude pages.
// This enables communication between the popup and page DOM if needed.
// The main extraction logic runs via chrome.scripting.executeScript from popup.js,
// but this content script can provide a fallback message listener.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractConversation") {
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
          const content = turn.querySelector(
            ".markdown, .whitespace-pre-wrap"
          );
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
          const isUser = turn
            .getAttribute("data-testid")
            ?.includes("human");
          const label = isUser ? "User" : "Claude";
          markdown += `## ${label}\n\n${turn.innerText.trim()}\n\n---\n\n`;
        });
      } else {
        const main = document.querySelector("main");
        if (main) markdown = main.innerText.trim();
      }
    }

    sendResponse({ markdown: markdown.trim(), title });
  }
  return true;
});
