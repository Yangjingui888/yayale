/* ============ 芽芽乐 · 五页路由（demo 模型：home / learn / pets / detail / parent，练习走底部弹层） ============ */
const Pages = {};

/* 打开底部弹层并自动绑定右上角关闭按钮 */
function openSheet(html, opts) {
  const d = UI.dialog(html, opts);
  const x = d.el.querySelector('[data-x="hide"]');
  if (x) x.onclick = () => { UI.sfx.tap(); d.close(); };
  return d;
}

/* 按时段问候 */
function greet() {
  const h = new Date().getHours();
  return h < 12 ? '早上好' : h < 18 ? '下午好' : '晚上好';
}

/* 皮肤图（成品 webp + emoji 兜底，demo skinVisual 结构） */
function skinVisual(pet, skinId) {
  return `<span class="wear-stack"><img class="pet-photo" src="${skinImg(pet.L, skinId)}" alt="${pet.name} · ${skinId}" onerror="skinImgFail(this)"><span class="skin-fallback">${pet.em}</span></span>`;
}
function skinLabel(id) { const s = SKIN_CATALOG.find(x => x[0] === id); return s ? s[1] : '自然森林'; }

/* qsave 时刷新学习页打勾状态（仅当学习页在屏） */
let learnRefresh = null;
window.addEventListener('qsave', () => {
  const host = document.getElementById('lessonList');
  if (host && host.isConnected && learnRefresh) learnRefresh();
});

/* ---------- ① 首页 ---------- */
Pages.home = (el) => {
  const s = Store.state;
  const n = Store.unlockCount();
  const pi = Math.min(n, 25);
  const nextPet = n < 26 ? PETS[n] : null;
  const need = nextPet ? ECON.unlockAt(n) : 0;
  const gap = nextPet ? Math.max(0, need - s.lifetimePoints) : 0;
  const teaserPet = PETS[pi];
  const done = Math.min(4, s.completed.length);

  el.innerHTML = `
    <div class="hero">
      <h1>${greet()}，<br>小小探险家！</h1>
      <p>今天也来认识一个新朋友吧</p>
      <div class="hero-row">
        <button class="hero-btn" data-go="#/learn/letters">继续学习 <span>→</span></button>
        <span class="hero-pet">${skinVisual(teaserPet, Store.curSkin(pi))}</span>
      </div>
    </div>

    <div class="section-head"><h2>今天学什么？</h2><button id="rules">奖励规则</button></div>
    <div class="modules">
      <button class="module m-blue" data-go="#/learn/letters"><em>英语</em><b>字母乐园</b><small>听一听 · 读一读</small><span class="ico">🔤</span></button>
      <button class="module m-pink" data-go="#/learn/words"><em>英语</em><b>单词乐园</b><small>看图学单词</small><span class="ico">🍎</span></button>
      <button class="module m-yellow" data-go="#/learn/hanzi"><em>汉字</em><b>汉字小课堂</b><small>描一描 · 认一认</small><span class="ico">🖌️</span></button>
      <button class="module m-green" data-go="#/learn/pinyin"><em>拼音</em><b>拼音小火车</b><small>听音来拼读</small><span class="ico">🚂</span></button>
    </div>

    <div class="progress-card">
      <div class="progress-head"><b>今日学习进度</b><span>${done} / 4 项</span></div>
      <div class="bar"><i style="width:${done * 25}%"></i></div>
      <div class="progress-foot"><span>${done >= 4 ? '今天的学习任务完成啦，明天见！' : '完成一关，收集你的第一颗星星'}</span><span>答题有奖励</span></div>
    </div>

    <div class="pet-teaser">
      <div class="pet-teaser-art">${skinVisual(teaserPet, Store.curSkin(pi))}</div>
      <div class="pet-teaser-main">
        <h3>小伙伴在宠物小屋等你</h3>
        <p>${n >= 26 ? '26 位小伙伴都已到齐！' : `再攒 ${gap} 积分，解锁 ${teaserPet.L} · ${teaserPet.name}`}</p>
      </div>
      <button class="pill-btn" data-go="#/pets">${n}/26 去看看</button>
    </div>`;

  el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { UI.sfx.tap(); location.hash = b.dataset.go; });
  el.querySelector('#rules').onclick = () => {
    UI.sfx.tap();
    openSheet(`
      <div class="sheet-head"><h3>芽芽乐奖励规则</h3><button class="close" data-x="hide">×</button></div>
      <div class="rule">${RULES.map(r => `<div class="rule-row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}</div>
      <p class="study-sub" style="margin-top:10px">学习有奖励 · 只鼓励 · 不惩罚</p>`);
  };
};

/* ---------- ② 学习页（模块四 tab + 筛选 + 课时列表） ---------- */
const LEARN_META = {
  letters: { title: '字母乐园', sub: '跟着小伙伴，一起开口读 · 26 个字母', emoji: '🦊', grad: 'g-blue', filters: ['A-Z', '已学', '待学习'] },
  words:   { title: '单词乐园', sub: '看图识词 · 6 大主题', emoji: '🍎', grad: 'g-pink', filters: null },
  hanzi:   { title: '汉字小课堂', sub: '描一描 · 认一认 · 8 组常用字', emoji: '🖌️', grad: 'g-yellow', filters: null },
  pinyin:  { title: '拼音小火车', sub: '听音来拼读 · 声母韵母', emoji: '🚂', grad: 'g-green', filters: null },
};

Pages.learn = (el, module) => {
  if (!LEARN_META[module]) return location.hash = '#/home';
  const meta = LEARN_META[module];
  const filters = meta.filters || ['全部'].concat(
    module === 'words' ? WORD_THEMES.map(t => t.name) :
    module === 'pinyin' ? PINYIN_GROUPS.map(g => g.name) : HANZI_GROUPS.map(g => g.name));
  let fi = 0;
  el.innerHTML = `
    <div class="sub-top back-row"><button class="back" id="pgBack">‹</button>
      <div><h1>${meta.title}</h1><small>${meta.sub}</small></div></div>
    <div class="learn-hero ${meta.grad}"><h2>${meta.title}</h2><p>发音认知 → 描红练习 → AI跟读 → 小游戏闯关</p><div class="learn-hero-art">${meta.emoji}</div></div>
    <div class="learn-tabs" id="learnTabs">
      <button class="active" data-tab="learn">学习</button>
      <button data-tab="trace">描红</button>
      <button data-tab="follow">AI跟读</button>
      <button data-tab="game">小游戏</button>
    </div>
    <div class="lesson-filter" id="flt"></div>
    <div class="lesson-list" id="lessonList"></div>
    <button class="play-row" id="modPlay" style="width:100%;margin-top:12px"><span>🔊 点我听当前模块标准发音</span><span class="rp">播放声音</span></button>`;
  el.querySelector('#pgBack').onclick = () => { TTS.stop(); location.hash = '#/home'; };

  /* 当前课时：第一个未整体完成的行 */
  const list = Learn.LESSONS(module);
  const curIdx = () => { const k = list.findIndex(x => !lessonDone(module, x.id)); return k < 0 ? 0 : k; };

  function categoryOf(x) {
    if (module === 'words') return WORD_THEMES[+String(x.id).split('_')[0]].name;
    if (module === 'pinyin') return PINYIN_GROUPS[+String(x.id).split('_')[0]].name;
    if (module === 'hanzi') return HANZI_GROUPS[+String(x.id).split('_')[0]].name;
    return '';
  }
  function rowVisible(x) {
    if (fi === 0) return true;
    if (module === 'letters') {
      const doneRow = lessonDone(module, x.id);
      return filters[fi] === '已学' ? doneRow : !doneRow;
    }
    return categoryOf(x) === filters[fi];
  }

  const flt = el.querySelector('#flt'), lst = el.querySelector('#lessonList');
  function paintFilter() {
    flt.innerHTML = filters.map((n, k) => `<button class="${k === fi ? 'active' : ''}" data-f="${k}">${n}</button>`).join('');
    flt.querySelectorAll('button').forEach(b => b.onclick = () => { fi = +b.dataset.f; UI.sfx.tap(); paintFilter(); paintList(); });
  }
  function paintList() {
    lst.innerHTML = '';
    list.forEach(x => {
      if (!rowVisible(x)) return;
      const done = lessonDone(module, x.id);
      const row = document.createElement('div');
      row.className = 'lesson';
      row.innerHTML = `
        <div class="lesson-icon">${module === 'letters' ? x.title.replace('字母 ', '') : x.quizVisual}</div>
        <div class="lesson-main"><b>${x.title}</b><small>${x.sub} · ${done ? '已完成，可无限复习' : '点击开始学习'}</small></div>
        <button class="${done ? 'done' : ''}">${done ? '✓ 再练' : '开始'}</button>`;
      row.querySelector('button').onclick = () => { UI.sfx.pop(); Learn.openStudy(module, x.id); };
      lst.appendChild(row);
    });
    if (!lst.children.length) lst.innerHTML = '<p class="study-sub" style="text-align:center;padding:18px">这一类全都练过啦，真棒！换个分类看看吧</p>';
  }
  learnRefresh = () => { paintList(); };

  /* 四 tab：非「学习」直接打开当前课时对应练习弹层 */
  el.querySelectorAll('#learnTabs button').forEach(b => b.onclick = () => {
    UI.sfx.tap();
    el.querySelectorAll('#learnTabs button').forEach(x => x.classList.toggle('active', x === b));
    const x = list[curIdx()];
    if (b.dataset.tab === 'learn') return;
    Learn.openStudy(module, x.id);
    if (b.dataset.tab !== 'learn') Learn.startPractice(b.dataset.tab === 'game' ? 'sound' : b.dataset.tab);
  });

  el.querySelector('#modPlay').onclick = () => { UI.sfx.pop(); TTS.speak(list[curIdx()].play); };
  paintFilter(); paintList();
};

/* ---------- ③ 宠物小屋 ---------- */
Pages.pets = (el) => {
  const s = Store.state;
  const n = Store.unlockCount();
  const next = n < 26 ? PETS[n] : null;
  const need = next ? ECON.unlockAt(n) : 0;
  el.innerHTML = `
    <div class="sub-top back-row"><button class="back" id="pgBack">‹</button>
      <div><h1>宠物小屋</h1><small>收集 26 位字母小伙伴</small></div></div>
    <div class="pets-wrap">
      <div class="pet-banner"><div><h2>我的小伙伴</h2><p>累计积分，按 A-Z 顺序解锁 · 积分不清零</p></div><div class="pet-banner-art">🏡</div></div>
      <div class="pet-progress">${next
        ? `<strong>${s.lifetimePoints} / ${need} 积分</strong> · 再学习一点，就能解锁 ${next.L} · ${next.name}<div class="bar"><i style="width:${Math.min(100, s.lifetimePoints / need * 100)}%"></i></div>`
        : '<strong>26 / 26</strong> · 所有字母小伙伴都到齐啦！'}</div>
      <div class="pet-grid">
        ${PETS.map((p, i) => {
          const unlocked = i < n, prev = i === 0 || i - 1 < n;
          const skin = Store.curSkin(i);
          const caption = unlocked ? `好感 Lv${Store.petLevel(i)} · ${skinLabel(skin)}`
            : prev ? `${s.lifetimePoints} / ${ECON.unlockAt(i)} 积分` : '请先解锁上一只宠物';
          return `<button class="pet ${unlocked ? '' : 'locked'}" data-i="${i}">
            <span class="lock">${unlocked ? '' : '🔒'}</span>
            <span class="pet-art">${skinVisual(p, skin)}</span>
            <b>${p.L} · ${p.name}</b><small>${caption}</small></button>`;
        }).join('')}
      </div>
    </div>`;
  el.querySelector('#pgBack').onclick = () => { TTS.stop(); location.hash = '#/home'; };
  el.querySelectorAll('.pet').forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    if (Store.isUnlocked(i)) { UI.sfx.tap(); location.hash = `#/pet/${i}`; }
    else {
      UI.sfx.wrong();
      const prev = i === 0 || i - 1 < n;
      UI.toast(prev ? `还差 ${Math.max(0, ECON.unlockAt(i) - s.lifetimePoints)} 积分就能解锁啦！` : '请先解锁上一只宠物');
    }
  });
  setTimeout(() => UI.checkUnlockCelebration(), 400);
};

/* ---------- ④ 宠物详情页（购粮 / 投喂 / 换装一站式） ---------- */
Pages.pet = (el, arg) => {
  const idx = +arg;
  if (!Store.isUnlocked(idx)) return location.hash = '#/pets';
  const p = PETS[idx];
  const draw = () => {
    const lv = Store.petLevel(idx), aff = Number(Store.state.affection[idx] || 0);
    const food = Store.foodCount(idx);
    const skin = Store.curSkin(idx);
    const lvMax = lv >= ECON.maxLevel;
    const heartPct = lvMax ? 100 : (aff % ECON.feedGain) / ECON.feedGain * 100;
    el.innerHTML = `
      <div class="sub-top back-row"><button class="back" id="pgBack">‹</button>
        <div><h1 style="font-size:17px">${p.L} · ${p.en} ${p.name}</h1><small>一站式养成小天地</small></div></div>
      <div class="detail-hero">
        <div class="big-pet" id="petStage">${skinVisual(p, skin)}</div>
        <h2 id="petName">${p.L} · ${p.en} ${p.name} <button class="play-word" id="sayEn">🔊</button></h2>
        <p>专属食物：${p.food[2]} ${p.food[0]} ${p.food[1]}</p>
        <div class="heart-bar"><span>好感度 Lv${lv}　${'♥'.repeat(lv)}${'♡'.repeat(ECON.maxLevel - lv)}</span>
          <div class="bar"><i class="heart-fill" style="width:${heartPct}%"></i></div></div>
      </div>
      <div class="detail-card">
        <div class="food-line">
          <div class="food-icon">${p.food[2]}</div>
          <div><b>${p.food[0]} · ${p.food[1]}</b><small>只给 ${p.name} 的专属食物</small></div>
          <div class="food-count"><span>${food}</span><small> / ${ECON.foodCap}</small></div>
        </div>
      </div>
      <div class="detail-actions">
        <button id="actBuy">🛒 去商店购粮</button>
        <button id="actFeed">🍬 投喂宠物</button>
        <button id="actDress">✨ 换装</button>
      </div>
      <div class="detail-card">
        <div class="section-head" style="padding:0 0 5px"><h2 style="font-size:15px">我的皮肤</h2>
          <span id="skinBalance">⭐ ${Store.state.stars} · 8 套主题（4原色+4彩色）</span></div>
        <div class="skins" id="skinList">
          ${SKIN_CATALOG.map(s => {
            const owned = Store.skinOwned(idx, s[0]), active = skin === s[0];
            return `<button class="skin ${active ? 'active ' : ''}${owned ? '' : 'locked'}" data-skin="${s[0]}">
              <span class="skin-preview">${skinVisual(p, s[0])}</span>
              <small>${s[1]} · ${s[4]}</small>
              <em>${owned ? (active ? '使用中' : '已拥有') : s[3] + '⭐'}</em></button>`;
          }).join('')}
        </div>
      </div>`;
    el.querySelector('#pgBack').onclick = () => { TTS.stop(); location.hash = '#/pets'; };
    el.querySelector('#sayEn').onclick = () => TTS.speak([{ text: p.en, lang: 'en-US' }, { text: p.name, lang: 'zh-CN' }]);
    el.querySelector('#actBuy').onclick = shopModal;
    el.querySelector('#actFeed').onclick = feed;
    el.querySelector('#actDress').onclick = dressModal;
    el.querySelectorAll('#skinList .skin').forEach(b => b.onclick = () => tapSkin(b.dataset.skin));

    /* ---- 投喂：抛物线飞入 + 好感升级（demo 外观 + PRD 数值） ---- */
    function feed() {
      if (!Store.takeFood(idx)) {
        UI.sfx.wrong();
        UI.toast('没有口粮啦，先去商店购粮吧～');
        TTS.speak({ text: '没有食物了，先去商店购买食物吧', lang: 'zh-CN' });
        return;
      }
      UI.sfx.feed();
      const stage = el.querySelector('#petStage');
      const fly = document.createElement('span');
      fly.textContent = p.food[2];
      fly.style.cssText = 'position:absolute;font-size:40px;left:50%;bottom:6px;z-index:5;transition:all .7s cubic-bezier(.5,-.4,.9,.6)';
      stage.appendChild(fly);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fly.style.bottom = '55%'; fly.style.transform = 'scale(.4) rotate(360deg)'; fly.style.opacity = '.9';
      }));
      setTimeout(() => {
        fly.remove();
        const petEl = stage.querySelector('.wear-stack');
        if (petEl) { petEl.style.transition = 'transform .25s'; petEl.style.transform = 'scale(1.25) rotate(8deg)'; setTimeout(() => { petEl.style.transform = ''; }, 300); }
        const prevLv = Store.petLevel(idx);
        Store.addAffection(idx, ECON.feedGain);
        UI.burst(60);
        if (Store.petLevel(idx) > prevLv) {
          UI.sfx.levelup(); UI.burst(160);
          TTS.speak({ text: `${p.name}更喜欢你了！`, lang: 'zh-CN' });
          UI.toast(`${p.name} 好感度升到 Lv${Store.petLevel(idx)} 啦！💕`);
        } else {
          UI.toast(`${p.name}吃得津津有味～`);
        }
        draw();
      }, 700);
    }

    /* ---- 购粮弹层（补 demo 死链：10 积分/份，扣余额） ---- */
    function shopModal() {
      const atCap = Store.foodCount(idx) >= ECON.foodCap;
      const d = openSheet(`
        <div class="sheet-head"><h3>🛒 ${p.name}的专属粮仓</h3><button class="close" data-x="hide">×</button></div>
        <p class="study-sub">这里只有 <b>${p.name}</b> 爱吃的食物哦</p>
        <div class="sheet-item">
          <span class="food-big">${p.food[2]}</span>
          <div class="sheet-item-main"><b>${p.food[0]} · ${p.food[1]}</b><small>现有 ${Store.foodCount(idx)} 个（上限 ${ECON.foodCap}）</small></div>
          <button class="buy" id="doBuy">${atCap ? '已满' : `🟡${ECON.foodPrice}<br>购买`}</button>
        </div>
        <p class="study-sub" style="margin-top:12px">可用积分：<b style="color:#5875dc">🟡${Store.state.points}</b>（购买只扣积分，不影响累计解锁进度）`);
      d.el.querySelector('#doBuy').onclick = () => {
        if (atCap) return;
        if (!Store.spendPoints(ECON.foodPrice)) {
          UI.toast('积分还不够，去学习攒一攒吧～');
          TTS.speak({ text: '积分不够啦，去学习可以攒积分哦', lang: 'zh-CN' });
          UI.sfx.wrong(); return;
        }
        Store.addFood(idx, 1);
        UI.sfx.star(); UI.toast('购买成功！');
        draw(); shopModal();   // 刷新弹层内库存/积分数字
      };
    }

    /* ---- 换装弹层（demo openDress 结构） ---- */
    function dressModal() {
      const d = openSheet(`
        <div class="sheet-head"><h3>给 ${p.name} 换装</h3><button class="close" data-x="hide">×</button></div>
        <p class="study-sub" style="margin:10px 0 4px">每只动物专属 8 套成品图：4 套原色、4 套彩色 · 当前 ⭐ ${Store.state.stars}</p>
        <div class="dress-grid">
          ${SKIN_CATALOG.map(s => {
            const owned = Store.skinOwned(idx, s[0]), active = Store.curSkin(idx) === s[0];
            return `<button class="dress-card ${active ? 'active ' : ''}${owned ? '' : 'locked'}" data-skin="${s[0]}">
              <span class="dress-preview">${skinVisual(p, s[0])}</span>
              <b>${s[1]}</b><small>${s[4]} · ${owned ? (active ? '正在穿着' : '点击切换') : s[3] + ' ⭐ 解锁'}</small></button>`;
          }).join('')}
        </div>`);
      d.el.querySelectorAll('.dress-card').forEach(b => b.onclick = () => { d.close(); tapSkin(b.dataset.skin); });
    }

    /* ---- 星星购皮肤 / 穿戴 ---- */
    function tapSkin(skinId) {
      const cat = SKIN_CATALOG.find(x => x[0] === skinId);
      if (!cat) return;
      if (!Store.skinOwned(idx, skinId)) {
        if (Store.state.stars < cat[3]) {
          UI.sfx.wrong();
          UI.toast('星星还不够，完成学习就能解锁这套皮肤');
          return;
        }
        Store.spendStars(cat[3]);
        Store.buySkin(idx, skinId);
        Store.equipSkin(idx, skinId);
        UI.burst(120); UI.sfx.star();
        TTS.speak({ text: `哇！${cat[1]}！${p.name}变得更漂亮了！`, lang: 'zh-CN' });
        UI.toast('已解锁并穿上 ' + cat[1]);
        draw(); return;
      }
      if (Store.curSkin(idx) === skinId) return;
      Store.equipSkin(idx, skinId);
      UI.sfx.pop();
      UI.toast(skinId === 'forest' ? '已换回自然森林套装' : '已穿上 ' + cat[1]);
      draw();
    }
  };
  draw();
};

/* ---------- ⑤ 家长中心（demo 三卡 + 存档备份 + 家长门） ---------- */
Pages.parent = (el, arg, done) => {
  /* 简易家长门：防止孩子自行修改管控 */
  const gate = sessionStorage.getItem('parentOK');
  if (!gate) {
    const a = 7 + Math.random() * 9 | 0, b = 6 + Math.random() * 8 | 0;
    el.innerHTML = `
      <div class="gate">
        <div class="emoji">🔒</div>
        <h2>家长请验证</h2>
        <p>请输入答案，进入家长中心</p>
        <div class="q">${a} + ${b} = ?</div>
        <input id="ans" inputmode="numeric" autocomplete="off" />
        <div class="flow-btns" style="margin:14px 0 0"><button class="primary" id="ok">确认</button></div>
      </div>`;
    const chk = () => {
      if (+el.querySelector('#ans').value === a + b) { sessionStorage.setItem('parentOK', '1'); Pages.parent(el, arg, done); }
      else UI.toast('答案不对哦，再算一算');
    };
    el.querySelector('#ok').onclick = chk;
    el.querySelector('#ans').onkeydown = e => { if (e.key === 'Enter') chk(); };
    return;
  }
  const s = Store.state, st = Store.stats();
  const fmtMin = Math.max(s.minutes, Math.floor(s.seconds / 60));
  el.innerHTML = `
    <div class="sub-top back-row"><button class="back" id="pgBack">‹</button>
      <div><h1>家长中心</h1><small>陪伴每一点小小成长 · 数据仅保存在本机</small></div></div>

    <div class="parent-card"><h3>本周学习小报告</h3>
      <div class="stats">
        <div class="stat"><b>${st.learned.letters}</b><span>已学字母</span></div>
        <div class="stat"><b>${st.learned.words}</b><span>已学单词</span></div>
        <div class="stat"><b>${st.learned.hanzi}</b><span>已学汉字</span></div>
        <div class="stat"><b>${st.learned.pinyin}</b><span>已学拼音</span></div>
        <div class="stat"><b>${fmtMin}min</b><span>总学习时长</span></div>
      </div></div>

    <div class="parent-card"><h3>宠物养成数据</h3>
      <div class="stats">
        <div class="stat"><b>${st.petsUnlocked} / 26</b><span>已解锁宠物</span></div>
        <div class="stat"><b>${st.stars} ⭐</b><span>星星余额</span></div>
        <div class="stat"><b>${st.lifetime}</b><span>累计积分</span></div>
        <div class="stat"><b>Lv.${st.avgLevel}</b><span>平均好感等级</span></div>
        <div class="stat"><b>${st.foodTotal}</b><span>食物库存总量</span></div>
      </div></div>

    <div class="parent-card"><h3>使用设置</h3>
      <div class="setting"><div>每日学习时长<small id="timerHint">本次学习 ${s.timer} 分钟后温柔提醒休息</small></div>
        <div class="timer-btns" id="timerBtns">${[5, 10, 15].map(m => `<button class="timer-btn ${s.timer === m ? 'active' : ''}" data-min="${m}">${m}分钟</button>`).join('')}</div></div>
      <div class="setting"><div>动画效果<small>低配设备可以关闭</small></div>
        <button class="switch ${s.motion ? 'on' : ''}" id="motionSwitch"><i></i></button></div>
      <div class="setting"><div>纯净模式<small>无广告 · 无外部跳转 · 正向鼓励</small></div>
        <button class="switch ${s.clean ? 'on' : ''}" id="cleanSwitch"><i></i></button></div>
      <button class="primary" style="margin-top:14px;background:#f0f3f8;color:#8290a4" id="rstBtn">重置本机体验数据</button>
    </div>

    <div class="parent-card"><h3>💾 存档备份（换设备时迁移）</h3>
      <p style="font-size:11px;color:#8b98aa;margin-bottom:10px">导出存档码保存到安全的地方，在新设备粘贴即可恢复。</p>
      <div class="data-btns">
        <button class="data-btn d-export" id="exp"><span class="db-em">📤</span>导出存档码</button>
        <button class="data-btn d-import" id="imp"><span class="db-em">📥</span>导入存档码</button>
      </div>
    </div>`;

  el.querySelector('#pgBack').onclick = () => { TTS.stop(); location.hash = '#/home'; };
  el.querySelectorAll('#timerBtns .timer-btn').forEach(b => b.onclick = () => {
    Store.state.timer = +b.dataset.min; Store.save();
    if (window.sessionSecReset) window.sessionSecReset();
    UI.toast(`已设置为 ${b.dataset.min} 分钟，今天会温柔提醒休息`);
    Pages.parent(el, arg, done);
  });
  el.querySelector('#motionSwitch').onclick = () => {
    Store.state.motion = !Store.state.motion; Store.save();
    applyMotion();
    UI.toast(Store.state.motion ? '动画效果已开启' : '动画效果已关闭');
    Pages.parent(el, arg, done);
  };
  el.querySelector('#cleanSwitch').onclick = () => {
    Store.state.clean = !Store.state.clean; Store.save();
    UI.toast(Store.state.clean ? '纯净模式已开启' : '纯净模式已关闭');
    Pages.parent(el, arg, done);
  };
  el.querySelector('#rstBtn').onclick = () => {
    const d = openSheet(`<div class="sheet-head"><h3>⚠️ 确认重置？</h3><button class="close" data-x="hide">×</button></div>
      <p class="study-sub">将清空所有学习进度、星星、积分和宠物养成数据，无法恢复</p>
      <div class="btns"><button class="primary ghost" data-x="no">取消</button>
        <button class="primary" data-x="yes" style="background:#ef7b7b">确认重置</button></div>`);
    d.el.querySelector('[data-x="no"]').onclick = () => d.close();
    d.el.querySelector('[data-x="yes"]').onclick = () => { Store.reset(); d.close(); UI.toast('已重置'); setTimeout(() => location.hash = '#/home', 500); };
  };
  el.querySelector('#exp').onclick = () => {
    const code = Store.exportCode();
    const d = openSheet(`<div class="sheet-head"><h3>📤 存档码</h3><button class="close" data-x="hide">×</button></div>
      <p class="study-sub">长按复制，妥善保管</p>
      <textarea class="export-ta" readonly id="ta">${code}</textarea>
      <div class="btns"><button class="primary" data-x="copy">📋 复制</button></div>`);
    d.el.querySelector('[data-x="copy"]').onclick = () => { navigator.clipboard.writeText(code).then(() => UI.toast('已复制 ✅')); };
  };
  el.querySelector('#imp').onclick = () => {
    const d = openSheet(`<div class="sheet-head"><h3>📥 导入存档</h3><button class="close" data-x="hide">×</button></div>
      <p class="study-sub">粘贴之前导出的存档码</p>
      <textarea class="export-ta" id="ta"></textarea>
      <div class="btns"><button class="primary" data-x="do">恢复</button></div>`);
    d.el.querySelector('[data-x="do"]').onclick = () => {
      if (Store.importCode(d.el.querySelector('#ta').value)) { d.close(); UI.toast('恢复成功 🎉'); location.hash = '#/home'; }
      else UI.toast('存档码不正确哦');
    };
  };
};

/* 动效开关：body.no-motion + 去阴影（demo toggleSetting 同款） */
function applyMotion() {
  const on = Store.state.motion;
  document.body.classList.toggle('no-motion', !on);
  document.documentElement.classList.toggle('no-motion', !on);
  document.body.style.setProperty('--shadow', on ? '' : 'none');
}
