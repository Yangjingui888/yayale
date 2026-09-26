/* ============ 芽芽乐 · 五页路由（demo 模型：home / learn / pets / detail / parent，练习走底部弹层） ============ */
const Pages = {};

/* 打开底部弹层并自动绑定右上角关闭按钮 */
function openSheet(html, opts) {
  const d = UI.dialog(html, opts);
  const x = d.el.querySelector('[data-x="hide"]');
  if (x) x.onclick = () => { UI.sfx.tap(); d.close(); };
  decoratePasswordInputs(d.el);
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
  const done = Math.min(MODULE_TOTAL, s.completed.length);

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
      <button class="module m-lavender" data-go="#/learn/hanzi"><em>汉字</em><b>汉字小课堂</b><small>描一描 · 认一认</small><span class="ico">🖌️</span></button>
      <button class="module m-green" data-go="#/learn/pinyin"><em>拼音</em><b>拼音小火车</b><small>听音来拼读</small><span class="ico">🚂</span></button>
      <button class="module m-orange" data-go="#/learn/math"><em>数学</em><b>数学乐园</b><small>数数 · 口算 · 口诀</small><span class="ico">🔢</span></button>
      <button class="module m-rose" data-go="#/learn/chengyu"><em>成语</em><b>成语接龙</b><small>《登鹳雀楼》20 字龙头</small><span class="ico">🐉</span></button>
    </div>

    <div class="progress-card">
      <div class="progress-head"><b>今日学习进度</b><span>${done} / ${MODULE_TOTAL} 项</span></div>
      <div class="bar"><i style="width:${done * (100 / MODULE_TOTAL)}%"></i></div>
      <div class="progress-foot"><span>${done >= MODULE_TOTAL ? '今天的学习任务完成啦，明天见！' : '完成一关，收集你的第一颗星星'}</span><span>答题有奖励</span></div>
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
  letters: { title: '字母乐园', sub: '跟着小伙伴，一起开口读 · 26 个字母', emoji: '🦊', grad: 'g-blue', steps: '发音认知 → 描红练习 → AI跟读 → 小游戏闯关', filters: ['A-Z', '已学', '待学习'] },
  words:   { title: '单词乐园', sub: '看图识词 · 8 大主题', emoji: '🍎', grad: 'g-pink', steps: '看图认词 → 描红练习 → AI跟读 → 小游戏闯关', filters: null },
  hanzi:   { title: '汉字小课堂', sub: '描一描 · 认一认 · 8 组常用字', emoji: '🖌️', grad: 'g-lavender', steps: '字形认知 → 描红练习 → AI跟读 → 小游戏闯关', filters: null },
  pinyin:  { title: '拼音小火车', sub: '听音来拼读 · 声母韵母', emoji: '🚂', grad: 'g-green', steps: '拼音认知 → 描红练习 → AI跟读 → 小游戏闯关', filters: null },
  math:    { title: '数学乐园', sub: '数数 · 100 以内加减 · 九九乘法表', emoji: '🔢', grad: 'g-orange', steps: '数字认知 → 描一描数字 → 开口认算式 → 口算闯关', filters: null },
  chengyu: { title: '成语接龙', sub: '《登鹳雀楼》20 字龙头 · 每字 12 条成语', emoji: '🐉', grad: 'g-rose', steps: '读整条接龙链 → 描红龙字 → AI跟读成语 → 接龙闯关', filters: null },
};
/* 学习页顶部入口 tab（数学等模块按课时练习集自动回退；字母的「音标」已提升为上方视图切换不入此行；接龙为成语模块专属玩法，不在字母出现） */
const LEARN_TABS = [['trace', '描红'], ['follow', 'AI跟读'], ['sound', '小游戏'], ['chain', '接龙']];
function learnTabsOf(module) {
  return LEARN_TABS.filter(t => t[0] !== 'chain' || module !== 'letters');
}

/* ---------- 音标音频播放（字母乐园「音标」页签专用，页面级小工具） ----------
   真人音素音频优先；加载/播放失败时降级到 TTS 播例词（诚实降级，不静默失败） */
let ipaAudioEl = null;
let ipaQueueSeq = 0;   // 连播队列世代令牌：单点/切页/停播都会作废旧队列
function haltIpaAudio() {   // 只停声，不作废旧队列（供连播内部换曲用）
  if (ipaAudioEl) { try { ipaAudioEl.pause(); } catch (e) {} ipaAudioEl = null; }
}
function stopIpaAudio() {   // 用户主动停止：连播队列一并作废
  ipaQueueSeq++;
  haltIpaAudio();
}
function playIpaAudio(item, cardEl) {
  stopIpaAudio();
  TTS.stop();
  const a = new Audio(ipaAudio(item[1]));
  ipaAudioEl = a;
  const fail = () => {
    if (ipaAudioEl !== a) return;
    ipaAudioEl = null;
    TTS.speak({ text: item[2], lang: 'en-US' });
    UI.toast('音标音频加载失败，改读例词给你听～');
  };
  a.onerror = fail;
  a.play().catch(fail);
  if (cardEl) {
    cardEl.classList.add('playing');
    a.onended = () => { cardEl.classList.remove('playing'); if (ipaAudioEl === a) ipaAudioEl = null; };
  }
  UI.sfx.pop();
}

Pages.learn = (el, module) => {
  if (!LEARN_META[module]) return location.hash = '#/home';
  const meta = LEARN_META[module];
  const filters = meta.filters || ['全部'].concat(
    module === 'words' ? WORD_THEMES.map(t => t.name) :
    module === 'pinyin' ? PINYIN_GROUPS.map(g => g.name) :
    module === 'math' ? MATH_GROUPS.map(g => g.name) :
    module === 'chengyu' ? CHENGYU_GROUPS.map(g => g.em + ' ' + g.name) : HANZI_GROUPS.map(g => g.name));
  let fi = 0;
  el.innerHTML = `
    <div class="sub-top back-row"><button class="back" id="pgBack">‹</button>
      <div><h1>${meta.title}</h1><small>${meta.sub}</small></div></div>
    <div class="learn-hero ${meta.grad}"><h2>${meta.title}</h2><p>${meta.steps}</p><div class="learn-hero-art">${meta.emoji}</div></div>
    ${module === 'letters' ? `<div class="view-switch" id="viewSwitch">
      <button class="active" data-view="letters">A-Z 字母</button>
      <button data-view="ipa">音标</button>
    </div>` : ''}
    <div class="learn-tabs" id="learnTabs">
      <button class="active" data-tab="learn">学习</button>
      ${learnTabsOf(module).map(t => `<button data-tab="${t[0]}">${t[1]}</button>`).join('')}
    </div>
    <div class="lesson-filter" id="flt"></div>
    <div class="lesson-list" id="lessonList"></div>
    <div class="ipa-panel" id="ipaPanel" hidden></div>
    <button class="play-row" id="modPlay" style="width:100%;margin-top:12px"><span>🔊 ${module === 'chengyu' ? '点我听当前课时的成语接龙' : module === 'letters' ? '点我听当前课时发音（音标页连播全体音标）' : '点我听当前模块标准发音'}</span><span class="rp">播放声音</span></button>`;
  el.querySelector('#pgBack').onclick = () => { TTS.stop(); stopIpaAudio(); location.hash = '#/home'; };

  /* 当前课时：第一个未整体完成的行 */
  const list = Learn.LESSONS(module);
  const curIdx = () => { const k = list.findIndex(x => !lessonDone(module, x.id)); return k < 0 ? 0 : k; };

  function categoryOf(x) {
    if (module === 'words') return WORD_THEMES[+String(x.id).split('_')[0]].name;
    if (module === 'pinyin') return PINYIN_GROUPS[+String(x.id).split('_')[0]].name;
    if (module === 'hanzi') return HANZI_GROUPS[+String(x.id).split('_')[0]].name;
    if (module === 'chengyu') return CHENGYU_GROUPS[+String(x.id).split('_')[0]].em + ' ' + CHENGYU_GROUPS[+String(x.id).split('_')[0]].name;
    if (module === 'math') {
      const id = String(x.id);
      return MATH_GROUPS[/^num_/.test(id) ? 0 : /^calc_/.test(id) ? 1 : 2].name;
    }
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
      const icon = module === 'letters' ? x.title.replace('字母 ', '')
        : module === 'pinyin' ? '<span class="dup">' + x.quizLabel + '</span>'
        : module === 'chengyu' ? '<span class="dup">' + x.quizLabel + '</span>'
        : module === 'math' && /^num_/.test(String(x.id)) ? x.quizLabel
        : x.quizVisual;
      const ipaBadge = module === 'letters' && x.ipa ? `<small class="lesson-ipa">/${x.ipa}/</small>` : '';
      const wordChips = (module === 'hanzi' && x.words) ? `<div class="hanzi-words">${x.words.map((w, wi) => `<button class="hw-chip" data-w="${wi}"><span class="hw-py">${w[1]}</span><span class="hw-word">${w[0]}</span></button>`).join('')}</div>` : '';
      row.innerHTML = `
        <div class="lesson-icon${String(icon).length > 4 ? ' wide' : ''}">${icon}</div>
        <div class="lesson-main"><b>${x.title}${ipaBadge}</b><small>${x.sub} · ${done ? '已完成，可无限复习' : '点击开始学习'}</small>${wordChips}</div>
        <button class="lesson-go${done ? ' done' : ''}">${done ? '✓ 再练' : '开始'}</button>`;
      row.querySelector('.lesson-go').onclick = () => { UI.sfx.pop(); Learn.openStudy(module, x.id); };
      if (module === 'hanzi' && x.words) row.querySelectorAll('.hw-chip').forEach(c => c.onclick = (e) => { e.stopPropagation(); UI.sfx.tap(); const w = x.words[+c.dataset.w]; TTS.speak([{ text: w[0], lang: 'zh-CN' }]); });
      lst.appendChild(row);
    });
    if (!lst.children.length) lst.innerHTML = '<p class="study-sub" style="text-align:center;padding:18px">这一类全都练过啦，真棒！换个分类看看吧</p>';
  }
  learnRefresh = () => { paintList(); };

  /* ---------- 音标页签（仅字母模块）：分类筛选 + 48 音素卡片网格 ---------- */
  const ipaPanel = el.querySelector('#ipaPanel');
  let ipaFi = 0;
  const ipaFilters = ['全部'].concat(IPA_GROUPS.map(g => g.name));
  function ipaItems() {
    return ipaFi === 0 ? IPA_GROUPS.flatMap(g => g.items) : IPA_GROUPS[ipaFi - 1].items;
  }
  function paintIpa() {
    ipaPanel.innerHTML = `
      <div class="lesson-filter ipa-flt" id="ipaFlt">${ipaFilters.map((n, k) => `<button class="${k === ipaFi ? 'active' : ''}" data-f="${k}">${n}</button>`).join('')}</div>
      <div class="ipa-grid">${ipaItems().map((it, k) => `
        <div class="ipa-card" data-k="${k}" role="button" tabindex="0">
          <b class="ipa-sym">/${it[0]}/</b>
          <span class="ipa-tag">${ipaFi === 0 ? (IPA_GROUPS.find(g => g.items.includes(it)) || {}).name || '' : IPA_GROUPS[ipaFi - 1].name}</span>
          <button class="ipa-word">${it[2]} · ${it[3]}</button>
        </div>`).join('')}</div>
      <p class="study-sub ipa-tip">点卡片听音标标准读音 · 点下方词语听例词</p>`;
    ipaPanel.querySelectorAll('#ipaFlt button').forEach(b => b.onclick = () => { ipaFi = +b.dataset.f; UI.sfx.tap(); paintIpa(); });
    ipaPanel.querySelectorAll('.ipa-card').forEach((c, k) => {
      const it = ipaItems()[k];
      c.onclick = () => playIpaAudio(it, c);
      c.querySelector('.ipa-word').onclick = (e) => { e.stopPropagation(); stopIpaAudio(); TTS.stop(); UI.sfx.tap(); TTS.speak([{ text: it[2], lang: 'en-US' }, { text: it[3], lang: 'zh-CN' }]); };
    });
  }
  function showIpa(on) {
    ipaPanel.hidden = !on;
    /* 音标视图与学习页签行互斥：回到字母视图时才恢复练习页签/筛选/列表 */
    el.querySelector('#learnTabs').hidden = on;
    el.querySelector('#flt').hidden = on;
    el.querySelector('#lessonList').hidden = on;
    if (!on) { stopIpaAudio(); return; }
    paintIpa();
  }

  /* 字母模块专属视图切换：A-Z 字母（列表+练习）与音标（48 音素面板）互斥展示 */
  const viewSwitch = el.querySelector('#viewSwitch');
  if (viewSwitch) viewSwitch.querySelectorAll('button').forEach(b => b.onclick = () => {
    if (b.classList.contains('active')) return;
    UI.sfx.tap();
    viewSwitch.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    showIpa(b.dataset.view === 'ipa');
  });

  /* 练习 tab：非「学习」直接打开当前课时对应练习（该课时没有此练习则回退到第一个） */
  el.querySelectorAll('#learnTabs button').forEach(b => b.onclick = () => {
    UI.sfx.tap();
    el.querySelectorAll('#learnTabs button').forEach(x => x.classList.toggle('active', x === b));
    if (viewSwitch) viewSwitch.querySelector('[data-view="letters"]').classList.add('active');
    showIpa(false);
    const x = list[curIdx()];
    if (b.dataset.tab === 'learn') return;
    const want = b.dataset.tab === 'game' ? 'sound' : b.dataset.tab;
    const kinds = Learn.practicesOf(module, x.id).map(p => p.kind);
    if (want === 'chain' && !kinds.includes('chain')) { UI.toast('接龙闯关在「成语接龙」模块里哦'); el.querySelectorAll('#learnTabs button').forEach(y => y.classList.toggle('active', y.dataset.tab === 'learn')); return; }
    Learn.openStudy(module, x.id);
    Learn.startPractice(kinds.includes(want) ? want : kinds[0]);
  });

  el.querySelector('#modPlay').onclick = () => {
    if (!ipaPanel.hidden) {
      /* 音标页：连播当前筛选分类的全体音素（真人音频队列，失败项降级 TTS 例词） */
      UI.sfx.pop();
      const items = ipaItems();
      let i = 0;
      const mySeq = ++ipaQueueSeq;
      const playNext = () => {
        if (mySeq !== ipaQueueSeq || i >= items.length || ipaPanel.hidden) return;
        const it = items[i++];
        haltIpaAudio(); TTS.stop();
        const a = new Audio(ipaAudio(it[1]));
        ipaAudioEl = a;
        a.onended = () => { if (ipaAudioEl === a) ipaAudioEl = null; setTimeout(playNext, 250); };
        a.onerror = () => { ipaAudioEl = null; TTS.speak({ text: it[2], lang: 'en-US' }).then(() => setTimeout(playNext, 250)); };
        a.play().catch(a.onerror);
      };
      playNext();
      UI.toast(`开始连播「${ipaFilters[ipaFi]}」共 ${items.length} 个音标`);
      return;
    }
    UI.sfx.pop(); TTS.speak(list[curIdx()].play);
  };
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
        <p class="study-sub" style="margin-top:12px">可用积分：<b class="t-points">🟡${Store.state.points}</b>（购买只扣积分，不影响累计解锁进度）`);
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
        <div class="stat"><b>${st.learned.math || 0}</b><span>已学数学</span></div>
        <div class="stat"><b>${st.learned.chengyu || 0}</b><span>已学接龙</span></div>
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
      <button class="primary btn-soft" style="margin-top:14px" id="rstBtn">重置本机体验数据</button>
    </div>

    <div class="parent-card"><h3>💾 存档备份（换设备时迁移）</h3>
      <p class="t-hint" style="margin-bottom:10px">导出存档码保存到安全的地方，在新设备粘贴即可恢复。</p>
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
        <button class="primary btn-danger" data-x="yes">确认重置</button></div>`);
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

/* ---------- 记录行公用：星级 + 练习名 + 积分 + 日期（评分 1-3 星，旧记录无分按 3） ---------- */
const PRACTICE_LABEL = { trace: '✍️ 描红', follow: '🎙️ 跟读', sound: '👂 听音识图', match: '🧩 图文配对', quiz: '➗ 口算闯关', game: '👂 听音识图' };
/* 密码框统一加「显示/隐藏」小眼睛：给 type=password 输入包一层 wrap 并挂切换按钮 */
function decoratePasswordInputs(root) {
  (root || document).querySelectorAll('input[type="password"]').forEach(decoratePwdInput);
}
function decoratePwdInput(inp) {
  if (inp.dataset.pwdDeco) return;
  inp.dataset.pwdDeco = '1';
  const wrap = document.createElement('span');
  wrap.className = 'pwd-wrap';
  inp.parentNode.insertBefore(wrap, inp);
  wrap.appendChild(inp);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pwd-eye';
  btn.setAttribute('aria-label', '显示密码');
  btn.innerHTML = '<svg class="pw-hide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg><svg class="pw-show" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/><path d="M4 20L20 4"/></svg>';
  btn.onclick = () => {
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    btn.classList.toggle('showing', show);
    btn.setAttribute('aria-label', show ? '隐藏密码' : '显示密码');
    UI.sfx.tap();
  };
  wrap.appendChild(btn);
}

function starsHtml(n) {
  n = Math.min(3, Math.max(1, n || 3));
  return `<span class="stars">${'★'.repeat(n)}<i>${'★'.repeat(3 - n)}</i></span>`;
}
function recRowHtml(r) {
  const d = new Date(r.completedAt);
  return `<div class="rec-row"><div class="rec-main"><b>${r.title}</b><small>${PRACTICE_LABEL[r.kind] || r.kind} · 获得 ${r.value} 🟡 · ${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</small></div>${starsHtml(r.score)}</div>`;
}

/* ---------- ⑦ 登录 / 注册（本机账号，未登录时唯一入口） ---------- */
Pages.login = (el) => {
  let mode = 'login';
  let pickedAvatar = Auth.AVATARS[Math.random() * Auth.AVATARS.length | 0];
  const draw = () => {
    el.innerHTML = `
      <div class="login-wrap">
        <div class="login-brand"><span class="lb-mark">芽</span><div><b>芽芽乐</b><small>中英双语启蒙小屋</small></div></div>
        <div class="login-card">
          <div class="login-tabs">
            <button class="${mode === 'login' ? 'active' : ''}" data-m="login">登录</button>
            <button class="${mode === 'reg' ? 'active' : ''}" data-m="reg">注册新账号</button>
          </div>
          ${mode === 'login' ? `
          <label class="fld"><span>账号</span><input id="lu" autocomplete="username" placeholder="汉字 / 字母 / 数字"></label>
          <label class="fld"><span>密码</span><input id="lp" type="password" autocomplete="current-password" placeholder="请输入密码"></label>
          <button class="primary login-submit" id="doLogin">进入芽芽乐 →</button>
          <p class="login-tip">忘记了密码？请超级管理员（账号 admin）帮你重置</p>` : `
          <label class="fld"><span>账号</span><input id="lu" placeholder="2-12 位，如：小明"></label>
          <label class="fld"><span>密码</span><input id="lp" type="password" placeholder="至少 4 位"></label>
          <label class="fld"><span>昵称（选填）</span><input id="ln" maxlength="8" placeholder="和账号一样"></label>
          <div class="fld fld-avatar"><span>选个头像</span>
            <div class="avatar-grid">${Auth.AVATARS.map(a => `<button type="button" data-a="${a}" class="${a === pickedAvatar ? 'on' : ''}">${a}</button>`).join('')}</div>
          </div>
          <button class="primary login-submit" id="doReg">注册并进入 →</button>`}
          <div class="form-err" id="loginErr" hidden></div>
        </div>
      </div>`;
    decoratePasswordInputs(el);
    el.querySelectorAll('.login-tabs button').forEach(b => b.onclick = () => { UI.sfx.tap(); mode = b.dataset.m; draw(); });
    el.querySelectorAll('.avatar-grid button').forEach(b => b.onclick = () => {
      pickedAvatar = b.dataset.a;
      el.querySelectorAll('.avatar-grid button').forEach(x => x.classList.toggle('on', x === b));
    });
    const err = m => { const e = el.querySelector('#loginErr'); e.textContent = m; e.hidden = false; };
    if (mode === 'login') {
      el.querySelector('#doLogin').onclick = async () => {
        const r = await Auth.login(el.querySelector('#lu').value, el.querySelector('#lp').value);
        if (!r.ok) return err(r.err);
        UI.sfx.star(); APP.enter(r.u);
      };
    } else {
      el.querySelector('#doReg').onclick = async () => {
        const r = await Auth.register(el.querySelector('#lu').value, el.querySelector('#lp').value, el.querySelector('#ln').value, pickedAvatar);
        if (!r.ok) return err(r.err);
        UI.sfx.star(); APP.enter(r.u);
      };
    }
  };
  draw();
};

/* ---------- ⑧ 个人中心：账号 / 资料 / 改密 / 练习记录 / 超管管理 / 退出 ---------- */
Pages.me = (el) => {
  if (!Auth.get()) return location.hash = '#/login';
  const draw = () => {
    const a = Auth.get();
    const recs = Store.recordList();
    el.innerHTML = `
      <div class="sub-top back-row"><button class="back" id="pgBack">‹</button>
        <div><h1>个人中心</h1><small>账号与学习小档案 · 数据仅保存在本机</small></div></div>

      <div class="parent-card"><h3>我的账号</h3>
        <div class="me-id"><span class="me-avatar">${a.avatar}</span>
          <div><b>${a.nickname}</b>${a.role === 'admin' ? '<em class="me-badge">超级管理员</em>' : ''}
            <small>账号 ${a.u} · 注册于 ${new Date(a.createdAt).toLocaleDateString()}</small></div>
        </div>
      </div>

      <div class="parent-card"><h3>个人资料</h3>
        <label class="fld"><span>昵称</span><input id="meNick" maxlength="8" value="${a.nickname}"></label>
        <div class="fld fld-avatar"><span>头像</span>
          <div class="avatar-grid">${Auth.AVATARS.map(x => `<button type="button" data-a="${x}" class="${x === a.avatar ? 'on' : ''}">${x}</button>`).join('')}</div></div>
        <button class="primary" id="meSave" style="margin-top:10px">保存资料</button>
      </div>

      <div class="parent-card"><h3>修改密码</h3>
        <label class="fld"><span>旧密码</span><input id="po" type="password"></label>
        <label class="fld"><span>新密码（至少 4 位）</span><input id="pn" type="password"></label>
        <button class="primary" id="pwdBtn">确认修改</button>
        <div class="form-err" id="pwdErr" hidden></div>
      </div>

      <div class="parent-card"><h3>📒 我的练习记录</h3>
        <p class="me-note">重复练习只保留最新一次成绩</p>
        ${recs.length ? `<div class="rec-list">${recs.slice(0, 50).map(recRowHtml).join('')}</div>` : '<p class="me-empty">还没有练习记录，快去学一关吧</p>'}
      </div>

      ${Auth.isAdmin() ? `
      <div class="parent-card"><h3>🛡️ 账号管理（超级管理员）</h3>
        <p class="me-note">孩子忘记了密码？在这里重置。删除账号会同时清空它在本机的学习存档。</p>
        <div class="admin-list">${Auth.listUsers().map(u => `
          <div class="admin-row"><span class="admin-av">${u.avatar}</span>
            <div class="admin-info"><b>${u.nickname}</b><small>${u.u} · ${u.role === 'admin' ? '超管' : '用户'} · ${new Date(u.createdAt).toLocaleDateString()}</small></div>
            ${u.u === Auth.ADMIN ? '<span class="admin-fixed">不可操作</span>' : `<button class="mini-btn" data-reset="${u.u}">重置密码</button><button class="mini-btn danger" data-del="${u.u}">删除</button>`}
          </div>`).join('')}</div>
      </div>` : ''}

      <div class="parent-card"><button class="primary warn" id="logoutBtn" style="width:100%">退出登录</button></div>`;

    decoratePasswordInputs(el);

    el.querySelector('#pgBack').onclick = () => { TTS.stop(); location.hash = '#/home'; };
    let picked = a.avatar;
    el.querySelectorAll('.avatar-grid button').forEach(b => b.onclick = () => {
      picked = b.dataset.a;
      el.querySelectorAll('.avatar-grid button').forEach(x => x.classList.toggle('on', x === b));
    });
    el.querySelector('#meSave').onclick = () => {
      Auth.updateProfile({ nickname: el.querySelector('#meNick').value, avatar: picked });
      UI.toast('资料已保存'); APP.hud(); draw();
    };
    el.querySelector('#pwdBtn').onclick = async () => {
      const e = el.querySelector('#pwdErr'); e.hidden = true;
      const r = await Auth.changePassword(el.querySelector('#po').value, el.querySelector('#pn').value);
      if (!r.ok) { e.textContent = r.err; e.hidden = false; return; }
      UI.toast('密码修改成功，下次登录用新密码哦'); draw();
    };
    if (Auth.isAdmin()) {
      el.querySelectorAll('[data-reset]').forEach(b => b.onclick = () => {
        const target = b.dataset.reset;
        const d = openSheet(`<div class="sheet-head"><h3>重置「${target}」的密码</h3><button class="close" data-x="hide">×</button></div>
          <label class="fld"><span>新密码（至少 4 位）</span><input id="np" type="password" autocomplete="new-password"></label>
          <div class="btns"><button class="primary" data-x="ok">确认重置</button></div>`);
        d.el.querySelector('[data-x="ok"]').onclick = async () => {
          const r = await Auth.resetPasswordByAdmin(target, d.el.querySelector('#np').value);
          if (!r.ok) return UI.toast(r.err);
          d.close(); UI.toast('已重置，告诉小朋友新密码吧');
        };
      });
      el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
        const target = b.dataset.del;
        const d = openSheet(`<div class="sheet-head"><h3>删除账号 ${target}？</h3><button class="close" data-x="hide">×</button></div>
          <p class="study-sub">它的本机学习存档会一起删除，无法恢复</p>
          <div class="btns"><button class="primary ghost" data-x="no">取消</button><button class="primary btn-danger" data-x="yes">确认删除</button></div>`);
        d.el.querySelector('[data-x="no"]').onclick = () => d.close();
        d.el.querySelector('[data-x="yes"]').onclick = () => {
          const r = Auth.deleteUser(target);
          d.close();
          if (!r.ok) return UI.toast(r.err);
          UI.toast('账号已删除'); draw();
        };
      });
    }
    el.querySelector('#logoutBtn').onclick = () => {
      const d = openSheet(`<div class="sheet-head"><h3>退出登录？</h3><button class="close" data-x="hide">×</button></div>
        <p class="study-sub">学习存档会保留，下次用这个账号登录就能继续</p>
        <div class="btns"><button class="primary ghost" data-x="no">再想想</button><button class="primary" data-x="yes">退出</button></div>`);
      d.el.querySelector('[data-x="no"]').onclick = () => d.close();
      d.el.querySelector('[data-x="yes"]').onclick = () => APP.logout();
    };
  };
  draw();
};

/* 动效开关：body.no-motion + 去阴影（demo toggleSetting 同款） */
function applyMotion() {
  const on = Store.state.motion;
  document.body.classList.toggle('no-motion', !on);
  document.documentElement.classList.toggle('no-motion', !on);
  document.body.style.setProperty('--shadow', on ? '' : 'none');
}
