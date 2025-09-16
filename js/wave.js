// Inject wave.css only when this context is inside an iframe
(() => {
  if (window.top === window) return; // top document → do nothing

  const api = typeof browser !== "undefined" ? browser : chrome;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = api.runtime.getURL("css/wave.css");
  (document.head || document.documentElement).appendChild(link);

  // ---------- utils ----------
  const $all = (root, sel) => Array.from(root.querySelectorAll(sel));
  const byTextDiv = (el) => el && el.tagName === "DIV";
  const parseFraction = (txt) => {
    // accepts "❤️ 1,234 / 5,678 HP", "1234/5678", etc.
    if (!txt) return 0;
    const cleaned = txt.replace(/\s|❤️|HP/gi, "");
    const m = cleaned.match(/([\d,]+)\/([\d,]+)/);
    if (!m) return 0;
    const n = parseInt(m[1].replace(/,/g, ""), 10) || 0;
    const d = parseInt(m[2].replace(/,/g, ""), 10) || 1;
    return n / d;
  };

  function getLifeDiv(card) {
    // Try common class names first, otherwise fallback to "2nd div child"
    return (
      card.querySelector(".life-text-div, .life, .hp-text, .hp") ||
      $all(card, ":scope > div").filter(byTextDiv)[1] ||
      null
    );
  }

  function isDead(card) {
    return !!(
      card.querySelector(".grayscale") || card.classList.contains("grayscale")
    );
  }

  function reorderAndAnnotate(host) {
    let cards = $all(host, ".monster-card");
    if (cards.length === 0) return false;

    // Mark unprocessed only
    const fresh = cards.filter((c) => !c.dataset.waveProcessed);
    if (fresh.length === 0) return true; // already handled

    // Compute dead/alive & sort keys
    const deadSet = new Set(cards.filter(isDead));

    cards.sort((a, b) => {
      const aDead = deadSet.has(a),
        bDead = deadSet.has(b);
      if (aDead !== bDead) return aDead ? -1 : 1; // dead first

      const nameA = (a.querySelector("h3")?.textContent || "").trim();
      const nameB = (b.querySelector("h3")?.textContent || "").trim();
      if (nameA && nameB && nameA !== nameB) return nameA < nameB ? -1 : 1;

      // life fraction descending
      const lifeA = parseFraction(getLifeDiv(a)?.textContent || "");
      const lifeB = parseFraction(getLifeDiv(b)?.textContent || "");
      return lifeB - lifeA;
    });

    // Move each card, clean up, and tuck the life text into the hp bar if present
    const parent = cards[0].parentNode;
    const frag = document.createDocumentFragment();

    cards.forEach((card) => {
      // remove first <br> if present
      const br = card.querySelector("br");
      if (br) br.remove();

      // Normalize any join button label
      const joinBtn = card.querySelector(".join-btn");
      if (joinBtn && typeof joinBtn.innerText === "string") {
        if (joinBtn.innerText.toLowerCase().includes("join"))
          joinBtn.innerText = "Join";
        if (joinBtn.innerText.toLowerCase().includes("continue"))
          joinBtn.innerText = "Resume";
      }

      const lifeDiv = getLifeDiv(card);
      const hpBar = card.querySelector(".hp-bar");
      if (lifeDiv && hpBar && !hpBar.contains(lifeDiv)) {
        lifeDiv.innerText = (lifeDiv.innerText || "")
          .trim()
          .replace(/❤️|HP/g, "")
          .replace(/,/g, "")
          .replace(" / ", "/");

        lifeDiv.classList.add("life-text-div");
        hpBar.appendChild(lifeDiv);
      }

      // Find the "Players Joined ..." div (immediately after .hp-bar OR anywhere as a fallback)
      let playersDiv =
        card.querySelector(":scope > .hp-bar + div") ||
        Array.from(card.querySelectorAll(":scope > div")).find((d) =>
          /players\s*joined/i.test(
            (d.textContent || "").replace(/\u00A0/g, " ")
          )
        );

      if (playersDiv) {
        // Normalize text: strip NBSP, emoji, multiple spaces
        const raw = (playersDiv.textContent || "")
          .replace(/\u00A0/g, " ")
          .replace(/^\s*👥\s*/u, "")
          .trim();

        // Prefer extracting the X/Y numbers if present
        const m = raw.match(/(\d+)\s*\/\s*(\d+)/);
        if (m) {
          playersDiv.textContent = `${m[1]}/${m[2]}`; // e.g. "1/30"
        } else {
          // Fallback: just remove the label
          playersDiv.textContent = raw
            .replace(/^\s*players\s*joined\s*/i, "")
            .trim();
        }
      }

      let btn = card.querySelector("a>button");
      if (deadSet.has(card) && btn) {
        card.style.display = "none";
        if (!card.querySelector(".spacediv")) {
          const spacer = document.createElement("div");
          spacer.classList.add("spacediv");
          card.insertBefore(spacer, btn.parentNode);
        }
      }

      card.dataset.waveProcessed = "1";
      frag.appendChild(card);
    });

    parent.appendChild(frag);

    return true;
  }

  function init() {
    const host = document.body || document.documentElement;
    if (!host) return false;
    return reorderAndAnnotate(host);
  }

  // 1) Try immediately
  let done = init();

  // 2) If <body>/cards aren't ready yet, observe until they show up once
  if (!done) {
    const readyObs = new MutationObserver(() => {
      if (init()) readyObs.disconnect();
    });
    readyObs.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
})();
