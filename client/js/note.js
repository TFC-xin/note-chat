/**
 * note.js - 纸条渲染
 * 折纸态 + 展开 + 笔迹复现动画
 */

const Note = (() => {
  let els = {};
  let settings = { inkColor: "#1a1a1a", paperColor: "#faf7f0" };

  function init() {
    els = {
      stream: document.getElementById("stream"),
      empty: document.getElementById("emptyState")
    };
  }

  function setSettings(s) { settings = Object.assign(settings, s); }

  // 渲染纸条
  function render(note) {
    if (els.empty) els.empty.style.display = "none";
    const isRead = Storage.isRead(note.id);
    const isMine = note.mine;
    const article = document.createElement("article");
    article.className = "note " + (isMine ? "note--sent" : "note--received") + (isRead ? " is-read" : "");
    article.dataset.id = note.id;

    const initial = (note.userName || "·").slice(0, 1);
    const time = formatTime(note.ts);
    const isK = Kaomoji.isKaomoji(note.text || "");

    // 折纸态
    const fold = document.createElement("div");
    fold.className = "fold";
    fold.innerHTML = `
      <div class="avatar">${escapeHtml(initial)}</div>
      <div class="fold-content">
        <div class="fold-title">
          <strong>${escapeHtml(note.userName || "匿名")}</strong> 向你<em>扔了一个小纸条</em>
        </div>
        <div class="fold-time">${time}${isK ? " · 颜文字" : ""}</div>
      </div>
      ${isRead ? "" : `<div class="fold-unread"></div>`}
    `;

    // 展开态
    const unfold = document.createElement("div");
    unfold.className = "unfold";
    if (isK) {
      // 颜文字：直接显示动画，不展开
      unfold.innerHTML = `
        <div class="unfold-inner">
          <div class="kaomoji-stage">
            <span class="face">${escapeHtml((note.text || "").trim())}</span>
          </div>
          <div class="unfold-foot">
            <span>${time}</span>
            <span class="unfold-status">已展开</span>
          </div>
        </div>
      `;
    } else {
      unfold.innerHTML = `
        <div class="unfold-inner">
          <canvas class="paper-canvas" data-note-id="${note.id}"></canvas>
          <div class="unfold-foot">
            <span>${time}</span>
            <span class="unfold-status">·</span>
          </div>
        </div>
      `;
    }

    article.appendChild(fold);
    article.appendChild(unfold);
    els.stream.appendChild(article);

    // 点击折纸 -> 展开
    fold.addEventListener("click", () => open(article, fold, unfold, note, isK));

    // 已读：直接显示展开
    if (isRead) {
      fold.style.display = "none";
      unfold.classList.add("open");
      requestAnimationFrame(() => {
        if (isK) {
          // 颜文字：直接显示
        } else {
          const cnv = unfold.querySelector("canvas");
          if (cnv) {
            fitCanvas(cnv);
            drawNoteStatic(cnv.getContext("2d"), note, cnv.width, cnv.height);
          }
        }
      });
    }

    setTimeout(() => article.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
  }

  // 展开
  function open(article, fold, unfold, note, isK) {
    if (fold.classList.contains("fading") || Storage.isRead(note.id)) {
      // 已读：仅滚动
      return;
    }

    fold.classList.add("fading");
    setTimeout(() => {
      fold.style.display = "none";
      unfold.classList.add("open");

      Storage.markRead(note.id);
      article.classList.add("is-read");

      if (isK) {
        // 颜文字：动画
        const face = unfold.querySelector(".face");
        if (face) {
          animateKaomoji(face);
        }
      } else {
        const cnv = unfold.querySelector("canvas");
        if (!cnv) return;
        fitCanvas(cnv);
        const ctx = cnv.getContext("2d");
        const dpr = window.devicePixelRatio || 1;
        const rect = cnv.getBoundingClientRect();
        ctx.scale(dpr, dpr);
        applyInkStyle(ctx);

        setTimeout(() => replayStrokes(note, ctx, rect.width, rect.height, unfold), 400);
      }
    }, 400);
  }

  // 颜文字动画
  function animateKaomoji(face) {
    let frame = 0;
    const total = 60;
    function tick() {
      const t = frame / total;
      const scale = 0.7 + 0.6 * Math.sin(t * Math.PI);
      const rotate = Math.sin(t * Math.PI * 2) * 12;
      face.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
      frame++;
      if (frame <= total) requestAnimationFrame(tick);
      else face.style.transform = "";
    }
    tick();
  }

  // 笔迹复现
  function replayStrokes(note, ctx, w, h, unfold) {
    if (!note.strokes || !note.strokes.length) return;
    let maxX = 0, maxY = 0;
    note.strokes.forEach(s => s.forEach(p => { if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y; }));
    const scale = Math.min(w / (note.width || maxX + 20), h / (note.height || maxY + 20), 1) * 0.92;
    const ox = (w - (note.width || 0) * scale) / 2;
    const oy = (h - (note.height || 0) * scale) / 2;
    ctx.clearRect(0, 0, w, h);

    const total = note.strokes.reduce((n, s) => n + s.length, 0);
    let drawn = 0, si = 0, pi = 0;
    const status = unfold.querySelector(".unfold-status");
    if (status) { status.textContent = "正在落笔…"; status.classList.add("writing"); }

    function tick() {
      if (si >= note.strokes.length) {
        if (status) { status.textContent = "墨迹已干"; status.classList.remove("writing"); }
        return;
      }
      const stroke = note.strokes[si];
      for (let i = 0; i < 2 && pi < stroke.length; i++) {
        const p = stroke[pi];
        const prev = pi > 0 ? stroke[pi - 1] : p;
        if (pi === 0) {
          ctx.beginPath();
          ctx.moveTo(p.x * scale + ox, p.y * scale + oy);
          ctx.lineTo(p.x * scale + ox + 0.05, p.y * scale + oy + 0.05);
          ctx.lineWidth = window.noteConfig?.inkWidth || 2.2;
          ctx.stroke();
        } else {
          const mx = (prev.x + p.x) / 2 * scale + ox;
          const my = (prev.y + p.y) / 2 * scale + oy;
          ctx.beginPath();
          ctx.moveTo(prev.x * scale + ox, prev.y * scale + oy);
          ctx.quadraticCurveTo(prev.x * scale + ox, prev.y * scale + oy, mx, my);
          ctx.lineWidth = window.noteConfig?.inkWidth || 2.2;
          ctx.stroke();
        }
        pi++;
        drawn++;
      }
      if (pi >= stroke.length) { si++; pi = 0; }
      requestAnimationFrame(tick);
    }
    tick();
  }

  function drawNoteStatic(ctx, note, cw, ch) {
    if (!note.strokes || !note.strokes.length) return;
    let maxX = 0, maxY = 0;
    note.strokes.forEach(s => s.forEach(p => { if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y; }));
    const scale = Math.min(cw / (note.width || maxX + 20), ch / (note.height || maxY + 20), 1) * 0.92;
    const ox = (cw - (note.width || 0) * scale) / 2;
    const oy = (ch - (note.height || 0) * scale) / 2;
    note.strokes.forEach(s => drawStrokeOn(ctx, s, scale, ox, oy, window.noteConfig?.inkWidth || 2.2));
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
    ctx.lineWidth = width || 2.2;
    ctx.stroke();
  }

  function fitCanvas(canvas) {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
  }

  function applyInkStyle(ctx) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = settings.inkColor;
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"'']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "''": "&#39;" })[c]);
  }

  // 清空所有（切换房间时）
  function clearAll() {
    if (els.stream) {
      Array.from(els.stream.querySelectorAll(".note")).forEach(n => n.remove());
    }
  }

  return { init, setSettings, render, clearAll, escapeHtml, formatTime };
})();