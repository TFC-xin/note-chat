/**
 * kaomoji.js - 颜文字动画
 * 识别常见颜文字并用 Canvas 画出来
 * 简单版本：放大/缩小/旋转动画
 */

const Kaomoji = (() => {

  // 颜文字词库
  const KAOMOJI_LIST = [
    "(^o^)", "(^_^)", "(*^_^*)", "(´･ω･`)",
    "(╥﹏╥)", "(>_<)", "(>.<)", "(T_T)",
    "¯\\_(ツ)_/¯", "(¬_¬)", "(=_=)", "o_O",
    "(:3", "(*^^*)", "(o´∀`o)", "Σ(°△°|||)",
    "(´;ω;`)", "(◕‿◕)", "(●´∀`●)", "(✿◠‿◠)"
  ];

  function isKaomoji(text) {
    if (!text) return null;
    const t = text.trim();
    // 必须是颜文字：长度 3-15、以括号或表情符号开始
    if (t.length < 3 || t.length > 15) return null;
    if (!/^[(（<\\¯]/.test(t)) return null;
    return KAOMOJI_LIST.find(k => t === k) || t;
  }

  // 简单的颜文字 Canvas 动画
  function playAnimation(ctx, text, w, h) {
    const emoji = isKaomoji(text);
    if (!emoji) return false;

    let frame = 0;
    const totalFrames = 60;
    const cy = h / 2;
    const cx = w / 2;

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const t = frame / totalFrames;
      const scale = 0.6 + 0.6 * Math.sin(t * Math.PI);
      const rotate = (Math.sin(t * Math.PI * 2)) * 0.1;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotate);
      ctx.scale(scale, scale);
      ctx.font = "italic 56px 'Cormorant Garamond', serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#1a1a1a";
      ctx.fillText(emoji, 0, 0);
      ctx.restore();

      frame++;
      if (frame <= totalFrames) {
        return new Promise(resolve => requestAnimationFrame(() => resolve(draw())));
      }
    }

    return new Promise(resolve => {
      const result = draw();
      if (result && typeof result.then === "function") {
        result.then(resolve);
      } else {
        resolve();
      }
    });
  }

  // 在小卡片中渲染（用于折纸态预览）
  function renderSmall(canvas, text) {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    if (!isKaomoji(text)) return false;
    ctx.font = "20px 'Cormorant Garamond', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#1a1a1a";
    ctx.fillText(text.trim(), rect.width / 2, rect.height / 2);
    return true;
  }

  return { isKaomoji, playAnimation, renderSmall, KAOMOJI_LIST };
})();