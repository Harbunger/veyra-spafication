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
      /pets\.php(&.*)?$/, // regex: pets.php
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
        <div id="col-left" class="col col--left"></div>
        <div id="col-mid" class="col">
          <iframe id="frame-mid" name="frame-mid" class="embed-frame"
            sandbox="allow-scripts allow-forms allow-same-origin"></iframe>
        </div>
        <div id="col-right" class="col">
          <iframe id="frame-right" name="frame-right" class="embed-frame"
            sandbox="allow-scripts allow-forms allow-same-origin"></iframe>
        </div>
      </div>
    `;

    const colLeft = document.getElementById("col-left");
    const midFrame = document.getElementById("frame-mid");
    const rightFrame = document.getElementById("frame-right");

    colLeft.innerHTML = originalBodyHTML;

    const resolve = (href, base) => new URL(href, base).href;

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

    // -----------------------------
    // Helpers for iframe scenarios
    // -----------------------------
    function setupCommonIframeBehaviors(doc, win, which) {
      // 1) Intercept <form> submissions
      //    - In MID: target right iframe (real GET/POST flows)
      //    - In RIGHT: keep in right
      doc.addEventListener(
        "submit",
        (e) => {
          const form = e.target;
          if (!form || !(form instanceof win.HTMLFormElement)) return;

          // don't fight deliberate targets; if author already targets a frame, respect it
          if (!form.target) {
            form.setAttribute(
              "target",
              which === "mid" ? "frame-right" : "frame-right"
            ); // mid->right, right->right
          }
          // Let the native submit proceed (no preventDefault) so cookies/POST work
        },
        true
      );

      // 2) Intercept window.open → route to the appropriate column
      try {
        const originalOpen = win.open;
        win.open = function (url, name, specs) {
          try {
            if (url) {
              const abs = resolve(String(url), win.location.href);
              if (which === "mid") {
                rightFrame.src = abs; // mid opens in right
                columnMap.set(abs, "right");
              } else {
                rightFrame.src = abs; // right stays in right
                columnMap.set(abs, "right");
              }
              return null;
            }
          } catch {}
          return originalOpen.apply(this, arguments);
        };
      } catch {}

      // 3) Click delegation for <a> continues to use your rules
      doc.addEventListener(
        "click",
        (e) => {
          const a = e.target.closest("a[href]");
          if (!a) return;
          e.preventDefault();

          const base =
            which === "mid"
              ? urls.mid || urls.left
              : urls.right || urls.mid || urls.left;
          const url = resolve(a.getAttribute("href"), base);

          if (columnMap.has(url)) {
            return loadInColumn(columnMap.get(url), url);
          }

          if (shouldStayHere(url)) {
            loadInColumn(which, url); // stay in current iframe
          } else if (which === "mid" && url === urls.left) {
            loadInColumn("left", url);
          } else if (which === "right" && url === urls.mid) {
            loadInColumn("mid", url);
          } else if (which === "right" && url === urls.left) {
            loadInColumn("left", url);
          } else {
            loadInColumn("right", url); // forward goes to right
          }
        },
        { capture: true }
      );
    }

    // ------------- Custom forwarders (programmatic nav) -------------
    // Map selectors to async handlers that return a URL to open in RIGHT.
    // Add more entries here as you discover similar patterns.
    const customForwarders = new Map([
      [
        "button#btnStartTop",
        async (btn, ctx) => {
          // ctx = { win, doc, base }
          // This replicates the site's fetch → redirect logic, but opens RIGHT.
          const seasonNotStarted = ctx.win.seasonNotStarted ?? false;
          if (seasonNotStarted) return null;

          const showState = ctx.win.showState ?? (() => {});
          const setStartEnabled = ctx.win.setStartEnabled ?? (() => {});
          const esc = ctx.win.esc ?? ((s) => String(s));

          btn.disabled = true;
          showState(
            '<span class="spinner" aria-hidden="true"></span> <span style="margin-left:6px">Matching…</span>'
          );

          try {
            const res = await ctx.win.fetch("/pvp_matchmake.php", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: "go=1",
              credentials: "same-origin",
            });
            const data = await res.json().catch(() => ({}));
            if (data.status === "success") {
              showState("Matched! Redirecting…");
              return new URL(data.redirect || "/pvp_battle.php", ctx.base).href;
            } else {
              showState(
                '<span style="color:#ff9a9a">Error:</span> ' +
                  esc(data.message || "Unknown error.")
              );
              btn.disabled = false;
              setStartEnabled();
              return null;
            }
          } catch (e) {
            showState('<span style="color:#ff9a9a">Network error.</span>');
            btn.disabled = false;
            setStartEnabled();
            return null;
          }
        },
      ],
      // Add more patterns like:
      // ["button.selector", async (el, ctx) => { ... return "https://..."; }]
    ]);

    function bindCustomForwarders(doc, win, which) {
      // Only meaningful in MID (forward into RIGHT). In RIGHT we keep in RIGHT.
      if (which !== "mid") return;

      const tryBind = () => {
        customForwarders.forEach((handler, selector) => {
          doc.querySelectorAll(selector).forEach((el) => {
            if (el.__veyraBound) return;
            el.__veyraBound = true;

            el.addEventListener(
              "click",
              async (e) => {
                // Beat the page's handler that would call location.href = ...
                e.preventDefault();
                e.stopImmediatePropagation();

                const base = urls.mid || urls.left;
                const targetURL = await handler(el, { win, doc, base });
                if (targetURL) {
                  rightFrame.src = targetURL; // open in RIGHT
                  columnMap.set(targetURL, "right");
                }
              },
              true
            );
          });
        });
      };

      // Initial pass + keep binding if the page re-renders
      tryBind();
      const mo = new MutationObserver(tryBind);
      mo.observe(doc.documentElement, { childList: true, subtree: true });
    }

    // --- MIDDLE frame load
    midFrame.addEventListener("load", () => {
      try {
        urls.mid = midFrame.contentWindow.location.href;
        columnMap.set(urls.mid, "mid");
      } catch {}

      let midDoc, midWin;
      try {
        midDoc = midFrame.contentDocument;
        midWin = midFrame.contentWindow;
      } catch {
        return;
      }

      // Common behaviors (forms → right, window.open → right, anchor routing)
      setupCommonIframeBehaviors(midDoc, midWin, "mid");

      // Custom "programmatic nav" forwarders (like #btnStartTop)
      bindCustomForwarders(midDoc, midWin, "mid");
    });

    // --- RIGHT frame load
    rightFrame.addEventListener("load", () => {
      try {
        urls.right = rightFrame.contentWindow.location.href;
        columnMap.set(urls.right, "right");
      } catch {}

      let rightDoc, rightWin;
      try {
        rightDoc = rightFrame.contentDocument;
        rightWin = rightFrame.contentWindow;
      } catch {
        return;
      }

      // In RIGHT: keep everything inside RIGHT (forms, window.open, anchors)
      setupCommonIframeBehaviors(rightDoc, rightWin, "right");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
