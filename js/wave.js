// Inject wave.css only when this context is inside an iframe
(() => {
  if (window.top === window) return; // top document → do nothing

  const api = typeof browser !== "undefined" ? browser : chrome;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = api.runtime.getURL("css/wave.css");
  (document.head || document.documentElement).appendChild(link);
})();
