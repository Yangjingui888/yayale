/* ============ 描红画板组件（demo 语义：画完就算完成；笔迹质量只影响 1-3 星评分，不拦截） ============ */

/* ---------- TracePad：浅色字形水印 + 手指书写 + 覆盖率判分 ----------
 * guide 可为单个字符或字符串（单词描红）；onDone(score) 回调携带 1-3 星 */
function TracePad(guide, onDone) {
  const text = String(guide);
  const isCJK = /[\u4e00-\u9fa5]/.test(text);
  const wide = matchMedia('(min-width: 700px)').matches;   // 与 style.css 大屏断点一致
  const capFs = wide ? 200 : 158;                          // 单字水印字号上限（.trace-wrap b）
  const boxW = wide ? 300 : 236;                           // .trace-wrap 边长
  const wrap = document.createElement('div');
  /* 多字符（单词/拼音）先按 0.62em/字符估宽给初值，真实宽由 fitFont 测量后微调 */
  const multi = text.length > 1;
  const initFs = multi ? Math.max(24, Math.min(capFs, Math.floor((boxW - 14) / (0.62 * text.length)))) : 0;
  const sizePx = multi ? `font-size:${initFs}px;letter-spacing:1px` : '';
  wrap.innerHTML = `
    <div class="trace-wrap"><b style="${sizePx}">${text}</b><canvas class="trace-canvas"></canvas></div>
    <div class="trace-tip">沿着浅色字形慢慢描，画完点右下角就好啦</div>
    <div class="btns" style="margin-top:12px">
      <button class="primary ghost" data-act="clear">重新描</button>
      <button class="primary" data-act="ok">我描完啦</button>
    </div>`;
  const box = wrap.querySelector('.trace-wrap');
  const bEl = box.querySelector('b');
  const cv = wrap.querySelector('canvas');
  const ctx = cv.getContext('2d');
  let strokes = [], drawing = false;
  const step = 6;                  // 字形采样网格（CSS px）
  let strokeW = 9, maskPts = [];

  /* 以水印同样的字号/位置离屏渲染字形，提取采样点集 */
  function buildMask(cssW, cssH) {
    const off = document.createElement('canvas');
    off.width = Math.max(1, Math.round(cssW)); off.height = Math.max(1, Math.round(cssH));
    const c = off.getContext('2d');
    const st = getComputedStyle(bEl);
    const fs = parseFloat(st.fontSize) || cssW * 0.67;
    /* computed 的 font 简写已含字重/字体族/连字特性，与 DOM 水印排版完全一致 */
    c.font = [st.font, `${st.fontWeight || 900} ${fs}px sans-serif`].find(x => x && x.indexOf(fs + 'px') > 0);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#000';
    c.fillText(text, off.width / 2, off.height / 2);
    const data = c.getImageData(0, 0, off.width, off.height).data;
    maskPts = [];
    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        if (data[(y * off.width + x) * 4 + 3] > 60) maskPts.push({ x, y });
      }
    }
  }

  /* 多字符撑满格子：以单字字号为上限，量出真实墨迹宽后等比缩放到刚好不溢出边框 */
  function fitFont() {
    if (!multi) return;
    const w = box.clientWidth;
    if (!w) return;                              // 格子尚未布局（隐藏态）时跳过，resize 后重算
    bEl.style.fontSize = capFs + 'px';
    const run = bEl.scrollWidth || w;
    bEl.style.fontSize = Math.max(24, Math.min(capFs, Math.floor(capFs * (w - 14) / run))) + 'px';
  }

  function size() {
    fitFont();
    const r = box.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    if (!r.width) return;
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    /* 笔宽不超过字号 12%，小字号长单词下仍能盖住笔画采样点 */
    strokeW = Math.max(6, Math.min(r.width * 0.04, (parseFloat(getComputedStyle(bEl).fontSize) || r.width * 0.67) * 0.12));
    ctx.lineWidth = strokeW;
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.strokeStyle = '#6685ef';
    buildMask(r.width, r.height);
  }
  function redraw() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    strokes.forEach(s => {
      if (!s.length) return;
      if (s.length === 1) {                       // 单点轻触：画圆点，落笔停顿不被吞
        ctx.beginPath();
        ctx.arc(s[0].x, s[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle; ctx.fill();
        return;
      }
      ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y);
      s.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
    });
  }

  /* ----- 判分：笔迹沿线加密采样，统计覆盖了多少字形采样点 ----- */
  function denseCssPoints() {
    const r = box.getBoundingClientRect();
    const k = cv.width ? r.width / cv.width : 1;   // buffer 像素 → CSS 像素
    const out = [], gap = step / 2;
    strokes.forEach(st => {
      if (!st.length) return;
      if (st.length === 1) { out.push({ x: st[0].x * k, y: st[0].y * k }); return; }
      for (let i = 1; i < st.length; i++) {
        const ax = st[i - 1].x * k, ay = st[i - 1].y * k, bx = st[i].x * k, by = st[i].y * k;
        const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / gap));
        for (let j = 0; j <= n; j++) out.push({ x: ax + (bx - ax) * j / n, y: ay + (by - ay) * j / n });
      }
    });
    return out;
  }
  function scoreNow() {
    if (!maskPts.length) return 3;                 // 字形采样不可用时不误伤
    const dense = denseCssPoints();
    if (!dense.length) return 1;
    const R = step * 0.75 + strokeW / 2, R2 = R * R;
    let hit = 0;
    for (let m = 0; m < maskPts.length; m++) {
      for (let i = 0; i < dense.length; i++) {
        const dx = dense[i].x - maskPts[m].x, dy = dense[i].y - maskPts[m].y;
        if (dx * dx + dy * dy <= R2) { hit++; break; }
      }
    }
    const cov = hit / maskPts.length;
    /* 阈值：长单词笔画细、采样点密，容差稍宽；汉字笔画密适度放宽；单字母保持严格 */
    const t = text.length >= 7 ? [0.55, 0.32] : text.length >= 3 ? [0.60, 0.35] : isCJK ? [0.65, 0.40] : [0.72, 0.45];
    return cov >= t[0] ? 3 : cov >= t[1] ? 2 : 1;
  }

  function pos(e) {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) };
  }
  function down(e) {
    e.preventDefault(); UI.sfx.tap();
    if (!cv.width) size();
    drawing = true;
    strokes.push([pos(e)]);
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  }
  function move(e) {
    if (!drawing || !strokes.length) return;      // 未持笔（悬停/抬笔后移动）不续画
    strokes[strokes.length - 1].push(pos(e)); redraw();
  }
  function up() {
    if (!drawing) return;
    drawing = false;
    redraw();
  }
  cv.addEventListener('pointerdown', down);
  cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', up);        // 移出画板视为抬笔
  cv.addEventListener('pointerlostpointercapture', up);
  wrap.querySelector('[data-act="clear"]').onclick = () => { strokes = []; drawing = false; redraw(); };
  wrap.querySelector('[data-act="ok"]').onclick = () => { UI.sfx.right(); onDone(scoreNow()); };
  function refit(rescaleInk) {
    if (!document.body.contains(wrap)) { dispose(); return; }   // 节点已销毁：停止跟随
    const oldW = cv.width;
    size();
    if (rescaleInk && oldW && cv.width !== oldW) {   // 已有笔迹按宽度比例缩放，旋转屏幕不跑位
      const k = cv.width / oldW;
      strokes = strokes.map(st => st.map(pt => ({ x: pt.x * k, y: pt.y * k })));
    }
    redraw();
  }
  const onResize = () => refit(true);
  addEventListener('resize', onResize);
  /* 弹层滑入/展开动画期间格子宽度会跳变：跟随重算字号与字形遮罩（不清笔迹、不缩放坐标） */
  let ro = null;
  if (window.ResizeObserver) {
    let lastW = 0;
    ro = new ResizeObserver(() => {
      const w = Math.round(box.getBoundingClientRect().width);
      if (w === lastW) return;                 // 只响应真实宽度变化，高度动画不触发
      lastW = w;
      refit(false);
    });
    ro.observe(box);
  }
  function dispose() {
    removeEventListener('resize', onResize);
    if (ro) { ro.disconnect(); ro = null; }
  }
  setTimeout(size, 30);
  return wrap;
}
