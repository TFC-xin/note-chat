/**
 * app.js - 主入口
 * 串联所有模块，处理用户交互
 */

const state = {
  user: null,
  isDrawing: false,
  strokes: [],
  currentStroke: [],
  lastPoint: null,
  settings: null
};

const $ = (id) => document.getElementById(id);
const els = {
  paper: null, ctx: null,
  hint: null,
  btnUndo: null, btnClear: null, btnSend: null,
  btnJoin: null, nameInput: null, modal: null,
  onlinePanel: null, roomPanel: null,
  btnOnline: null, btnRoom: null,
  onlineCount: null, roomLabel: null,
  loadingBar: null, loadingFill: null, loadingText: null
};

// ==================== 初始化 ====================
function init() {
  state.settings = Storage.getSettings();
  applySettings(state.settings);
  Note.setSettings(state.settings);

  bindElements();
  bindEvents();
  initSettingsPanel();
  initRoomPanel();
  initOnlinePanel();
  showModal();
  showLoading("正在加载...", 0);
}

function bindElements() {
  els.paper = $("paper");
  els.ctx = els.paper.getContext("2d");
  els.hint = $("composeHint");
  els.btnUndo = $("btnUndo");
  els.btnClear = $("btnClear");
  els.btnSend = $("btnSend");
  els.btnJoin = $("btnJoin");
  els.nameInput = $("nameInput");
  els.modal = $("modal");
  els.onlinePanel = $("onlinePanel");
  els.roomPanel = $("roomPanel");
  els.btnOnline = $("btnOnline");
  els.btnRoom = $("btnRoom");
  els.onlineCount = $("onlineCount");
  els.roomLabel = $("roomLabel");
  els.loadingBar = $("loadingBar");
  els.loadingFill = $("loadingFill");
  els.loadingText = $("loadingText");

  Note.init();
  resizePaper();
  applyInkStyle();
  window.addEventListener("resize", resizePaper);
}

function bindEvents() {
  const p = els.paper;
  p.addEventListener("mousedown", e => startStroke(point(e)));
  p.addEventListener("mousemove", e => { if (state.isDrawing) continueStroke(point(e)); });
  p.addEventListener("mouseup", endStroke);
  p.addEventListener("mouseleave", endStroke);
  p.addEventListener("touchstart", e => { e.preventDefault(); if (e.touches[0]) startStroke(point(e.touches[0])); }, { passive: false });
  p.addEventListener("touchmove", e => { e.preventDefault(); if (state.isDrawing && e.touches[0]) continueStroke(point(e.touches[0])); }, { passive: false });
  p.addEventListener("touchend", endStroke);

  els.btnUndo.addEventListener("click", undo);
  els.btnClear.addEventListener("click", clear);
  els.btnSend.addEventListener("click", send);
  els.btnJoin.addEventListener("click", join);
  els.nameInput.addEventListener("keypress", e => { if (e.key === "Enter") join(); });
}

// ==================== 画布 ====================
function resizePaper() {
  const r = els.paper.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  els.paper.width = r.width * dpr;
  els.paper.height = r.height * dpr;
  els.paper.style.width = r.width + "px";
  els.paper.style.height = r.height + "px";
  els.ctx.setTransform(1, 0, 0, 1, 0, 0);
  els.ctx.scale(dpr, dpr);
  applyInkStyle();
  redrawStrokes();
}

function applyInkStyle() {
  els.ctx.lineCap = "round";
  els.ctx.lineJoin = "round";
  els.ctx.strokeStyle = state.settings.inkColor;
  window.noteConfig = { inkWidth: state.settings.inkWidth };
}

function point(e) {
  const r = els.paper.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top, t: Date.now() };
}

function startStroke(p) {
  state.isDrawing = true;
  state.lastPoint = p;
  state.currentStroke = [p];
  els.hint.classList.add("hidden");
  els.ctx.beginPath();
  els.ctx.moveTo(p.x, p.y);
  els.ctx.lineTo(p.x + 0.05, p.y + 0.05);
  els.ctx.lineWidth = state.settings.inkWidth;
  els.ctx.stroke();
}

function continueStroke(p) {
  els.ctx.lineWidth = inkWidth(state.lastPoint, p);
  els.ctx.beginPath();
  els.ctx.moveTo(state.lastPoint.x, state.lastPoint.y);
  const mx = (state.lastPoint.x + p.x) / 2;
  const my = (state.lastPoint.y + p.y) / 2;
  els.ctx.quadraticCurveTo(state.lastPoint.x, state.lastPoint.y, mx, my);
  els.ctx.stroke();
  state.currentStroke.push(p);
  state.lastPoint = p;
}

function endStroke() {
  if (!state.isDrawing) return;
  state.isDrawing = false;
  if (state.currentStroke.length > 1) state.strokes.push(state.currentStroke);
  state.currentStroke = [];
  state.lastPoint = null;
}

function inkWidth(a, b) {
  if (!a) return state.settings.inkWidth;
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const speed = Math.min(d / 8, 1);
  const max = state.settings.inkWidth * 1.6;
  return Math.max(state.settings.inkWidth * 0.6, max - (max - state.settings.inkWidth) * speed);
}

function redrawStrokes() {
  els.ctx.clearRect(0, 0, els.paper.width, els.paper.height);
  if (state.strokes.length === 0) { els.hint.classList.remove("hidden"); return; }
  els.hint.classList.add("hidden");
  state.strokes.forEach(s => drawStrokeOn(els.ctx, s, 1, 0, 0, state.settings.inkWidth));
}

function drawStrokeOn(ctx, stroke, scale, ox, oy, width) {
  if (!stroke || stroke.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(stroke[0].x * scale + ox, stroke[0].y * scale + oy);
  for (let i = 1; i < stroke.length; i++) {
    const a = stroke[i - 1], b = stroke[i];
    const mx = (a.x + b.x) / 2 * scale + ox;
    const my = (a.y + b.y) / 2 * scale + oy;
    ctx.quadraticCurveTo(a.x * scale + ox, a.y * scale + oy, mx, my);
  }
  ctx.lineWidth = width || state.settings.inkWidth;
  ctx.stroke();
}

function undo() { if (state.strokes.length) { state.strokes.pop(); redrawStrokes(); } }
function clear() { state.strokes = []; redrawStrokes(); }

// ==================== 发送 ====================
function send() {
  if (state.strokes.length === 0) { toast("纸上空空"); return; }
  if (!Chat.isOnline()) { toast("尚未落座"); return; }
  const r = els.paper.getBoundingClientRect();
  const note = {
    id: "n_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    strokes: JSON.parse(JSON.stringify(state.strokes)),
    width: r.width,
    height: r.height,
    ts: Date.now(),
    userId: state.user.id,
    userName: state.user.name,
    mine: true
  };
  Chat.sendNote(note);
  Note.render(note);
  clear();
}

// ==================== 弹窗 / 加入 ====================
function showModal() { els.modal.classList.remove("hidden"); }
function hideModal() { els.modal.classList.add("hidden"); }

function autoName() {
  const a = ["听风", "看云", "执笔", "拾光", "折柳", "寻梅", "踏雪", "问月"];
  const b = ["人", "客", "生", "者", "归", "来"];
  return a[Math.floor(Math.random() * a.length)] + b[Math.floor(Math.random() * b.length)];
}

function join() {
  const name = (els.nameInput.value || "").trim() || autoName();
  state.user = { id: "u_" + Math.random().toString(36).slice(2, 8), name, color: pickColor() };
  hideModal();
  setupChat();
}

function pickColor() {
  const colors = ["#1a1a1a", "#3a3530", "#8b3a3a", "#5a6a5a", "#6b5a4a"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function setupChat() {
  Chat.init(state.user);
  Chat.on("connect", () => setStatus("connected", "在线"));
  Chat.on("disconnect", () => setStatus("", "失联"));

  Chat.on("welcome", data => {
    if (data.history && data.history.length) {
      data.history.forEach(n => {
        n.mine = n.userId === state.user.id;
        Note.render(n);
      });
    }
    updateOnline(data.users);
    if (data.users && data.users.length === 1) {
      // 首次进入，无需持久化加载
      hideLoading();
    }
  });

  Chat.on("online-update", users => {
    updateOnline(users);
    refreshRoomPanel();
  });

  Chat.on("new-note", note => {
    note.mine = note.userId === state.user.id;
    Note.render(note);
    // 私聊持久化
    if (note.room && note.room !== "lobby") {
      Storage.saveNote(note);
    }
  });

  Chat.on("note-sent", data => {
    const card = document.querySelector(`[data-id="${data.id}"]`);
    if (card) {
      const status = card.querySelector(".note-status");
      if (status) status.innerHTML = `<span class="status-icon sent"></span>已传出`;
    }
  });

  Chat.on("note-read", data => {
    const card = document.querySelector(`[data-id="${data.id}"]`);
    if (card) {
      const status = card.querySelector(".note-status");
      if (status) status.innerHTML = `<span class="status-icon read"></span>已读`;
    }
  });

  Chat.on("note-failed", data => {
    const card = document.querySelector(`[data-id="${data.id}"]`);
    if (card) {
      const status = card.querySelector(".note-status");
      if (status) status.innerHTML = `<span class="status-icon failed"></span>失败`;
    }
  });

  Chat.on("room-switched", data => {
    if (data.room === "lobby") {
      els.roomLabel.textContent = "大厅";
    } else {
      const peer = Chat.getAll().find(u => u.id === data.peerId);
      els.roomLabel.textContent = peer ? peer.name : "私聊";
    }
    if (data.history && data.history.length) {
      data.history.forEach(n => Note.render(n));
    }
  });
}

function setStatus(cls, text) {
  const dot = $("statusDot");
  if (dot) dot.className = "meta-dot " + cls;
  // 顶栏的 meta 没有 text 元素，只更新 dot
}

function updateOnline(users) {
  els.onlineCount.textContent = users ? users.length : 0;
}

// ==================== 在线面板 ====================
function initOnlinePanel() {
  els.btnOnline.addEventListener("click", () => {
    renderOnlineList();
    els.onlinePanel.classList.add("open");
    ensurePanelOverlay().classList.add("show");
  });
  $("onlineClose").addEventListener("click", () => {
    els.onlinePanel.classList.remove("open");
    ensurePanelOverlay().classList.remove("show");
  });
}

function renderOnlineList() {
  const list = $("onlineList");
  list.innerHTML = "";
  const users = Chat.getAll();
  users.forEach(u => {
    const isMe = u.id === state.user.id;
    const item = document.createElement("div");
    item.className = "user-item" + (isMe ? " is-me" : "");
    const initial = (u.name || "·").slice(0, 1);
    item.innerHTML = `
      <div class="avatar">${Note.escapeHtml(initial)}</div>
      <span class="user-name">${Note.escapeHtml(u.name || "匿名")}${isMe ? " (你)" : ""}</span>
      ${isMe ? "" : `<button class="user-action" data-id="${u.id}">私聊</button>`}
    `;
    list.appendChild(item);
  });
  // 绑定私聊按钮
  list.querySelectorAll(".user-action").forEach(btn => {
    btn.addEventListener("click", e => {
      const id = e.target.dataset.id;
      switchToPrivate(id);
      els.onlinePanel.classList.remove("open");
      ensurePanelOverlay().classList.remove("show");
    });
  });
}

// ==================== 房间面板 ====================
function initRoomPanel() {
  els.btnRoom.addEventListener("click", () => {
    refreshRoomPanel();
    els.roomPanel.classList.add("open");
    ensurePanelOverlay().classList.add("show");
  });
  $("roomClose").addEventListener("click", () => {
    els.roomPanel.classList.remove("open");
    ensurePanelOverlay().classList.remove("show");
  });
  // 大厅按钮
  els.roomPanel.querySelectorAll(".room-item").forEach(btn => {
    btn.addEventListener("click", e => {
      const room = btn.dataset.room;
      if (room === "lobby") {
        Chat.switchRoom("lobby");
        els.roomLabel.textContent = "大厅";
        els.roomPanel.classList.remove("open");
        ensurePanelOverlay().classList.remove("show");
      }
    });
  });
}

function refreshRoomPanel() {
  // 高亮当前房间
  els.roomPanel.querySelectorAll(".room-item").forEach(btn => {
    const room = btn.dataset.room;
    btn.classList.toggle("active", room === Chat.getRoom());
  });
  // 私聊列表
  const privates = $("roomPrivateList");
  privates.innerHTML = "";
  Chat.getOnline().forEach(u => {
    const initial = (u.name || "·").slice(0, 1);
    const roomId = "private:" + u.id;
    const btn = document.createElement("button");
    btn.className = "room-item" + (Chat.getRoom() === roomId ? " active" : "");
    btn.innerHTML = `
      <span class="room-name">${Note.escapeHtml(initial)} ${Note.escapeHtml(u.name)}</span>
      <span class="room-meta">私聊</span>
    `;
    btn.addEventListener("click", () => {
      switchToPrivate(u.id);
      els.roomPanel.classList.remove("open");
      ensurePanelOverlay().classList.remove("show");
    });
    privates.appendChild(btn);
  });
}

function switchToPrivate(userId) {
  const room = "private:" + userId;
  Chat.switchRoom(room);
  const peer = Chat.getAll().find(u => u.id === userId);
  els.roomLabel.textContent = peer ? peer.name : "私聊";
  // 私聊：从本地加载历史
  loadPrivateHistory(userId);
}

async function loadPrivateHistory(userId) {
  showLoading("正在加载历史...", 0);
  const all = await Storage.loadAll();
  const filtered = all.filter(n => n.room === "private:" + userId);
  let i = 0;
  for (const n of filtered) {
    n.mine = n.userId === state.user.id;
    Note.render(n);
    updateLoading(++i, filtered.length);
  }
  setTimeout(() => hideLoading(), 300);
}

// ==================== 加载条 ====================
function showLoading(text, pct) {
  els.loadingBar.classList.add("show");
  if (els.loadingText) {
    els.loadingText.textContent = text;
    els.loadingText.style.display = "block";
  }
  updateLoading(pct, 100);
}
function updateLoading(pct, total) {
  if (els.loadingFill) els.loadingFill.style.width = ((pct / total) * 100) + "%";
  if (els.loadingText && total > 0) {
    els.loadingText.textContent = "正在加载历史 " + pct + " / " + total;
  }
}
function hideLoading() {
  els.loadingBar.classList.remove("show");
  if (els.loadingText) els.loadingText.style.display = "none";
  if (els.loadingFill) els.loadingFill.style.width = "100%";
}

// ==================== 面板遮罩 ====================
function ensurePanelOverlay() {
  let el = document.querySelector(".panel-overlay");
  if (el) return el;
  el = document.createElement("div");
  el.className = "panel-overlay";
  document.body.appendChild(el);
  return el;
}

// ==================== 设置 ====================
function initSettingsPanel() {
  SettingsPanel.init(applySettings);
}

function applySettings(s) {
  state.settings = Object.assign(state.settings || {}, s);
  document.documentElement.style.setProperty("--ink", s.inkColor);
  document.documentElement.style.setProperty("--paper", s.paperColor);
  document.documentElement.style.setProperty("--bg", s.bgColor);
  if (els.ctx) applyInkStyle();
  if (state.strokes.length) redrawStrokes();
}

// ==================== 工具 ====================
function toast(msg) {
  const el = $("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 1800);
}

document.addEventListener("DOMContentLoaded", init);