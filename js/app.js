/* ============ 应用入口：哈希路由 + HUD + 学习计时 + 防沉迷 ============ */
const APP = (() => {
  const routes = {
    home:   ['home', 'Pages.home', null],
    letters:['letters', 'Pages.letters', 1],
    words:  ['words', 'Pages.words', 1],
    pinyin: ['pinyin', 'Pages.pinyin', 1],
    hanzi:  ['hanzi', 'Pages.hanzi', 1],
    flow:   ['flow', 'Pages.flow', 1],
    pets:   ['pets', 'Pages.pets', 1],
    pet:    ['pet', 'Pages.pet', 1],
    parent: ['parent', 'Pages.parent', 1],
  };
  let locked = false;

  function curHash() { return location.hash || '#/home'; }

  /* ---------- 顶栏返回：按页面层级回到上一级，首页隐藏 ---------- */
  const TAB_OF = { home:'study', letters:'study', words:'study', pinyin:'study', hanzi:'study', flow:'study', pets:'pets', pet:'pets', parent:'parent' };
  function hud() {
    document.querySelector('#hudStars b').textContent = Store.state.stars;
    document.querySelector('#hudPoints b').textContent = Store.state.points;
    const h = curHash();
    const showBack = !/^#\/home\/?$/.test(h) && h !== '#/' && h !== '';
    document.getElementById('hudBack').hidden = !showBack;
    /* 底部导航高亮 */
    const name = (h.replace(/^#\/?\//, '') || 'home').split('/')[0];
    const tab = TAB_OF[name] || 'study';
    document.querySelectorAll('#tabbar .nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  }
  addEventListener('qsave', hud);

  function bindChrome() {
    document.getElementById('hudBack').onclick = () => {
      TTS.stop(); UI.sfx.tap();
      const h = curHash();
      if (h.startsWith('#/flow/')) location.hash = window.__backHash || '#/home';
      else if (h.startsWith('#/pet/')) location.hash = '#/pets';
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

  /* ---------- 学习计时 + 防沉迷 ---------- */
  let sessionSec = 0;
  window.sessionSecReset = () => { sessionSec = 0; };
  setInterval(() => {
    if (document.hidden || locked) return;
    Store.tick(1); sessionSec++;
    const lim = Store.state.settings.limit;
    if (lim && sessionSec >= lim * 60) showLock();
  }, 1000);

  function showLock() {
    locked = true; TTS.stop();
    const ov = document.createElement('div');
    ov.className = 'lock-screen'; ov.id = 'lockOv';
    ov.innerHTML = `
      <div class="lock-box">
        <div class="emoji">🌙</div>
        <h2>眼睛时间到，休息一下啦！</h2>
        <p>看看窗外的绿树 🌳 喝口水 💧<br>和爸爸妈妈抱一个吧 🤗</p>
        <button class="primary" style="padding:13px 22px;font-size:14px" id="goHome">👨‍👩‍👧 爸爸妈妈帮我解除</button>
      </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('show'));
    TTS.speak({ text: '休息时间到啦，我们保护一下小眼睛吧', lang: 'zh-CN' });
    ov.querySelector('#goHome').onclick = () => {
      locked = false; sessionSec = 0; ov.remove();
      location.hash = '#/home';
    };
  }

  /* ---------- 首次触摸解锁 WebAudio / 语音 ---- */
  addEventListener('pointerdown', function once() {
    UI.sfx.tap(); removeEventListener('pointerdown', once);
  }, { passive: true });

  function boot() {
    document.documentElement.classList.toggle('no-anim', !Store.state.settings.anim);
    Store.checkUnlock();               // 补算离线期间达标的解锁（庆祝弹窗稍后展示）
    bindChrome();
    if (!location.hash) location.hash = '#/home';
    route();
  }
  return { boot, hud };
})();
APP.boot();
