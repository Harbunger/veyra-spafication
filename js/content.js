(() => {
  function start() {
    let urls = {
      left: window.location.href,
      mid: null,
      right: null,
    };

    // Map: URL -> column ("left" | "mid" | "right")
    const columnMap = new Map();

    // === Your sameColumnLinks list ===
    const sameColumnLinks = [
      /active_wave\.php\?event=2(&.*)?$/, // regex: active_wave.php?event=2
      /^#/, // regex: anchors only
    ];

    const originalBody = document.body;
    const foundTopbar = originalBody.querySelector(".game-topbar");
    let topbarHTML = "";

    if (foundTopbar) {
      topbarHTML = foundTopbar.outerHTML;
      foundTopbar.remove();
    }

    function shouldStayHere(url) {
      return sameColumnLinks.some((pattern) => pattern.test(url));
    }

    // Save original body
    const originalBodyHTML = document.body.innerHTML;

    // Rebuild page
    document.body.innerHTML = `
      ${topbarHTML}
      <div id="container" class="three-col-layout">
        <div id="col-left" class="col col--left">
          <button class="reload-btn" data-col="left">⟳</button>
        </div>
        <div id="col-mid" class="col">
          <button class="reload-btn" data-col="mid">⟳</button>
          <iframe id="frame-mid" class="embed-frame"
            sandbox="allow-scripts allow-forms allow-same-origin"></iframe>
        </div>
        <div id="col-right" class="col">
          <button class="reload-btn" data-col="right">⟳</button>
          <iframe id="frame-right" class="embed-frame"
            sandbox="allow-scripts allow-forms allow-same-origin"></iframe>
        </div>
      </div>
    `;

    const colLeft = document.getElementById("col-left");
    const midFrame = document.getElementById("frame-mid");
    const rightFrame = document.getElementById("frame-right");

    colLeft.innerHTML = originalBodyHTML;

    const resolve = (href, base) => new URL(href, base).href;

    // Utility: remove .game-topbar if it exists
    function removeTopbar(doc) {
      try {
        doc.querySelectorAll(".game-topbar").forEach((tb) => tb.remove());
      } catch {}
    }

    // Generic loader
    function loadInColumn(col, url) {
      if (col === "left") {
        fetch(url)
          .then((r) => r.text())
          .then((html) => {
            const doc = new DOMParser().parseFromString(html, "text/html");
            colLeft.innerHTML = doc.body.innerHTML;
          });
      } else if (col === "mid") {
        midFrame.src = url;
      } else if (col === "right") {
        rightFrame.src = url;
      }
      columnMap.set(url, col); // remember placement
    }

    // --- LEFT clicks
    colLeft.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a) return;
      e.preventDefault();
      const url = resolve(a.getAttribute("href"), urls.left);

      if (columnMap.has(url)) {
        return loadInColumn(columnMap.get(url), url);
      }

      if (shouldStayHere(url)) {
        loadInColumn("left", url);
      } else {
        loadInColumn("mid", url);
      }
    });

    // --- MIDDLE frame load
    midFrame.addEventListener("load", () => {
      try {
        urls.mid = midFrame.contentWindow.location.href;
        removeTopbar(midFrame.contentDocument);
        columnMap.set(urls.mid, "mid");
      } catch {}
      let midDoc;
      try {
        midDoc = midFrame.contentDocument;
      } catch {
        return;
      }

      midDoc.addEventListener(
        "click",
        (e) => {
          const a = e.target.closest("a[href]");
          if (!a) return;
          e.preventDefault();
          const url = resolve(a.getAttribute("href"), urls.mid);

          if (columnMap.has(url)) {
            return loadInColumn(columnMap.get(url), url);
          }

          if (shouldStayHere(url)) {
            loadInColumn("mid", url);
          } else if (url === urls.left) {
            loadInColumn("left", url);
          } else {
            loadInColumn("right", url);
          }
        },
        { capture: true }
      );
    });

    // --- RIGHT frame load
    rightFrame.addEventListener("load", () => {
      try {
        urls.right = rightFrame.contentWindow.location.href;
        removeTopbar(rightFrame.contentDocument);
        columnMap.set(urls.right, "right");
      } catch {}
      let rightDoc;
      try {
        rightDoc = rightFrame.contentDocument;
      } catch {
        return;
      }

      rightDoc.addEventListener(
        "click",
        (e) => {
          const a = e.target.closest("a[href]");
          if (!a) return;
          e.preventDefault();
          const url = resolve(a.getAttribute("href"), urls.right);

          if (columnMap.has(url)) {
            return loadInColumn(columnMap.get(url), url);
          }

          if (shouldStayHere(url)) {
            loadInColumn("right", url);
          } else if (url === urls.mid) {
            loadInColumn("mid", url);
          } else if (url === urls.left) {
            loadInColumn("left", url);
          } else {
            loadInColumn("right", url);
          }
        },
        { capture: true }
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
