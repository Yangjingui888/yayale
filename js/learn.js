/* ============ 学习流程引擎：认知 → 拼读 → 描红 → 跟读 → 闯关，含通用小游戏 ============ */

/* ---------- 小工具 ---------- */
const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
const rand = a => a[Math.random() * a.length | 0];

/* 从池子里取 n 个干扰项 */
function distractors(pool, n) {
  return shuffle(pool.slice()).slice(0, n);
}

/* ---------- 小游戏 1：听音识别（播放发音，点击对应卡片） ----------
 * q = { audio:[{text,lang}], opts:[{html, ok}], prompt } */
function gameListen(container, q, onRight) {
  container.innerHTML = `
    <div class="study-card">
      <div class="quiz-prompt">${q.prompt || '👂 听一听，哪一个是对的？'}</div>
      <button class="play-row play-again" style="margin:12px 0 2px"><span>🔊 再听一次</span><span class="rp">播放</span></button>
      <div class="opts" style="display:grid;gap:9px;margin-top:12px"></div>
      <div class="quiz-progress">${q.dot || ''}</div>
    </div>`;
  const opts = container.querySelector('.opts');
  const play = () => { UI.sfx.pop(); TTS.speak(q.audio); };
  container.querySelector('.play-again').onclick = play;
  setTimeout(play, 400);
  shuffle(q.opts).forEach(o => {
    const b = document.createElement('button');
    b.className = 'quiz-option'; b.innerHTML = o.html;
    b.onclick = () => {
      if (o.ok) {
        b.classList.add('correct'); UI.sfx.right();
        setTimeout(onRight, 650);
      } else {
        b.classList.add('hint'); UI.sfx.wrong(); UI.cheerNear();
        setTimeout(() => b.classList.remove('hint'), 500);
      }
    };
    opts.appendChild(b);
  });
}

/* ---------- 小游戏 2：图文配对（左右各 4 张，点一对消一对） ---------- */
function gamePairs(container, pairs, onDone) {
  /* pairs: [{leftHtml, rightHtml, id}] */
  const L = shuffle(pairs), R = shuffle(pairs);
  container.innerHTML = `
    <div class="study-card">
      <div class="quiz-prompt">🧩 找朋友！左边点一个，再点右边的一对</div>
      <div class="pairs">
        <div class="pair-col l">${L.map(p => `<button class="pair-card" data-id="${p.id}">${p.leftHtml}</button>`).join('')}</div>
        <div class="pair-link">🔗</div>
        <div class="pair-col r">${R.map(p => `<button class="pair-card" data-id="${p.id}">${p.rightHtml}</button>`).join('')}</div>
      </div>
    </div>`;
  let sel = null, matched = 0;
  container.querySelectorAll('.pair-card').forEach(b => {
    b.onclick = () => {
      if (b.classList.contains('done')) return;
      UI.sfx.tap();
      const isLeft = b.closest('.l');
      if (!sel) { sel = b; b.classList.add('sel'); return; }
      if (sel === b) { sel = null; b.classList.remove('sel'); return; }
      if (sel.dataset.id === b.dataset.id && !!sel.closest('.l') !== !!isLeft) {
        sel.classList.remove('sel');
        sel.classList.add('done'); b.classList.add('done');
        sel = null; UI.sfx.right(); matched++;
        if (matched === pairs.length) setTimeout(onDone, 600);
      } else {
        sel.classList.remove('sel');
        UI.sfx.wrong(); UI.cheerNear();
        sel = b; b.classList.add('sel');
      }
    };
  });
}

/* ---------- 流程运行器：steps = [{render(el, next)}] ---------- */
function runFlow(root, steps, onFinish) {
  let i = 0;
  const bar = document.createElement('div'); bar.className = 'steps';
  const body = document.createElement('div');
  steps.forEach(() => bar.appendChild(document.createElement('i')));
  root.innerHTML = ''; root.appendChild(bar); root.appendChild(body);
  function paint() {
    [...bar.children].forEach((el, k) => { el.className = k < i ? 'ok' : k === i ? 'on' : ''; });
  }
  function go() {
    paint(); body.innerHTML = ''; TTS.stop();
    if (i >= steps.length) return onFinish();
    steps[i].render(body, () => { i++; go(); });
  }
  go();
}

/* 「下一步」按钮辅助 */
function nextBtn(label, next, cls = 'primary') {
  const b = document.createElement('button');
  b.className = cls; b.textContent = label;
  b.onclick = () => { UI.sfx.pop(); TTS.stop(); next(); };
  return b;
}

/* ---------- 模块配置：把数据统一成泛型条目 ---------- */
function letterItem(i) {
  const a = LETTERS[i];
  return {
    module: 'letter', id: a.L, key: a.L,
    visual: `<span class="dup">${a.L}</span>${a.L.toLowerCase()}`,
    word: `字母 ${a.L} ${a.L.toLowerCase()}`,
    sub: `拼读音 /${a.ph}/`,
    chips: a.words.map(w => ({ em: w[2], text: `${w[0]} · ${w[1]}`, speak: w[0] })),
    speak: [{ text: `${a.L}. ${a.L.toLowerCase()}.`, lang: 'en-US' },
            { text: `${a.L} says ${a.ph}. ${a.words[0][0]}. ${a.words[1][0]}`, lang: 'en-US' }],
    traceChars: [a.L, a.L.toLowerCase()],
    quizAudio: [{ text: a.L, lang: 'en-US' }],
    quizHtml: `<span>${a.L}</span>`,
    pair: { l: a.L, r: a.L.toLowerCase() },
    title: `字母 ${a.L}`,
  };
}
function wordItem(ti, wi) {
  const w = WORD_THEMES[ti].words[wi];
  return {
    module: 'word', id: `${ti}_${wi}`, key: `${ti}_${wi}`,
    visual: w[2], visualWord: true,
    word: w[0], sub: `${w[1]} · 主题「${WORD_THEMES[ti].name}」`,
    speak: [{ text: w[0], lang: 'en-US' }, { text: w[1], lang: 'zh-CN' }],
    spell: w[0],
    quizAudio: [{ text: w[0], lang: 'en-US' }],
    quizHtml: `<span class="oe">${w[2]}</span><span>${w[0]}</span>`,
    pair: { l: w[0], r: w[2] },
    title: `单词 ${w[0]}`,
  };
}
function pinyinItem(gi, ii) {
  const p = PINYIN_GROUPS[gi].items[ii];
  return {
    module: 'pinyin', id: `${gi}_${ii}`, key: `${gi}_${ii}`,
    visual: p[3],
    word: `拼音 ${p[0]}`, sub: `${p[1]} · ${p[2]} · ${PINYIN_GROUPS[gi].name}`,
    note: `👄 口型小窍门：读「${p[1]}」，想想${p[2]}`,
    speak: [{ text: `${p[1]}，${p[2]}`, lang: 'zh-CN' }],
    quizAudio: [{ text: `${p[2]}，${p[1]}`, lang: 'zh-CN' }],
    quizHtml: `<span>${p[0]}</span>`,
    pair: { l: p[0], r: p[3] },
    title: `拼音 ${p[0]}`,
  };
}
function hanziItem(gi, ii) {
  const h = HANZI_GROUPS[gi].items[ii];
  return {
    module: 'hanzi', id: `${gi}_${ii}`, key: `${gi}_${ii}`,
    visual: h[3],
    word: h[0], sub: `${h[1]} · ${h[2]}`,
    speak: [{ text: `${h[0]}。${h[2]}。`, lang: 'zh-CN' }],
    traceChars: [h[0]],
    quizAudio: [{ text: `${h[0]}，${h[2]}`, lang: 'zh-CN' }],
    quizHtml: `<span>${h[0]}</span><span style="font-size:12px;color:#91a0b6">${h[1]}</span>`,
    pair: { l: h[3], r: h[0] },
    title: `汉字 ${h[0]}`,
  };
}

/* ---------- 同一模块的题池 ---------- */
function modulePool(module) {
  if (module === 'letter') return LETTERS.map((_, i) => letterItem(i));
  if (module === 'word') { const r = []; WORD_THEMES.forEach((t, ti) => t.words.forEach((_, wi) => r.push(wordItem(ti, wi)))); return r; }
  if (module === 'pinyin') { const r = []; PINYIN_GROUPS.forEach((g, gi) => g.items.forEach((_, ii) => r.push(pinyinItem(gi, ii)))); return r; }
  const r = []; HANZI_GROUPS.forEach((g, gi) => g.items.forEach((_, ii) => r.push(hanziItem(gi, ii)))); return r;
}

/* ---------- 四合一学习流程入口 ---------- */
const CLR_KEY = { letter: 'letters', word: 'words', pinyin: 'pinyin', hanzi: 'hanzi' };

function startLearnFlow(item, container, backHash) {
  window.__backHash = backHash;
  const first = !Store.cleared(CLR_KEY[item.module], item.key);
  const pool = modulePool(item.module);
  const steps = [];

  /* 步骤 1：认知卡 */
  steps.push({
    render(el, next) {
      const card = document.createElement('div');
      card.className = 'study-card';
      card.innerHTML = `
        <div class="study-visual ${item.visualWord ? 'word' : ''}">${item.visual}</div>
        <div class="study-word">${item.word}</div>
        <div class="study-sub">${item.sub}${item.ph ? ' · ' + item.ph : ''}</div>
        ${item.note ? `<div class="study-sub">${item.note}</div>` : ''}
        ${item.chips ? `<div class="word-chips">${item.chips.map(c =>
          `<button class="chip"><span class="ce">${c.em}</span>${c.text}</button>`).join('')}</div>` : ''}
        <div class="play-row" style="margin:14px 0 0"><span>🔊 点我听标准发音</span><button class="rp tap-audio">播放声音</button></div>`;
      const btns = document.createElement('div'); btns.className = 'flow-btns';
      if (item.module === 'word' || item.module === 'letter')
        btns.appendChild(nextBtn('📖 跟我拼', () => spellStep(el, next), 'primary warn'));
      btns.appendChild(nextBtn('➡️ 下一步', next));
      el.appendChild(card); el.appendChild(btns);
      card.querySelector('.tap-audio').onclick = () => { UI.sfx.pop(); TTS.speak(item.speak); };
      setTimeout(() => TTS.speak(item.speak), 500);
      /* 单词点读 */
      card.querySelectorAll('.chip').forEach((c, i) => c.onclick = () => {
        const w = item.chips && item.chips[i]; if (w) TTS.speak([{ text: w.speak, lang: 'en-US' }]);
      });
    },
  });

  /* 步骤 1.5：拆分拼读（字母/单词专属） */
  function spellStep(el, next) {
    TTS.stop(); el.innerHTML = '';
    const card = document.createElement('div'); card.className = 'study-card';
    if (item.module === 'word') {
      const letters = item.spell.replace(/\s/g, '').split('');
      card.innerHTML = `<div class="study-word">🔤 一个字母一个字母读</div>
        <div class="word-chips">${letters.map(l => `<button class="chip"><span class="ce">${l.toUpperCase()}<small style="color:#91a0b6">${l.toLowerCase()}</small></span></button>`).join('')}</div>
        <div class="play-row" style="margin:14px 0 0"><span>🔊 连起来读：${item.spell}!</span></div>`;
      card.querySelectorAll('.chip').forEach((c, i) => c.onclick = () => TTS.speak([{ text: letters[i], lang: 'en-US' }]));
      setTimeout(() => TTS.speak(letters.map(l => ({ text: l, lang: 'en-US' }))), 400);
    } else {
      card.innerHTML = `<div class="study-word">🔤 自然拼读时间</div>
        <div class="study-sub">${item.ph || ''}</div>
        <div class="word-chips">${item.chips.map(c => `<button class="chip"><span class="ce">${c.em}</span>${c.text}</button>`).join('')}</div>`;
      setTimeout(() => TTS.speak(item.speak), 400);
      card.querySelectorAll('.chip').forEach((c, i) => c.onclick = () => TTS.speak([{ text: item.chips[i].speak, lang: 'en-US' }]));
    }
    const btns = document.createElement('div'); btns.className = 'flow-btns';
    btns.appendChild(nextBtn('🔊 再听一遍', () => TTS.speak(item.speak), 'primary warn'));
    btns.appendChild(nextBtn('➡️ 继续', next));
    el.appendChild(card); el.appendChild(btns);
  }

  /* 步骤 2：描红（字母/汉字有） */
  if (item.traceChars) {
    steps.push({
      render(el, next) {
        let ti = 0;
        (function doTrace() {
          el.innerHTML = '';
          const head = document.createElement('div');
          head.className = 'study-word'; head.style.cssText = 'text-align:center;margin-bottom:2px';
          head.textContent = item.module === 'letter'
            ? `✍️ 描一描：${ti === 0 ? '大写 ' + item.traceChars[0] : '小写 ' + item.traceChars[1]}`
            : `✍️ 描一描：${item.traceChars[0]}`;
          const pad = TracePad(item.traceChars[ti], () => {
            ti++;
            if (ti < item.traceChars.length) doTrace();
            else next();
          });
          el.appendChild(head); el.appendChild(pad);
        })();
      },
    });
  }

  /* 步骤 3：AI 跟读 */
  steps.push({
    render(el, next) {
      el.appendChild(ReadAloud(item.speak, next));
    },
  });

  /* 步骤 4：闯关（2 轮听音识别 + 1 轮图文配对） */
  steps.push({
    render(el, next) {
      let idx = 0;
      const quizSteps = [
        cb => gameListen(el, { audio: item.quizAudio, opts: poolOpts(3), prompt: '👂 听一听，哪一个是对的？', dot: '● ○ ○' }, cb),
        cb => gameListen(el, { audio: item.quizAudio, opts: poolOpts(3), prompt: '👂 再听一次，你行吗', dot: '● ● ○' }, cb),
        cb => gamePairs(el, genPairs(), cb),
      ];
      function poolOpts(n) {
        return [{ html: item.quizHtml, ok: true }, ...distractors(pool.filter(p => p.id !== item.id), n).map(p => ({ html: p.quizHtml, ok: false }))];
      }
      function genPairs() {
        const four = [item, ...shuffle(pool.filter(p => p.id !== item.id)).slice(0, 3)];
        return four.map(p => ({ id: p.id, leftHtml: p.pair.l, rightHtml: p.pair.r }));
      }
      (function run() {
        el.innerHTML = '';
        if (idx >= quizSteps.length) return next();
        quizSteps[idx](() => { idx++; UI.sfx.pop(); run(); });
      })();
    },
  });

  runFlow(container, steps, () => {
    const [fs, fp, rs, rp] = ECON.reward[item.module];
    if (first) Store.markClear(CLR_KEY[item.module], item.key);
    Store.markDaily(item.module);
    showResult(container, {
      em: (item.visual || '').replace(/<[^>]+>/g, '') || '🎈',
      stars: first ? fs : rs, points: first ? fp : rp, first,
      again: () => startLearnFlow(item, container, backHash),
    });
  });
}

/* ---------- 结算页 ---------- */
function showResult(root, { em, stars, points, first, again }) {
  Store.addStars(stars); Store.addPoints(points);
  UI.sfx.star(); UI.burst(first ? 150 : 80);
  root.innerHTML = `
    <div class="study-card">
      <div class="study-visual">${em || '🎈'}</div>
      <h2 style="font-size:22px">🎉 闯关成功！</h2>
      <div class="study-sub">${first ? '首次通关奖励' : '复习奖励'}</div>
      <div class="reward-line">
        ${stars ? `<span class="r-star">⭐ +${stars}</span>` : ''}
        <span class="r-pts">🟡 +${points}</span>
      </div>
      <div class="study-sub" style="margin-top:8px">${stars ? '星星可以换宠物皮肤，' : ''}积分可以解锁和喂养宠物哦</div>
      <div class="btns">
        <button class="primary warn" data-a="again">🔁 再练一次</button>
        <button class="primary" data-a="back">🏠 返回</button>
      </div>
    </div>`;
  TTS.speak({ text: first ? '恭喜你！闯关成功，拿到了奖励！' : '复习完成，你真棒！', lang: 'zh-CN' });
  root.querySelector('[data-a="again"]').onclick = again;
  root.querySelector('[data-a="back"]').onclick = () => { TTS.stop(); location.hash = window.__backHash || '#/home'; };
  setTimeout(() => UI.checkUnlockCelebration(), 900);
}
