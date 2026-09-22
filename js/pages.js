/* ============ 芽芽乐 · 页面渲染（demo 视觉 + 现有玩法与路由） ============ */
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

/* ---------- ① 首页 ---------- */
Pages.home = (el) => {
  const s = Store.state;
  const petN = s.petsUnlocked;
  const curPet = petN > 0 ? PETS[petN - 1] : null;
  const nextPet = petN < 26 ? PETS[petN] : null;
  const need = nextPet ? ECON.unlockAt(petN) : 0;
  const gap = nextPet ? Math.max(0, need - s.lifetimePoints) : 0;
  const d = new Date();
  const tstr = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  const doneMap = (s.daily && s.daily.date === tstr) ? s.daily.done : {};
  const doneN = Store.dailyCount();

  /* 继续学习：优先跳到下一个未通关字母 */
  const keys = LETTERS.map(a => a.L);
  const fu = firstUncleared('letters', keys);
  const goNext = fu < LETTERS.length ? `#/flow/letter/${fu}` : '#/letters';

  el.innerHTML = `
    <div class="hero">
      <h1>${greet()}，<br>小小探险家！</h1>
      <p>今天也一起来学字母、喂宠物吧 🌈</p>
      <div class="hero-row">
        <button class="hero-btn" data-go="${goNext}">▶ 继续学习</button>
        <span class="hero-pet">${curPet ? curPet.em : '🥚'}</span>
      </div>
    </div>

    <div class="section-head"><h2>今天学什么？</h2><button id="rules">🎁 奖励规则</button></div>
    <div class="modules">
      <button class="module m-blue" data-go="#/letters"><b>字母乐园</b><small>26 个字母 · 拼读描红</small><span class="ico">🔤</span><em>英语</em></button>
      <button class="module m-pink" data-go="#/words"><b>单词乐园</b><small>6 大主题 · 看图识词</small><span class="ico">🍎</span><em>英语</em></button>
      <button class="module m-yellow" data-go="#/hanzi"><b>汉字小课堂</b><small>8 组常用字 · 识字描红</small><span class="ico">📖</span><em>汉字</em></button>
      <button class="module m-green" data-go="#/pinyin"><b>拼音小火车</b><small>声母韵母 · 跟读闯关</small><span class="ico">🚂</span><em>拼音</em></button>
    </div>

    <div class="progress-card">
      <div class="progress-head"><b>今日学习进度</b><span>${doneN} / 4 项</span></div>
      <div class="bar"><i style="width:${doneN / 4 * 100}%"></i></div>
      <div class="progress-foot">
        <span${doneMap.letter ? ' style="color:#3c9a73;font-weight:800"' : ''}>🔤 字母</span>
        <span${doneMap.word ? ' style="color:#3c9a73;font-weight:800"' : ''}>🍎 单词</span>
        <span${doneMap.hanzi ? ' style="color:#3c9a73;font-weight:800"' : ''}>📖 汉字</span>
        <span${doneMap.pinyin ? ' style="color:#3c9a73;font-weight:800"' : ''}>🚂 拼音</span>
      </div>
    </div>

    <div class="pet-teaser">
      <div class="pet-teaser-art">${nextPet ? nextPet.em : '🏆'}</div>
      <div class="pet-teaser-main">
        <h3>${nextPet ? `下一位伙伴：${nextPet.name}` : '26 位伙伴全部到家啦！'}</h3>
        <p>${nextPet ? `再攒 <b>${gap}</b> 积分（累计 ${need}）就能见面，累计积分不清零哦` : '快去小屋看看它们的星级装扮吧'}</p>
      </div>
      <button class="pill-btn" data-go="#/pets">${petN}/26 去小屋</button>
    </div>`;

  el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { UI.sfx.tap(); location.hash = b.dataset.go; });
  el.querySelector('#rules').onclick = () => {
    UI.sfx.tap();
    openSheet(`
      <div class="sheet-head"><h3>🎁 奖励规则</h3><button class="close" data-x="hide">✕</button></div>
      <p>学习有奖励 · 只鼓励 · 不惩罚</p>
      <div class="rule">${RULES.map(r => `<div class="rule-row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}</div>`);
  };
  setTimeout(() => TTS.speak({ text: `${greet()}！欢迎来到芽芽乐中英双语启蒙小屋！`, lang: 'zh-CN' }), 600);
};

/* ---------- ② 模块列表页通用：demo lesson 行列表 + 圆片筛选 ---------- */
function firstUncleared(mapName, keys) {
  for (let i = 0; i < keys.length; i++) if (!Store.cleared(mapName, keys[i])) return i;
  return keys.length;
}

/* rows: [{ icon, name, sub, state:'done|cur|next|lock', key }] */
function lessonPage(el, { title, sub, emoji, grad, filters, getRows, onOpen }) {
  let fi = filters ? 0 : -1;
  el.innerHTML = `
    <div class="sub-top back-row"><button class="back" id="pgBack">‹</button>
      <div><h1>${title}</h1><small>${sub}</small></div></div>
    <div class="learn-hero ${grad}"><h2>${title}</h2><p>${sub}</p><div class="learn-hero-art">${emoji}</div></div>
    ${filters ? '<div class="lesson-filter" id="flt"></div>' : ''}
    <div class="lesson-list" id="lst"></div>`;
  el.querySelector('#pgBack').onclick = () => { TTS.stop(); location.hash = '#/home'; };

  const list = el.querySelector('#lst');
  function paintFilter() {
    if (!filters) return;
    const f = el.querySelector('#flt');
    f.innerHTML = filters.map((n, k) => `<button class="${k === fi ? 'active' : ''}" data-f="${k}">${n}</button>`).join('');
    f.querySelectorAll('button').forEach(b => b.onclick = () => { fi = +b.dataset.f; UI.sfx.tap(); paintFilter(); paintList(); });
  }
  function paintList() {
    const rows = getRows(fi);
    list.innerHTML = '';
    rows.forEach(r => {
      const b = document.createElement('button');
      b.className = 'lesson';
      b.innerHTML = `
        <span class="lesson-icon">${r.icon}</span>
        <span class="lesson-main"><b>${r.name}</b><small>${r.sub}</small></span>
        <span class="act ${r.state === 'done' ? 'done' : r.state === 'lock' ? 'lock' : ''}">${
          r.state === 'done' ? '再练' : r.state === 'lock' ? '🔒' : r.state === 'next' ? '开始' : '学习'}</span>`;
      b.onclick = () => {
        if (r.state === 'lock') {
          UI.sfx.wrong(); UI.toast('先完成前面的关卡吧～');
          TTS.speak({ text: '我们先完成前面的关卡吧', lang: 'zh-CN' }); return;
        }
        UI.sfx.pop(); onOpen(r);
      };
      list.appendChild(b);
    });
  }
  paintFilter(); paintList();
}

/* ---------- 字母乐园（A→Z 顺序解锁） ---------- */
Pages.letters = (el) => {
  const keys = LETTERS.map(a => a.L);
  const fu = firstUncleared('letters', keys);
  lessonPage(el, {
    title: '🔤 字母乐园', sub: 'A→Z 顺序解锁 · 每关 2 个好朋友单词', emoji: '🔤', grad: 'linear-gradient(135deg,#dcf1ff,#e8ecff)',
    getRows: () => LETTERS.map((a, ii) => ({
      icon: a.L, name: `字母 ${a.L} ${a.L.toLowerCase()}`,
      sub: `${a.L} says /${a.ph}/ · ${a.words[0][0]} ${a.words[1][0]}`,
      state: ii < fu ? 'done' : ii === fu ? 'next' : 'lock', key: ii,
    })),
    onOpen: r => location.hash = `#/flow/letter/${r.key}`,
  });
};

/* ---------- 单词乐园（主题圆片切换，主题分批开放） ---------- */
Pages.words = (el) => {
  const doneCount = ti => WORD_THEMES[ti].words.filter((_, wi) => Store.cleared('words', `${ti}_${wi}`)).length;
  lessonPage(el, {
    title: '🍎 单词乐园', sub: '看图识词 · 拆分拼读 · 闯关巩固（英语产出星星⭐）', emoji: '🍎', grad: 'linear-gradient(135deg,#ffe7ea,#fff3d6)',
    filters: WORD_THEMES.map(t => t.name),
    getRows: (fi) => WORD_THEMES[fi].words.map((w, wi) => {
      const themeOpen = fi === 0 || doneCount(fi - 1) >= WORD_THEMES[fi - 1].words.length;
      return {
        icon: w[2], name: w[0], sub: `${w[1]} · 主题「${WORD_THEMES[fi].name}」`,
        state: !themeOpen ? 'lock' : Store.cleared('words', `${fi}_${wi}`) ? 'done' : 'cur', key: `${fi}_${wi}`,
      };
    }),
    onOpen: r => location.hash = `#/flow/word/${r.key}`,
  });
};

/* ---------- 拼音小火车（全局顺序解锁，五类圆片切换） ---------- */
Pages.pinyin = (el) => {
  const flat = []; PINYIN_GROUPS.forEach((g, gi) => g.items.forEach((_, ii) => flat.push(`${gi}_${ii}`)));
  const fu = firstUncleared('pinyin', flat);
  lessonPage(el, {
    title: '🚂 拼音小火车', sub: '发音认知 · 口型示意 · 跟读闯关（产出积分🟡）', emoji: '🗣️', grad: 'linear-gradient(135deg,#dff6e7,#dcf1ff)',
    filters: PINYIN_GROUPS.map(g => g.name),
    getRows: (gi) => PINYIN_GROUPS[gi].items.map((p, ii) => {
      let idx = 0;
      for (let a = 0; a < gi; a++) idx += PINYIN_GROUPS[a].items.length;
      idx += ii;
      return {
        icon: p[0], name: `拼音 ${p[0]}`, sub: `${p[1]} · ${p[2]}`,
        state: idx < fu ? 'done' : idx === fu ? 'next' : 'lock', key: `${gi}_${ii}`,
      };
    }),
    onOpen: r => location.hash = `#/flow/pinyin/${r.key}`,
  });
};

/* ---------- 汉字小课堂（分组解锁，组内自由） ---------- */
Pages.hanzi = (el) => {
  const doneCount = gi => HANZI_GROUPS[gi].items.filter((_, ii) => Store.cleared('hanzi', `${gi}_${ii}`)).length;
  lessonPage(el, {
    title: '📖 汉字小课堂', sub: '看图释义 · 汉字描红 · 跟读闯关（产出积分🟡）', emoji: '📖', grad: 'linear-gradient(135deg,#fff1c8,#ffe7e8)',
    filters: HANZI_GROUPS.map(g => g.name),
    getRows: (gi) => HANZI_GROUPS[gi].items.map((h, ii) => {
      const open = gi === 0 || doneCount(gi - 1) >= HANZI_GROUPS[gi - 1].items.length;
      return {
        icon: h[0], name: `汉字 ${h[0]}`, sub: `${h[1]} · ${h[2]}`,
        state: !open ? 'lock' : Store.cleared('hanzi', `${gi}_${ii}`) ? 'done' : 'cur', key: `${gi}_${ii}`,
      };
    }),
    onOpen: r => location.hash = `#/flow/hanzi/${r.key}`,
  });
};

/* ---------- ③ 学习流程页（四大模块共用） ---------- */
Pages.flow = (el, arg) => {
  const [module, id] = arg.split('/');
  let item;
  try {
    if (module === 'letter') item = letterItem(+id);
    else if (module === 'word') { const [a, b] = id.split('_').map(Number); item = wordItem(a, b); }
    else if (module === 'pinyin') { const [a, b] = id.split('_').map(Number); item = pinyinItem(a, b); }
    else { const [a, b] = id.split('_').map(Number); item = hanziItem(a, b); }
  } catch (e) { return location.hash = '#/home'; }
  const backMap = { letter: '#/letters', word: '#/words', pinyin: '#/pinyin', hanzi: '#/hanzi' };
  el.innerHTML = `<div class="sub-top"><div><h1 style="font-size:18px">${item.title}</h1><small>一步一步慢慢来，学完有奖励哦</small></div></div>`;
  const box = document.createElement('div'); el.appendChild(box);
  startLearnFlow(item, box, backMap[item.module]);
};

/* ---------- ④ 宠物小屋 ---------- */
Pages.pets = (el) => {
  const s = Store.state;
  const nextIdx = s.petsUnlocked;
  const need = nextIdx < 26 ? ECON.unlockAt(nextIdx) : 0;
  const pct = nextIdx < 26 ? Math.min(100, s.lifetimePoints / need * 100) : 100;
  el.innerHTML = `
    <div class="sub-top"><div><h1>宠物小屋</h1><small>累计积分自动解锁 · 积分不清零</small></div></div>
    <div class="pets-wrap">
      <div class="pet-banner">
        <div><h2>${nextIdx ? PETS[nextIdx - 1].name : ''}在等你 🎈</h2><p>已迎接 <strong>${nextIdx}/26</strong> 位小伙伴</p></div>
        <div class="pet-banner-art">${nextIdx ? PETS[nextIdx - 1].em : '🏡'}</div>
      </div>
      <div class="pet-progress">
        <div style="display:flex;justify-content:space-between"><span>当前累计积分</span><strong>🟡 ${s.lifetimePoints}</strong></div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <div style="display:flex;justify-content:space-between;margin-top:7px">
          <span>${nextIdx < 26 ? `下一位「${PETS[nextIdx].name}」需 ${need}` : '全部解锁完成！'}</span>
          <span>⭐ ${s.stars} 可换皮肤</span></div>
      </div>
      <div class="pet-grid">
        ${PETS.map((p, i) => {
          if (Store.isUnlocked(i)) {
            const pd = Store.pet(i);
            return `<button class="pet" data-i="${i}">
              <span class="pet-art"><span class="anim">${p.em}</span></span>
              <b>${p.name}</b><small class="plv">好感 Lv${pd.lv}${pd.skins.length > 1 ? ' 👑' : ''}</small></button>`;
          }
          if (i === nextIdx) {
            const p2 = Math.min(100, s.lifetimePoints / need * 100);
            return `<button class="pet next" data-i="${i}"><span class="lock">🔒</span>
              <span class="pet-art">${p.em}</span><b>${p.name}</b>
              <small>${s.lifetimePoints}/${need}</small>
              <div class="unlock-bar"><i style="width:${p2}%"></i></div></button>`;
          }
          return `<div class="pet locked"><span class="lock">🔒</span>
            <span class="pet-art">${p.em}</span><b>${p.name}</b><small>先解锁上一只</small></div>`;
        }).join('')}
      </div>
    </div>`;
  el.querySelectorAll('.pet[data-i]').forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    if (Store.isUnlocked(i)) { UI.sfx.tap(); location.hash = `#/pet/${i}`; }
    else {
      UI.sfx.wrong();
      UI.toast(`再攒 ${Math.max(0, ECON.unlockAt(i) - s.lifetimePoints)} 积分就能解锁啦！`);
      TTS.speak({ text: `再攒一点积分就能解锁${PETS[i].name}啦，加油！`, lang: 'zh-CN' });
    }
  });
  setTimeout(() => UI.checkUnlockCelebration(), 400);
};

/* ---------- ⑤ 宠物详情页（购粮/投喂/换装一站式） ---------- */
Pages.pet = (el, arg) => {
  const idx = +arg;
  if (!Store.isUnlocked(idx)) return location.hash = '#/pets';
  const p = PETS[idx];
  const draw = () => {
    const pd = Store.pet(idx);
    const [fn, fe, fem] = p.food;
    const stock = Store.foodCount(fn);
    const lvMax = pd.lv >= ECON.maxLevel;
    const afPct = lvMax ? 100 : pd.af;
    const skin = SKINS[pd.cur];
    el.innerHTML = `
      <div class="sub-top back-row"><button class="back" id="back">‹</button>
        <div><h1 style="font-size:18px">${p.name}</h1><small>${p.L} is for ${p.en}</small></div>
        <span style="margin-left:auto;font-weight:900;color:#e2708c">Lv${pd.lv}${lvMax ? ' MAX' : ''}</span></div>
      <div class="detail">
        <div class="detail-hero" id="stage">
          <span class="big-pet" id="petEm">${p.em}${skin.hat ? `<span class="hat">${skin.hat}</span>` : ''}</span>
          <h2>${p.name} <button class="play-word" id="sayEn" style="display:inline-block;margin:0;padding:5px 10px;font-size:11px">${p.en} 🔊</button></h2>
          <p>最爱吃：${fem} ${fn}（${fe}）</p>
          <div class="heart-bar"><span>${'♥'.repeat(pd.lv)}${'♡'.repeat(ECON.maxLevel - pd.lv)} 好感度 ${lvMax ? '满满的爱 💕' : `${pd.af}/100`}</span>
            <div class="bar"><i style="width:${afPct}%"></i></div></div>
        </div>
        <div class="detail-card">
          <h2>🍽️ 专属小厨房</h2>
          <div class="food-line" style="margin-top:10px">
            <span class="food-icon">${fem}</span>
            <div><b>${fn} · ${fe}</b><small>只有它爱吃这个哦，别的食物不能投喂～</small></div>
            <div class="food-count">${stock}<br><small>库存</small></div>
          </div>
        </div>
        <div class="detail-actions">
          <button class="a-buy" id="buy">🛒 购粮<br>🟡${ECON.foodPrice}</button>
          <button class="a-feed" id="feed" ${stock ? '' : 'disabled'}>🍽️ 投喂<br>+${ECON.feedGain} 好感</button>
          <button class="a-dress" id="dress">👑 换装<br>⭐${SKIN_COST}</button>
        </div>
        <div class="detail-card">
          <h2>👑 服装间</h2>
          <div class="skins">
            ${SKINS.map((sk, k) => {
              const owned = pd.skins.includes(k);
              return `<button class="skin ${pd.cur === k ? 'active' : owned ? '' : 'locked'}" data-k="${k}">
                <span class="spreview">${p.em}${sk.hat ? `<span class="hat">${sk.hat}</span>` : ''}</span>
                <b>${sk.name}</b><small>${sk.desc}</small>
                <em>${pd.cur === k ? '使用中' : owned ? '点击穿上' : `⭐${SKIN_COST} 兑换`}</em></button>`;
            }).join('')}
          </div>
        </div>
      </div>`;
    el.querySelector('#back').onclick = () => { TTS.stop(); location.hash = '#/pets'; };
    el.querySelector('#sayEn').onclick = () => TTS.speak([{ text: p.en, lang: 'en-US' }, { text: p.name, lang: 'zh-CN' }]);
    el.querySelector('#buy').onclick = () => shopModal();
    el.querySelector('#feed').onclick = () => feed();
    el.querySelectorAll('.skin').forEach(b => b.onclick = () => dress(+b.dataset.k));

    /* ---- 投喂：抛物线飞入 + 弹跳 + 粒子 ---- */
    function feed() {
      if (!Store.takeFood(fn)) {
        UI.toast('没有口粮啦，快去商店购买食物吧～');
        TTS.speak({ text: '没有食物了，快去商店购买食物吧', lang: 'zh-CN' });
        return;
      }
      UI.sfx.feed();
      const stage = el.querySelector('#stage'), petEl = el.querySelector('#petEm');
      const fly = document.createElement('span');
      fly.textContent = fem;
      fly.style.cssText = 'position:absolute;font-size:40px;left:50%;bottom:6px;z-index:5;transition:all .7s cubic-bezier(.5,-.4,.9,.6)';
      stage.appendChild(fly);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fly.style.bottom = '55%'; fly.style.transform = 'scale(.4) rotate(360deg)'; fly.style.opacity = '.9';
      }));
      setTimeout(() => {
        fly.remove();
        petEl.style.transition = 'transform .25s'; petEl.style.transform = 'scale(1.25) rotate(8deg)';
        UI.burst(60);
        setTimeout(() => { petEl.style.transform = ''; }, 300);
        /* 好感成长判定 */
        if (pd.lv < ECON.maxLevel) {
          pd.af += ECON.feedGain;
          if (pd.af >= 100) {
            pd.af -= 100; pd.lv++;
            Store.addStars(ECON.levelUpStars);
            UI.glowFlash(); UI.sfx.levelup(); UI.burst(180);
            Store.save();
            const d = openSheet(`<div class="sheet-head"><h3>好感升级！</h3><button class="close" data-x="hide">💕</button></div>
              <span class="d-em">${p.em}💕</span>
              <p><b>${p.name}</b> 更喜欢你了，升到 <b>Lv${pd.lv}</b>！<br>奖励 ⭐×${ECON.levelUpStars}${pd.lv === ECON.maxLevel ? '<br>已达满级，收获满满的爱！' : ''}</p>`,
              { dismissable: false });
            const b = document.createElement('button'); b.className = 'primary'; b.style.margin = '14px auto 0'; b.textContent = '开心！';
            b.onclick = () => { d.close(); draw(); };
            d.el.appendChild(b);
            TTS.speak({ text: `${p.name}更喜欢你了！`, lang: 'zh-CN' });
            return;
          }
        } else pd.af = 100;
        Store.save(); draw();
        UI.toast(`${p.name}吃得津津有味～`);
      }, 700);
    }

    /* ---- 购粮弹层：只卖这只宠物的专属食物 ---- */
    function shopModal() {
      const s = Store.state;
      const atCap = Store.foodCount(fn) >= ECON.foodCap;
      const d = openSheet(`
        <div class="sheet-head"><h3>🛒 ${p.name}的专属粮仓</h3><button class="close" data-x="hide">✕</button></div>
        <p>这里只有 <b>${p.name}</b> 爱吃的食物哦</p>
        <div class="sheet-item">
          <span class="food-big">${fem}</span>
          <div class="sheet-item-main"><b>${fn} · ${fe}</b><small>现有 ${Store.foodCount(fn)} 个（上限 ${ECON.foodCap}）</small></div>
          <button class="buy ${atCap ? 'disabled' : ''}" data-x="buy">${atCap ? '已满' : `🟡${ECON.foodPrice}<br>购买`}</button>
        </div>
        <p style="margin-top:12px">可用积分：<b style="color:#5875dc">🟡${s.points}</b>（购买只扣积分，不影响累计解锁进度）`);
      const buy = d.el.querySelector('[data-x="buy"]');
      buy.onclick = () => {
        if (atCap) return;
        if (!Store.spendPoints(ECON.foodPrice)) {
          UI.toast('积分还不够，去闯关攒一攒吧～');
          TTS.speak({ text: '积分不够啦，去学习闯关攒积分吧', lang: 'zh-CN' });
          UI.sfx.wrong(); return;
        }
        Store.addFood(fn, 1);
        UI.sfx.star(); UI.toast('购买成功！');
        draw(); shopModal();   // 重绘页面并刷新商店弹层内的库存/积分数字
      };
    }

    /* ---- 换装（皮肤栏直接点击） ---- */
    function dress(k) {
      if (pd.cur === k) return;
      const sk = SKINS[k];
      const owned = pd.skins.includes(k);
      if (!owned) {
        if (!Store.spendStars(SKIN_COST)) {
          UI.toast('星星不够，去英文关卡攒星星吧～');
          TTS.speak({ text: '星星不够啦，闯英文关卡可以攒星星哦', lang: 'zh-CN' });
          UI.sfx.wrong(); return;
        }
        pd.skins.push(k);
        UI.burst(120); UI.sfx.star();
        TTS.speak({ text: `哇！${sk.name}！${p.name}变得更漂亮了！`, lang: 'zh-CN' });
      } else UI.sfx.pop();
      pd.cur = k; Store.save();
      /* 换装闪光旋转动效后重绘 */
      const petEl = el.querySelector('#petEm');
      if (Store.state.settings.anim && petEl) {
        petEl.style.transition = 'transform .8s, filter .8s';
        petEl.style.transform = 'rotate(360deg) scale(1.2)';
        petEl.style.filter = 'drop-shadow(0 0 24px gold)';
        setTimeout(() => draw(), 650);
      } else draw();
    }
  };
  draw();
};

/* ---------- ⑥ 家长中心 ---------- */
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
  const st = Store.stats();
  const mm = Math.floor(st.seconds / 60), fmt = mm >= 60 ? `${Math.floor(mm / 60)} 小时 ${mm % 60} 分` : `${mm} 分钟`;
  el.innerHTML = `
    <div class="sub-top"><div><h1>👨‍👩‍👧 家长中心</h1><small>数据仅保存在本机浏览器 · 纯净无广告</small></div></div>

    <div class="parent-card"><h3>📊 学习小报告</h3>
      <div class="stats">
        <div class="stat"><b>${st.letters}/26</b><span>已学英文字母</span></div>
        <div class="stat"><b>${st.words}</b><span>已学英文单词</span></div>
        <div class="stat"><b>${st.hanzi}</b><span>已学汉字</span></div>
        <div class="stat"><b>${st.pinyin}</b><span>已学拼音</span></div>
        <div class="stat"><b>${fmt}</b><span>总学习时长</span></div>
      </div></div>

    <div class="parent-card"><h3>🐾 宠物养成数据</h3>
      <div class="stats">
        <div class="stat"><b>${st.petsUnlocked}/26</b><span>已解锁宠物</span></div>
        <div class="stat"><b>Lv ${st.avgLv}</b><span>宠物平均好感等级</span></div>
        <div class="stat"><b>⭐${st.stars} / 🟡${st.points}</b><span>星星 / 可用积分</span></div>
        <div class="stat"><b>${st.foodTotal}</b><span>食物库存总量</span></div>
      </div></div>

    <div class="parent-card"><h3>⏰ 使用设置</h3>
      <div class="setting"><div>防沉迷时长管控<small>到时间后休息提醒，需家长解除</small></div>
        <div class="timer-btns" id="limit">${[0, 5, 10, 15].map(m => `<button data-m="${m}" class="timer-btn ${Store.state.settings.limit === m ? 'active' : ''}">${m === 0 ? '不限' : m + ' 分'}</button>`).join('')}</div></div>
      <div class="setting"><div>动效全开<small>低配设备或易兴奋的孩子建议关闭</small></div>
        <button class="switch ${Store.state.settings.anim ? 'on' : ''}" id="anim"><i></i></button></div>
      <div class="setting" style="border-top:0;display:block">
        <div class="pure-badge" style="margin-top:8px"><span>✅ 无广告</span><span>✅ 无长视频</span><span>✅ 无负面惩罚</span><span>✅ 无外部跳转</span><span>✅ 免费养成</span></div></div>
    </div>

    <div class="parent-card"><h3>💾 存档备份（换设备时迁移）</h3>
      <p style="font-size:11px;color:#8b98aa;margin-bottom:10px">导出存档码保存到安全的地方，在新设备粘贴即可恢复。</p>
      <div class="data-btns">
        <button class="data-btn d-export" id="exp"><span class="db-em">📤</span>导出存档码</button>
        <button class="data-btn d-import" id="imp"><span class="db-em">📥</span>导入存档码</button>
        <button class="data-btn d-reset" id="rst"><span class="db-em">🗑️</span>重置全部数据</button>
      </div>
    </div>`;

  el.querySelectorAll('#limit .timer-btn').forEach(b => b.onclick = () => {
    Store.state.settings.limit = +b.dataset.m; Store.save();
    el.querySelectorAll('#limit .timer-btn').forEach(x => x.classList.toggle('active', x === b));
    UI.toast(b.dataset.m === '0' ? '已关闭时长管控' : `已设置 ${b.dataset.m} 分钟休息提醒`);
    window.sessionSecReset && window.sessionSecReset();
  });
  el.querySelector('#anim').onclick = function () {
    Store.state.settings.anim = !Store.state.settings.anim; Store.save();
    this.classList.toggle('on', Store.state.settings.anim);
    document.documentElement.classList.toggle('no-anim', !Store.state.settings.anim);
  };
  el.querySelector('#exp').onclick = () => {
    const code = Store.exportCode();
    const d = openSheet(`<div class="sheet-head"><h3>📤 存档码</h3><button class="close" data-x="hide">✕</button></div>
      <p>长按复制，妥善保管</p>
      <textarea class="export-ta" readonly id="ta">${code}</textarea>
      <div class="btns"><button class="primary" data-x="copy">📋 复制</button></div>`);
    d.el.querySelector('[data-x="copy"]').onclick = () => { navigator.clipboard.writeText(code).then(() => UI.toast('已复制 ✅')); };
  };
  el.querySelector('#imp').onclick = () => {
    const d = openSheet(`<div class="sheet-head"><h3>📥 导入存档</h3><button class="close" data-x="hide">✕</button></div>
      <p>粘贴之前导出的存档码</p>
      <textarea class="export-ta" id="ta"></textarea>
      <div class="btns"><button class="primary" data-x="do">恢复</button></div>`);
    d.el.querySelector('[data-x="do"]').onclick = () => {
      if (Store.importCode(d.el.querySelector('#ta').value)) { d.close(); UI.toast('恢复成功 🎉'); location.hash = '#/home'; }
      else UI.toast('存档码不正确哦');
    };
  };
  el.querySelector('#rst').onclick = () => {
    const d = openSheet(`<div class="sheet-head"><h3>⚠️ 确认重置？</h3><button class="close" data-x="hide">✕</button></div>
      <p>将清空所有学习进度、星星、积分和宠物养成数据，无法恢复</p>
      <div class="btns"><button class="primary ghost" data-x="no">取消</button>
        <button class="primary" data-x="yes" style="background:#ef7b7b">确认重置</button></div>`);
    d.el.querySelector('[data-x="no"]').onclick = () => d.close();
    d.el.querySelector('[data-x="yes"]').onclick = () => { Store.reset(); d.close(); UI.toast('已重置'); setTimeout(() => location.hash = '#/home', 500); };
  };
};
