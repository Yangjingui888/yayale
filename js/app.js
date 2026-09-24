/* ============ 应用入口：登录门 + 六页哈希路由 + HUD + 学习计时 + demo 防沉迷 ============ */
const APP = (() => {
  const routes = {
    home:   ['home',   'Pages.home'],
    learn:  ['learn',  'Pages.learn'],
    pets:   ['pets',   'Pages.pets'],
    pet:    ['pet',    'Pages.pet'],
    parent: ['parent', 'Pages.parent'],
    me:     ['me',     'Pages.me'],
  };
  /* 旧地址重定向（书签兼容） */
  const LEGACY = { letters: '#/learn/letters', words: '#/learn/words', pinyin: '#/learn/pinyin', hanzi: '#/learn/hanzi', flow: '#/home' };
  let locked = false;
  let started = false;        // 登录成功后的应用主体（计时器等只启一次）
  let timerOn = false;

  function curHash() { return location.hash || '#/home'; }

  /* ---------- 顶栏返回与底部导航高亮 ---------- */
  const TAB_OF = { home: 'study', learn: 'study', pets: 'pets', pet: 'pets', parent: 'parent', me: '' };
  function hud() {
    if (!started) return;
    document.querySelector('#hudStars b').textContent = Store.state.stars;
    document.querySelector('#hudPoints b').textContent = Store.state.points;
    const acc = Auth.get();
    const meBtn = document.getElementById('hudMe');
    if (meBtn && acc) meBtn.textContent = acc.avatar;
    const h = curHash();
    /* 顶部品牌栏（芽芽乐 / ⭐星星 / 🟡积分 / 头像）仅在学习首页显示，其余二级/宠物/家长/个人中心页整体隐藏 */
    const isHome = /^#\/home\/?$/.test(h) || h === '#/' || h === '';
    document.getElementById('hud').hidden = !isHome;
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
    document.getElementById('hudMe').onclick = () => { UI.sfx.tap(); location.hash = '#/me'; };
  }

  function route() {
    const hash = location.hash.replace(/^#\/?/, '') || 'home';
    const [name, ...rest] = hash.split('/');
    const el = document.getElementById('view');
    /* 登录门：未登录只渲染登录页 */
    if (!started) {
      if (name !== 'login') { location.hash = '#/login'; return; }
      el.dataset.page = 'login';
      TTS.stop();
      el.innerHTML = '';
      window.scrollTo(0, 0);
      Pages.login(el);
      return;
    }
    if (name === 'login') { location.hash = '#/home'; return; }
    if (LEGACY[name]) { location.hash = LEGACY[name]; return; }
    const r = routes[name] || routes.home;
    el.dataset.page = r[0];
    TTS.stop();
    el.innerHTML = '';
    el.scrollTop = 0;
    window.scrollTo(0, 0);
    Pages[r[0]](el, rest.join('/'));
    hud();
    setTimeout(() => UI.checkUnlockCelebration(), 300);
  }
  addEventListener('hashchange', route);

  /* ---------- 学习计时 + demo 防沉迷（登录成功后才启动） ---------- */
  let sessionStart = Date.now();
  window.sessionSecReset = () => { sessionStart = Date.now(); locked = false; };
  function startTimer() {
    if (timerOn) return;
    timerOn = true;
    sessionStart = Date.now();
    setInterval(() => {
      if (locked) return;
      if (document.hidden) { sessionStart += 5000; return; }   // 离开页面暂停计时
      Store.tick(5);
      const lim = Store.state.timer;
      if (lim && Date.now() - sessionStart >= lim * 60000) showLock();
    }, 5000);
  }

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

  /* ---------- 登录成功：装载该账号存档并进入应用 ---------- */
  function enter(username) {
    Store.use(username);
    started = true;
    document.body.classList.remove('logged-out');
    applyMotion();
    Store.initUnlockQueue();          // 补算离线期间达标的解锁（庆祝弹窗稍后展示）
    bindChrome();
    startTimer();
    if (!routes[(location.hash.replace(/^#\/?/, '') || 'home').split('/')[0]] || /^#\/?login/.test(location.hash)) location.hash = '#/home';
    route();
  }

  /* ---------- 退出登录：清会话并回到登录页 ---------- */
  function logout() {
    Auth.logout();
    location.reload();
  }

  /* ---------- 首次触摸解锁 WebAudio / 语音（平板/iOS 播报需交互触发） ---------- */
  addEventListener('pointerdown', function once() {
    UI.sfx.tap(); TTS.unlock(); removeEventListener('pointerdown', once);
  }, { passive: true });

  async function boot() {
    await Auth.ensureAdmin();
    const user = Auth.current();
    if (user) { enter(user); return; }
    document.body.classList.add('logged-out');
    if (location.hash === '#/login' || !location.hash || location.hash === '#') { location.hash = '#/login'; route(); }
    else location.hash = '#/login';   // hashchange 触发 route → 登录页
  }
  return { boot, enter, logout, hud };
})();
APP.boot();
