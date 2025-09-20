(function () {
  const refillAmt = 20;

  const tEl = document.getElementById("stamina_timer");
  const sEl = document.getElementById("stamina_span");

  // ✅ Extract maxStam from sibling text "20 / 200"
  const maxStamEl = document.querySelector("#stamina_span");
  let maxStam = 200;
  if (maxStamEl) {
    const container = maxStamEl.closest(".gtb-value");
    if (container) {
      const text = container.textContent;
      const match = text.match(/\/\s*(\d+)/);
      if (match) {
        maxStam = parseInt(match[1], 10);
      }
    }
  }

  // ✅ Refill resets every 30 minutes
  const now = new Date();
  const mins = now.getMinutes();
  const secsNow = now.getSeconds();
  let secs =
    mins < 30
      ? (30 - mins - 1) * 60 + (60 - secsNow)
      : (60 - mins - 1) * 60 + (60 - secsNow);

  function fmt(n) {
    return n.toLocaleString();
  }

  function mmss(total) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function tick() {
    if (tEl) tEl.textContent = "⏳ " + mmss(secs);

    if (secs <= 0) {
      const current =
        parseInt((sEl?.textContent || "0").replace(/[^0-9]/g, ""), 10) || 0;
      const next = Math.min(maxStam, current + refillAmt);
      if (next !== current && sEl) {
        sEl.textContent = fmt(next);
      }

      // Recalculate seconds to next 30min refill
      const now = new Date();
      const mins = now.getMinutes();
      const secsNow = now.getSeconds();
      secs =
        mins < 30
          ? (30 - mins - 1) * 60 + (60 - secsNow)
          : (60 - mins - 1) * 60 + (60 - secsNow);
    }

    secs--;
  }

  const el = document.getElementById("server_time");
  if (!el) return;

  let epoch =
    parseInt(el.getAttribute("data-epoch"), 10) ||
    Math.floor(Date.now() / 1000);
  const offS = parseInt(el.getAttribute("data-tzoff"), 10) || 0; // server offset (seconds from UTC)

  function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function render() {
    const d = new Date((epoch + offS) * 1000);
    let h = d.getUTCHours();
    const m = d.getUTCMinutes();
    const s = d.getUTCSeconds();
    const am = h < 12;
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    el.textContent =
      h12 + ":" + pad2(m) + ":" + pad2(s) + " " + (am ? "AM" : "PM");
    epoch++;
  }

  tick();
  setInterval(tick, 1000);
  render();
  setInterval(render, 1000);
})();
