/**
 * 信笺 - 前端核心逻辑
 * Canvas 手写 · Socket.IO 实时同步 · 笔迹复现
 */

const state = {
  socket: null,
  user: null,
  isDrawing: false,
  strokes: [],
  currentStroke: [],
  lastPoint: null,
  isConnected: false
};

const $ = (id) => document.getElementById(id);

const els = {
  paper: $('paper'),
  ctx: null,
  stream: $('stream'),
  empty: $('emptyState'),
  hint: $('composeHint'),
  btnUndo: $('btnUndo'),
  btnClear: $('btnClear'),
  btnSend: $('btnSend'),
  modal: $('modal'),
  nameInput: $('nameInput'),
  btnJoin: $('btnJoin'),
  statusDot: $('statusDot'),
  statusText: $('statusText'),
  viewer: $('viewer'),
  viewerCanvas: null,
  viewerAuthor: $('viewerAuthor'),
  viewerProgress: $('viewerProgress'),
  viewerClose: $('viewerClose'),
  toast: $('toast')
};

const config = {
  inkColor: '#1a1a1a',
  inkWidth: 2.2,
  inkWidthMax: 3.6,
  pointsPerFrame: 2,
  replayDelay: 400
};

// ==================== 初始化 ====================
function init() {
  setupCanvas();
  bindEvents();
  initSocket();
}

function setupCanvas() {
  els.ctx = els.paper.getContext('2d');
  resizePaper();
  window.addEventListener('resize', resizePaper);
  applyInkStyle();
}

function resizePaper() {
  const rect = els.paper.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  els.paper.width = rect.width * dpr;
  els.paper.height = rect.height * dpr;
  els.paper.style.width = rect.width + 'px';
  els.paper.style.height = rect.height + 'px';
  els.ctx.setTransform(1, 0, 0, 1, 0, 0);
  els.ctx.scale(dpr, dpr);
  applyInkStyle();
  redrawStrokes();
}

function applyInkStyle() {
  els.ctx.lineCap = 'round';
  els.ctx.lineJoin = 'round';
  els.ctx.strokeStyle = config.inkColor;
}

function bindEvents() {
  const p = els.paper;
  p.addEventListener('mousedown', onDown);
  p.addEventListener('mousemove', onMove);
  p.addEventListener('mouseup', onUp);
  p.addEventListener('mouseleave', onUp);
  p.addEventListener('touchstart', onTouchDown, { passive: false });
  p.addEventListener('touchmove', onTouchMove, { passive: false });
  p.addEventListener('touchend', onUp);
  els.btnUndo.addEventListener('click', undo);
  els.btnClear.addEventListener('click', clear);
  els.btnSend.addEventListener('click', send);
  els.btnJoin.addEventListener('click', join);
  els.nameInput.addEventListener('keypress', e => { if (e.key === 'Enter') join(); });
  els.viewerClose.addEventListener('click', closeViewer);
  els.viewer.addEventListener('click', e => { if (e.target === els.viewer) closeViewer(); });
}

// ==================== 绘制 ====================
function point(e) {
  const r = els.paper.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top, t: Date.now() };
}

function onDown(e) { startStroke(point(e)); }
function onMove(e) { continueStroke(point(e)); }
function onUp() { endStroke(); }
function onTouchDown(e) { e.preventDefault(); startStroke(point(e.touches[0])); }
function onTouchMove(e) { e.preventDefault(); continueStroke(point(e.touches[0])); }

function startStroke(p) {
  state.isDrawing = true;
  state.lastPoint = p;
  state.currentStroke = [p];
  els.hint.classList.add('hidden');
  els.ctx.beginPath();
  els.ctx.moveTo(p.x, p.y);
  els.ctx.lineTo(p.x + 0.05, p.y + 0.05);
  els.ctx.lineWidth = config.inkWidth;
  els.ctx.stroke();
}

function continueStroke(p) {
  if (!state.isDrawing) return;
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
  if (!a) return config.inkWidth;
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const speed = Math.min(d / 8, 1);
  return Math.max(config.inkWidth * 0.6, config.inkWidthMax - (config.inkWidthMax - config.inkWidth) * speed);
}

function redrawStrokes() {
  els.ctx.clearRect(0, 0, els.paper.width, els.paper.height);
  if (state.strokes.length === 0) { els.hint.classList.remove('hidden'); return; }
  els.hint.classList.add('hidden');
  const r = els.paper.getBoundingClientRect();
  state.strokes.forEach(s => drawStrokeOn(els.ctx, s, 1, 0, 0, config.inkWidth));
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
  ctx.lineWidth = width || config.inkWidth;
  ctx.stroke();
}

function undo() { if (state.strokes.length) { state.strokes.pop(); redrawStrokes(); } }
function clear() { state.strokes = []; redrawStrokes(); }

// ==================== 发送 ====================
function send() {
  if (state.strokes.length === 0) { toast('纸上空空'); return; }
  if (!state.isConnected) { toast('尚未落座'); return; }
  const rect = els.paper.getBoundingClientRect();
  const note = {
    id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    strokes: JSON.parse(JSON.stringify(state.strokes)),
    width: rect.width,
    height: rect.height,
    ts: Date.now()
  };
  state.socket.emit('send-note', note);
  renderNote({ ...note, userId: state.user.id, userName: state.user.name, mine: true, delivered: false });
  clear();
}

// ==================== 渲染纸条 ====================
function renderNote(note) {
  els.empty.style.display = 'none';
  const node = document.createElement('article');
  node.className = 'note ' + (note.mine ? 'note--sent' : 'note--received');
  node.dataset.id = note.id;
  const initial = (note.userName || '·').slice(0, 1);
  const time = formatTime(note.ts);
  node.innerHTML = `
    <div class="avatar">${escapeHtml(initial)}</div>
    <div class="note-body">
      <div class="note-meta">
        <span class="note-author">${escapeHtml(note.userName || '匿名')}</span>
        <span class="note-time">${time}</span>
        ${note.mine ? `<span class="note-delivery ${note.delivered ? 'delivered' : ''}">${note.delivered ? '已抵达' : '寄出中'}</span>` : ''}
      </div>
      <div class="paper-card">
        <canvas class="paper-canvas" data-id="${note.id}"></canvas>
        <div class="paper-hint">轻触，重温落笔</div>
      </div>
    </div>
  `;
  els.stream.appendChild(node);
  const cnv = node.querySelector('canvas');
  fitCanvas(cnv);
  const ctx = cnv.getContext('2d');
  applyCtx(ctx);
  drawNoteStatic(ctx, note, cnv.width, cnv.height);
  node.querySelector('.paper-card').addEventListener('click', () => openViewer(note));
  setTimeout(() => node.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);
}

function drawNoteStatic(ctx, note, cw, ch) {
  if (!note.strokes || !note.strokes.length) return;
  let maxX = 0, maxY = 0;
  note.strokes.forEach(s => s.forEach(p => { if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y; }));
  const scale = Math.min(cw / (note.width || maxX + 20), ch / (note.height || maxY + 20), 1) * 0.95;
  const ox = (cw - (note.width || 0) * scale) / 2;
  const oy = (ch - (note.height || 0) * scale) / 2;
  note.strokes.forEach(s => drawStrokeOn(ctx, s, scale, ox, oy, config.inkWidth * 0.95));
}

function fitCanvas(canvas) {
  const r = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = r.width * dpr;
  canvas.height = r.height * dpr;
}

function applyCtx(ctx) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = config.inkColor;
}

// ==================== 复现动画 ====================
function openViewer(note) {
  els.viewer.classList.add('active');
  els.viewerAuthor.textContent = '—— ' + (note.userName || '匿名');
  els.viewerProgress.textContent = '正在落笔…';
  const dpr = window.devicePixelRatio || 1;
  const rect = els.viewer.getBoundingClientRect();
  const w = Math.min(640, rect.width - 64);
  const h = Math.min(w * 0.6, 400);
  els.viewerCanvas = $('viewerCanvas');
  els.viewerCanvas.width = w * dpr;
  els.viewerCanvas.height = h * dpr;
  els.viewerCanvas.style.width = w + 'px';
  els.viewerCanvas.style.height = h + 'px';
  const ctx = els.viewerCanvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  applyCtx(ctx);
  setTimeout(() => replayStrokes(note, ctx, w, h), config.replayDelay);
}

function replayStrokes(note, ctx, w, h) {
  if (!note.strokes || !note.strokes.length) { els.viewerProgress.textContent = '空白纸笺'; return; }
  let maxX = 0, maxY = 0;
  note.strokes.forEach(s => s.forEach(p => { if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y; }));
  const scale = Math.min(w / (note.width || maxX + 20), h / (note.height || maxY + 20), 1) * 0.92;
  const ox = (w - (note.width || 0) * scale) / 2;
  const oy = (h - (note.height || 0) * scale) / 2;
  ctx.clearRect(0, 0, w, h);
  const total = note.strokes.reduce((n, s) => n + s.length, 0);
  let drawn = 0, si = 0, pi = 0;
  els.viewerProgress.textContent = '提笔…';
  function tick() {
    if (si >= note.strokes.length) { els.viewerProgress.textContent = '墨迹已干'; return; }
    const stroke = note.strokes[si];
    for (let i = 0; i < config.pointsPerFrame && pi < stroke.length; i++) {
      const p = stroke[pi];
      const prev = pi > 0 ? stroke[pi - 1] : p;
      if (pi === 0) {
        ctx.beginPath();
        ctx.moveTo(p.x * scale + ox, p.y * scale + oy);
        ctx.lineTo(p.x * scale + ox + 0.05, p.y * scale + oy + 0.05);
        ctx.lineWidth = config.inkWidth;
        ctx.stroke();
      } else {
        const mx = (prev.x + p.x) / 2 * scale + ox;
        const my = (prev.y + p.y) / 2 * scale + oy;
        ctx.beginPath();
        ctx.moveTo(prev.x * scale + ox, prev.y * scale + oy);
        ctx.quadraticCurveTo(prev.x * scale + ox, prev.y * scale + oy, mx, my);
        ctx.lineWidth = config.inkWidth;
        ctx.stroke();
      }
      pi++;
      drawn++;
    }
    const pct = Math.round((drawn / total) * 100);
    els.viewerProgress.textContent = '落笔 ' + pct + '%';
    if (pi >= stroke.length) { si++; pi = 0; }
    requestAnimationFrame(tick);
  }
  tick();
}

function closeViewer() { els.viewer.classList.remove('active'); }

// ==================== Socket ====================
function initSocket() {
  const url = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://localhost:3000' : location.origin;
  state.socket = io(url, { transports: ['websocket', 'polling'] });
  state.socket.on('connect', () => { state.isConnected = true; setStatus('connected', '在线'); });
  state.socket.on('disconnect', () => { state.isConnected = false; setStatus('', '失联'); });
  state.socket.on('reconnect', () => setStatus('connected', '在线'));
  state.socket.on('welcome', d => {
    state.user = d.user;
    els.modal.classList.add('hidden');
    if (d.history && d.history.length) {
      d.history.forEach(n => renderNote({ ...n, mine: n.userId === state.user.id }));
    }
  });
  state.socket.on('new-note', n => renderNote({ ...n, mine: false }));
  state.socket.on('note-sent', n => {
    const card = document.querySelector('[data-id="' + n.id + '"]');
    if (card) {
      const tag = card.querySelector('.note-delivery');
      if (tag) { tag.classList.add('delivered'); tag.textContent = '已抵达'; }
    }
  });
}

function setStatus(cls, text) {
  els.statusDot.className = 'meta-dot ' + cls;
  els.statusText.textContent = text;
}

function join() {
  const name = (els.nameInput.value || '').trim() || autoName();
  state.socket.emit('join', { name });
}

function autoName() {
  const a = ['听风', '看云', '执笔', '拾光', '折柳', '寻梅', '踏雪', '问月'];
  const b = ['人', '客', '生', '者', '归', '来'];
  return a[Math.floor(Math.random() * a.length)] + b[Math.floor(Math.random() * b.length)];
}

// ==================== 工具 ====================
function formatTime(ts) {
  const d = new Date(ts);
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.classList.remove('show'), 1800);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

document.addEventListener('DOMContentLoaded', init);