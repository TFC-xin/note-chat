/**
 * settings.js - 设置面板
 * 自定义墨色/纸色/背景色/笔粗
 */

const SettingsPanel = (() => {
  let panelEl, overlayEl;
  let onChange = null;

  function init(callback) {
    onChange = callback;
    panelEl = document.getElementById("settingsPanel");
    overlayEl = ensureOverlay();

    document.getElementById("btnSettings").addEventListener("click", open);
    document.getElementById("settingsClose").addEventListener("click", close);
    overlayEl.addEventListener("click", () => { close(); });

    const s = Storage.getSettings();
    applyToUI(s);

    document.getElementById("inkColor").addEventListener("input", e => update("inkColor", e.target.value));
    document.getElementById("paperColor").addEventListener("input", e => update("paperColor", e.target.value));
    document.getElementById("bgColor").addEventListener("input", e => update("bgColor", e.target.value));
    document.getElementById("inkWidth").addEventListener("input", e => update("inkWidth", parseFloat(e.target.value)));

    document.getElementById("settingsReset").addEventListener("click", () => {
      const s = Storage.resetSettings();
      applyToUI(s);
      onChange?.(s);
    });
  }

  function applyToUI(s) {
    document.getElementById("inkColor").value = s.inkColor;
    document.getElementById("paperColor").value = s.paperColor;
    document.getElementById("bgColor").value = s.bgColor;
    document.getElementById("inkWidth").value = s.inkWidth;
  }

  function update(key, value) {
    const s = Storage.getSettings();
    s[key] = value;
    Storage.saveSettings(s);
    onChange?.(s);
  }

  function open() {
    panelEl.classList.add("open");
    overlayEl.classList.add("show");
  }

  function close() {
    panelEl.classList.remove("open");
    overlayEl.classList.remove("show");
  }

  function ensureOverlay() {
    let el = document.querySelector(".panel-overlay");
    if (el) return el;
    el = document.createElement("div");
    el.className = "panel-overlay";
    document.body.appendChild(el);
    return el;
  }

  function getOverlay() { return overlayEl; }

  return { init, open, close, getOverlay };
})();