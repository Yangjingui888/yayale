/* ============ 应用入口：五页哈希路由 + HUD + 学习计时 + demo 防沉迷 ============ */
const APP = (() => {
  const routes = {
    home:   ['home',   'Pages.home'],
    learn:  ['learn',  'Pages.learn'],
    pets:   ['pets',   'Pages.pets'],
    pet:    ['pet',    'Pages.pet'],
    parent: ['parent', 'Pages.parent'],
  };
  /* 旧地址重定向（书签兼容） */
  const LEGACY = { letters: '#/learn/letters', words: '#/learn/words', pinyin: '#/learn/pinyin', hanzi: '#/learn/hanzi', flow: '#/home' };
  let locked = false;

  function curHash() { return location.hash || '#/home'; }

  /* ---------- 顶栏返回与底部导航高亮 ---------- */
  const TAB_OF = { home: 'study', learn: 'study', pets: 'pets', pet: 'pets', parent: 'parent' };
  function hud() {
    document.querySelector('#hudStars b').textContent = Store.state.stars;
    document.querySelector('#hudPoints b').textContent = Store.state.points;
    const h = curHash();
    const showBack = !/^#\/home\/?$/.test(h) && h !== '#/' && h !== '';
    document.getElementById('hudBack').hidden = !showBack;
    const name = (h.replace(/^#\/?\//, '') || 'home').split('/')[0];
    const tab = TAB_OF[name] || 'study';
    document.querySelectorAll('#tabbar .nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  }
  addEventListener('qsave', hud);

  function bindChrome() {
    document.getElementById('hudBack').onclick = () => {
      TTS.stop(); UI.sfx.tap();
      const h = curHash();
      if (h.startsWith('#/pet/')) location.hash = '#/pets';
      else location.hash = '#/home';
    };
    document.querySelectorAll('#tabbar .nav-item').forEach(b => b.onclick = () => {
      UI.sfx.tap(); TTS.stop();
      const go = { study: '#/home', pets: '#/pets', parent: '#/parent' }[b.dataset.tab];
      if (location.hash === go) route(); else location.hash = go;
    });
  }

  function route() {
    const hash = location.hash.replace(/^#\/?/, '') || 'home';
    const [name, ...rest] = hash.split('/');
    if (LEGACY[name]) { location.hash = LEGACY[name]; return; }
    const r = routes[name] || routes.home;
    const el = document.getElementById('view');
    TTS.stop();
    el.innerHTML = '';
    el.scrollTop = 0;
    window.scrollTo(0, 0);
    Pages[r[0]](el, rest.join('/'));
    hud();
    setTimeout(() => UI.checkUnlockCelebration(), 300);
  }
  addEventListener('hashchange', route);

  /* ---------- 学习计时 + demo 防沉迷（sessionStart 起算，切后台暂停） ---------- */
  let sessionStart = Date.now();
  window.sessionSecReset = () => { sessionStart = Date.now(); locked = false; };
  setInterval(() => {
    if (locked) return;
    if (document.hidden) { sessionStart += 5000; return; }   // 离开页面暂停计时
    Store.tick(5);
    const lim = Store.state.timer;
    if (lim && Date.now() - sessionStart >= lim * 60000) showLock();
  }, 5000);

  function showLock() {
    locked = true; TTS.stop();
    const ov = document.createElement('div');
    ov.className = 'lock-screen show';
    ov.innerHTML = `
      <div class="lock-box">
        <div class="emoji">🌙</div>
        <h2>今天的学习时间到啦</h2>
        <p>小眼睛休息一下，和家长一起去看看学习小报告吧。</p>
        <button class="primary" id="unlockBtn">去家长中心</button>
      </div>`;
    document.body.appendChild(ov);
    TTS.speak({ text: '休息时间到啦，我们保护一下小眼睛吧', lang: 'zh-CN' });
    ov.querySelector('#unlockBtn').onclick = () => {
      ov.remove();
      sessionStart = Date.now(); locked = false;
      location.hash = '#/parent';
    };
  }

  /* ---------- 首次触摸解锁 WebAudio / 语音 ---- */
  addEventListener('pointerdown', function once() {
    UI.sfx.tap(); removeEventListener('pointerdown', once);
  }, { passive: true });

  function boot() {
    applyMotion();
    Store.initUnlockQueue();          // 补算离线期间达标的解锁（庆祝弹窗稍后展示）
    bindChrome();
    if (!location.hash || location.hash === '#' || location.hash === '#/') location.hash = '#/home';
    route();
  }
  return { boot, hud };
})();
APP.boot();
