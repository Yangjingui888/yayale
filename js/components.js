/* ============ 可复用学习组件：描红画板 / AI 跟读 ============ */

/* ---------- 描红组件：浅色字形水印 + 手指书写 + 72% 覆盖率判定 ----------
 * 返回 DOM 元素；完成时回调 onDone() */
function TracePad(char, onDone) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="trace-wrap"><b>${char}</b><canvas class="trace-canvas"></canvas></div>
    <div class="trace-tip">沿着浅色字形，把每一笔都描完才算完成哦</div>
    <div style="display:flex;gap:9px;justify-content:center;margin-top:12px">
      <button class="primary ghost" data-act="clear">重新描</button>
      <button class="primary" data-act="ok" disabled>我描完啦</button>
    </div>`;
  const box = wrap.querySelector('.trace-wrap');
  const cv = wrap.querySelector('canvas');
  const ctx = cv.getContext('2d');
  let done = false, strokes = [];

  function size() {
    const r = box.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    if (!r.width) return;
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    ctx.lineWidth = Math.max(6, cv.width * 0.04);
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.strokeStyle = '#6685ef';
  }
  /* 离屏绘制标准字形（与 CSS <b> 水印同字号比例），用于采样覆盖判定 */
  function glyphMask() {
    if (!cv.width || !cv.height) return null;
    const m = document.createElement('canvas'); m.width = cv.width; m.height = cv.height;
    const c = m.getContext('2d');
    c.fillStyle = '#000';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `900 ${cv.height * 0.67}px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif`;
    c.fillText(char, cv.width / 2, cv.height / 2 + cv.height * 0.02);
    return c.getImageData(0, 0, m.width, m.height);
  }
  function redraw() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    strokes.forEach(s => {
      if (!s.length) return;
      ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y);
      s.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
    });
  }
  function pos(e) {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) };
  }
  function down(e) {
    if (done) return;
    e.preventDefault(); UI.sfx.tap();
    if (!cv.width) size();
    strokes.push([pos(e)]);
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  }
  function move(e) {
    if (!strokes.length || done) return;
    strokes[strokes.length - 1].push(pos(e)); redraw();
  }
  function up() {
    if (done) return;
    redraw(); checkCover();
  }
  /* 覆盖率：字符区域划分网格，笔迹（沿连线加密后）经过才算命中 */
  const PASS_RATIO = 0.72;
  function densePoints() {
    const out = [], gap = 6;
    strokes.forEach(s => {
      for (let k = 0; k < s.length - 1; k++) {
        const a = s[k], b = s[k + 1];
        const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / gap));
        for (let j = 0; j < n; j++) out.push({ x: a.x + (b.x - a.x) * j / n, y: a.y + (b.y - a.y) * j / n });
      }
      if (s.length) out.push(s[s.length - 1]);
    });
    return out;
  }
  function checkCover() {
    const mask = glyphMask();
    if (!mask) return;
    const step = Math.max(10, Math.floor(cv.width / 24));
    const hitR = Math.max(step * 0.7, ctx.lineWidth / 2 + 2);   // 只算墨水真正经过的格子
    const pts = densePoints();
    let need = 0, hit = 0;
    for (let y = 0; y < cv.height; y += step)
      for (let x = 0; x < cv.width; x += step) {
        const i = (y * cv.width + x) * 4;
        if (mask.data[i + 3] > 60) {                            // 该格在字形内
          need++;
          const near = pts.some(p => Math.abs(p.x - x) < hitR && Math.abs(p.y - y) < hitR);
          if (near) hit++;
        }
      }
    const ratio = need ? hit / need : 0;
    const okBtn = wrap.querySelector('[data-act="ok"]');
    const tip = wrap.querySelector('.trace-tip');
    if (ratio >= PASS_RATIO) {
      okBtn.disabled = false;
      if (!done) { done = true; tip.textContent = '写得真棒！点「我描完啦」继续 🎉'; UI.sfx.star(); }
    } else {
      done = false;
      okBtn.disabled = true;
      tip.textContent = ratio > 0.08
        ? `已经写了 ${Math.round(ratio * 100)}% ，把每一笔都描完才能继续哦～`
        : '沿着浅色字形，按笔顺慢慢描～';
    }
  }
  cv.addEventListener('pointerdown', down);
  cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  wrap.querySelector('[data-act="clear"]').onclick = () => { strokes = []; done = false; wrap.querySelector('[data-act="ok"]').disabled = true; redraw(); };
  wrap.querySelector('[data-act="ok"]').onclick = () => { UI.sfx.right(); onDone(); };
  setTimeout(size, 30);
  return wrap;
}

/* ---------- AI 跟读组件：开口即成功（低容错，保护孩子） ----------
 * 使用麦克风音量检测；无权限时提供「我读过啦」兜底按钮 */
function ReadAloud(texts, onDone) {
  const wrap = document.createElement('div');
  wrap.className = 'study-card';
  wrap.innerHTML = `
    <div class="study-word">🎙️ AI 口语跟读</div>
    <div class="study-sub">先听示范，再点话筒大声读出来</div>
    <button class="play-word">🔊 播放示范</button>
    <button class="mic" aria-label="开始录音跟读">🎤</button>
    <div class="meter"><i></i></div>
    <div class="follow-result tip">点击图标开始跟读</div>
    <div style="margin-top:12px"><button class="primary ghost skip">麦克风不方便？我读过啦</button></div>`;
  const micBtn = wrap.querySelector('.mic');
  const meter = wrap.querySelector('.meter i');
  const tip = wrap.querySelector('.tip');
  let recording = false, stream = null, rafId = null;

  wrap.querySelector('.play-word').onclick = () => { UI.sfx.pop(); TTS.speak(texts); };
  setTimeout(() => TTS.speak(texts), 500);   // 进入即自动示范一遍

  micBtn.onclick = async () => {
    if (recording) return stopRec(false);
    UI.sfx.tap();
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      tip.textContent = '麦克风不可用，点「我读过啦」也能通过哦';
      return;
    }
    recording = true;
    micBtn.classList.add('listening'); micBtn.textContent = '👂';
    tip.textContent = '正在听…大声读出来吧！';
    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = new AC();
    const src = ac.createMediaStreamSource(stream);
    const ana = ac.createAnalyser(); ana.fftSize = 512;
    src.connect(ana);
    const buf = new Uint8Array(ana.frequencyBinCount);
    let sum = 0, frames = 0;
    const t0 = Date.now();
    (function vol() {
      if (!recording) return;
      ana.getByteTimeDomainData(buf);
      let peak = 0;
      for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
      meter.style.width = Math.min(100, peak * 1.6) + '%';
      if (peak > 22) sum += peak;
      frames++;
      /* 检测到人声能量累计足够 → 开口即成功 */
      if (sum / Math.max(1, frames) > 10 && Date.now() - t0 > 800) { stopRec(true); return; }
      if (Date.now() - t0 > 8000) { stopRec(false); return; }
      rafId = requestAnimationFrame(vol);
    })();
  };

  function stopRec(success) {
    recording = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    micBtn.classList.remove('listening'); micBtn.textContent = '🎤';
    meter.style.width = '0%';
    if (success) {
      tip.textContent = '听到了！发音很有精神，继续保持 ✨';
      UI.sfx.right(); UI.cheer();
      setTimeout(onDone, 900);
    } else {
      tip.textContent = '再试一次吧，你可以的！';
      UI.cheerNear();
    }
  }
  wrap.querySelector('.skip').onclick = () => { UI.sfx.right(); tip.textContent = '真棒！继续加油～'; setTimeout(onDone, 700); };
  return wrap;
}
