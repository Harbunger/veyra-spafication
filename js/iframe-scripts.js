// Inject wave.css only when this context is inside an iframe
(() => {
  if (window.top === window) return; // top document → do nothing

  const api = typeof browser !== "undefined" ? browser : chrome;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = api.runtime.getURL("css/iframe-styles.css");
  (document.head || document.documentElement).appendChild(link);

  // Utility: remove .game-topbar if it exists
  function removeTopbar(doc) {
    try {
      doc.querySelectorAll(".game-topbar").forEach((tb) => tb.remove());
    } catch {}
  }
  document.addEventListener("load", () => {
    removeTopbar(document);
  });
})();
