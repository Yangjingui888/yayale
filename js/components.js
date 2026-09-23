/* ============ 描红画板组件（demo 语义：画完就算完成，无覆盖判定） ============ */

/* ---------- TracePad：浅色字形水印 + 手指书写 ----------
 * guide 可为单个字符或字符串（单词描红）；「我描完啦」始终可点 */
function TracePad(guide, onDone) {
  const text = String(guide);
  const wrap = document.createElement('div');
  const sizePx = text.length > 3 ? 'font-size:34px;letter-spacing:1px' : text.length > 1 ? 'font-size:52px' : '';
  wrap.innerHTML = `
    <div class="trace-wrap"><b style="${sizePx}">${text}</b><canvas class="trace-canvas"></canvas></div>
    <div class="trace-tip">沿着浅色字形慢慢描，画完点右下角就好啦</div>
    <div class="btns" style="margin-top:12px">
      <button class="primary ghost" data-act="clear">重新描</button>
      <button class="primary" data-act="ok">我描完啦</button>
    </div>`;
  const box = wrap.querySelector('.trace-wrap');
  const cv = wrap.querySelector('canvas');
  const ctx = cv.getContext('2d');
  let strokes = [], drawing = false;

  function size() {
    const r = box.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    if (!r.width) return;
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    ctx.lineWidth = Math.max(6, cv.width * 0.04);
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.strokeStyle = '#6685ef';
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
  wrap.querySelector('[data-act="ok"]').onclick = () => { UI.sfx.right(); onDone(); };
  setTimeout(size, 30);
  return wrap;
}
