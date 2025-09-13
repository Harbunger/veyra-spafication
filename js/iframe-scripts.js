// Runs INSIDE the iframe
(() => {
  if (window.top === window) return; // top document → do nothing

  const api = typeof browser !== "undefined" ? browser : chrome;

  // --- inject CSS immediately (head may or may not exist yet)
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = api.runtime.getURL("css/iframe-styles.css");
  (document.head || document.documentElement).appendChild(link);

  // ------------------------------------------------------------------
  // Remove topbar + add refresh button (class "reload-btn") cleanly
  // ------------------------------------------------------------------
  const RELOAD_ID = "__veyra_reload_btn";

  function removeTopbar(root = document) {
    try {
      root.querySelectorAll(".game-topbar").forEach((el) => el.remove());
    } catch {}
  }

  function mountReloadBtn() {
    // avoid duplicates
    if (document.getElementById(RELOAD_ID)) return true;

    const host = document.body || document.documentElement; // safe even if <body> not ready
    if (!host) return false; // too early; init()/observers will retry

    const btn = document.createElement("button");
    btn.id = RELOAD_ID;
    btn.type = "button";
    btn.className = "reload-btn"; // styled by your iframe-styles.css
    btn.textContent = "⟳";
    btn.addEventListener("click", () => {
      if (location.href !== "about:blank") location.reload();
    });

    host.appendChild(btn);
    return true;
  }

  function init() {
    removeTopbar();
    mountReloadBtn();
  }

  // 1) Try immediately
  init();

  // 2) If <body> isn't present yet, wait once, then init
  if (!document.body) {
    const waitForBody = new MutationObserver(() => {
      if (document.body) {
        waitForBody.disconnect();
        init();
      }
    });
    waitForBody.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  // 3) Re-run on lifecycle (covers many SPA navigations)
  window.addEventListener("DOMContentLoaded", init);
  window.addEventListener("load", init);

  // 4) Keep-alive: if the app replaces DOM later, re-add button & keep topbar removed
  const keepAlive = new MutationObserver(() => {
    if (!document.getElementById(RELOAD_ID)) mountReloadBtn();
    const tb = document.querySelector(".game-topbar");
    if (tb) tb.remove();
  });
  keepAlive.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
