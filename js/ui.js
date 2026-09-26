/* ============ UI 特效层：音效 / toast / 底部弹层 / 彩带粒子 / 解锁庆祝 ============ */
const UI = (() => {
  /* ---------- WebAudio 轻快音效（无需音频文件） ---------- */
  let ac = null;
  function ctx() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, t0, dur, type = 'sine', gain = 0.18) {
    const c = ctx(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, c.currentTime + t0);
    g.gain.linearRampToValueAtTime(gain, c.currentTime + t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.05);
  }
  const sfx = {
    tap:  () => tone(660, 0, 0.09, 'triangle', 0.12),
    pop:  () => tone(880, 0, 0.12, 'sine', 0.16),
    right: () => { tone(523, 0, .12); tone(659, .09, .12); tone(784, .18, .2); },
    wrong: () => { tone(330, 0, .12, 'triangle'); tone(294, .1, .15, 'triangle'); },
    star: () => { tone(1046, 0, .1); tone(1318, .07, .1); tone(1568, .14, .18); },
    unlock: () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * .1, .22, 'sine', .2)); },
    levelup: () => { [659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, i * .11, .22)); },
    feed: () => { tone(500, 0, .08, 'triangle'); tone(700, .08, .12, 'triangle'); },
  };

  /* ---------- token 消费入口：JS 侧取 :root 语义色，禁止再私建重复色字典 ---------- */
  const _tokenCache = {};
  function token(name) {
    if (_tokenCache[name]) return _tokenCache[name];
    return _tokenCache[name] = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  /* ---------- Toast（底部深蓝胶囊） ---------- */
  function toast(msg) {
    const layer = document.getElementById('toastLayer');
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg;
    layer.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 320); }, 2200);
  }

  /* ---------- 底部弹层：返回 { el(sheet 容器), close() } ---------- */
  function dialog(html, { dismissable = true } = {}) {
    const mask = document.getElementById('modalLayer');
    const sheet = document.getElementById('sheet');
    sheet.innerHTML = html;
    mask.classList.add('show');
    const close = () => mask.classList.remove('show');
    mask.onclick = e => { if (dismissable && e.target === mask) close(); };
    sheet.scrollTop = 0;
    return { el: sheet, close };
  }

  /* ---------- 全屏彩带星星粒子 ---------- */
  const fx = document.getElementById('fxCanvas');
  const fxc = fx.getContext('2d');
  let parts = [], raf = null;
  function sizeFx() { fx.width = innerWidth * devicePixelRatio; fx.height = innerHeight * devicePixelRatio; }
  addEventListener('resize', sizeFx); sizeFx();
  function burst(n = 120) {
    if (!Store.state.motion) return;
    const dpr = devicePixelRatio;
    const colors = ['--yellow', '--pink', '--mint', '--fx-sky', '--fx-lilac'].map(token);
    const chars = ['⭐', '🎉', '✨', '🌟', '', '●'];
    for (let i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * fx.width, y: -20 - Math.random() * fx.height * .4,
        vx: (Math.random() - .5) * 3 * dpr, vy: (2 + Math.random() * 3.5) * dpr,
        r: (8 + Math.random() * 14) * dpr / 2, rot: Math.random() * 6.3, vr: (Math.random() - .5) * .2,
        c: colors[i % colors.length], ch: chars[Math.random() * chars.length | 0], life: 1,
      });
    }
    if (!raf) loop();
  }
  function loop() {
    fxc.clearRect(0, 0, fx.width, fx.height);
    parts = parts.filter(p => p.life > 0 && p.y < fx.height + 30);
    parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vy += .05;
      if (p.y > fx.height * .75) p.life -= .03;
      fxc.save(); fxc.translate(p.x, p.y); fxc.rotate(p.rot);
      fxc.globalAlpha = Math.max(0, p.life);
      if (p.ch) { fxc.font = `${p.r * 2}px serif`; fxc.fillText(p.ch, -p.r, p.r); }
      else { fxc.fillStyle = p.c; fxc.fillRect(-p.r / 2, -p.r, p.r, p.r * 2); }
      fxc.restore();
    });
    if (parts.length) raf = requestAnimationFrame(loop);
    else { raf = null; fxc.clearRect(0, 0, fx.width, fx.height); }
  }
  function glowFlash() {
    if (!Store.state.motion) return;
    burst(200);
  }

  /* ---------- 皮肤图加载失败→回退显示 emoji（防 GitHub Pages 冷缓存/缺图） ---------- */
  window.skinImgFail = function (img) {
    img.style.display = 'none';
    const fb = img.parentElement && img.parentElement.querySelector('.skin-fallback');
    if (fb) fb.style.display = 'inline';
  };

  /* ---------- 正向鼓励话术（全程无负面） ---------- */
  const CHEER_ZH = ['你真棒！', '太厉害啦！', '做得好！', '哇，真聪明！', '继续加油哦！'];
  const CHEER_NEAR = ['差一点点啦，再试一次～', '没关系，我们再来！', '仔细听一听，你可以的！'];
  const pick = a => a[Math.random() * a.length | 0];
  function cheer() { const t = pick(CHEER_ZH); toast(t); TTS.speak({ text: t, lang: 'zh-CN' }); }
  function cheerNear() { const t = pick(CHEER_NEAR); toast(t); TTS.speak({ text: t, lang: 'zh-CN' }); }

  /* ---------- 新宠物解锁庆祝（demo openAchievement 同款文案） ---------- */
  /* 独立浮层：不复用 #sheet，避免学习中途弹庆祝冲掉正在进行的练习弹层 */
  let celebrating = false;
  function checkUnlockCelebration() {
    if (celebrating) return;
    const idx = Store.peekUnlock();
    if (idx === null) return;
    celebrating = true;
    const p = PETS[idx];
    sfx.unlock(); burst(160);
    let mask = document.getElementById('celebrateLayer');
    if (!mask) {
      mask = document.createElement('div');
      mask.id = 'celebrateLayer';
      mask.className = 'modal-mask';
      const panel = document.createElement('div');
      panel.className = 'sheet';
      mask.appendChild(panel);
      document.body.appendChild(mask);
    }
    const panel = mask.querySelector('.sheet');
    panel.innerHTML = `
      <div class="study-card">
        <div class="study-visual">🎉</div>
        <h2 style="font-size:20px">新伙伴解锁啦！</h2>
        <p class="study-sub">你已经累计获得 ${Store.state.lifetimePoints} 积分</p>
        <div class="achievement"><div class="badge">${p.em}</div>
          <div><b>${p.L} · ${p.en} ${p.name}</b>
          <small>专属食物：${p.food[2]} ${p.food[0]} · ${p.food[1]}</small></div>
        </div>
      </div>`;
    mask.classList.add('show');
    const btn = document.createElement('button');
    btn.className = 'primary'; btn.style.margin = '16px auto 0'; btn.textContent = '去看看新伙伴';
    btn.onclick = () => {
      Store.popUnlock();
      mask.classList.remove('show'); celebrating = false;
      TTS.speak({ text: `Congratulations! ${p.en} is unlocked.`, lang: 'en-US' });
      location.hash = '#/pets';
      setTimeout(() => checkUnlockCelebration(), 800);   // 队列中还有则继续庆祝
    };
    panel.appendChild(btn);
  }

  return { sfx, toast, dialog, burst, glowFlash, cheer, cheerNear, checkUnlockCelebration, token };
})();
