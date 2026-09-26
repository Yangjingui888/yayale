/* ============ demo 练习引擎：课时学习弹层 + 四练习任意点选、独立完成、独立发奖、打勾记忆 ============ */

/* 六种练习（前四种与 demo 一致；口算闯关为数学专用，成语接龙为成语模块专用） */
const PRACTICE_DEFS = [
  { kind: 'trace',  icon: '✍️', label: '描红练习' },
  { kind: 'follow', icon: '🎙️', label: 'AI跟读' },
  { kind: 'sound',  icon: '👂', label: '听音识图' },
  { kind: 'match',  icon: '🧩', label: '图文配对' },
  { kind: 'quiz',   icon: '➖', label: '口算闯关' },
  { kind: 'chain',  icon: '🐉', label: '接龙闯关' },
];
const PRACTICES = PRACTICE_DEFS.filter(p => p.kind !== 'quiz' && p.kind !== 'chain');   // 默认练习集（语言类模块）

const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);

/* ---------- 课时数据归一：保留现有丰富内容，映射为 demo item 结构 ---------- */
const LESSON_CACHE = {};
function LESSONS(module) {
  if (LESSON_CACHE[module]) return LESSON_CACHE[module];
  let list = [];
  if (module === 'letters') {
    list = LETTERS.map((a, i) => {
      const [w0, w1] = a.words;
      return {
        id: i, title: `字母 ${a.L}`,
        visual: `<span class="dup">${a.L}</span>${a.L.toLowerCase()}`,
        ipa: a.ph,
        sub: `拼读音 /${a.ph}/ · ${w0[0]} ${w0[1]} · ${w1[0]} ${w1[1]}`,
        /* 发音只读单个字母本名一次，不带拼读音与例词；跟读示范与判分目标同步为字母本名 */
        play: [{ text: a.L, lang: 'en-US' }],
        follow: { lang: 'en-US', target: a.L, demo: a.L },
        trace: [a.L, a.L.toLowerCase()],
        audio: [{ text: `${a.L}. ${w0[0]}.`, lang: 'en-US' }],
        quizVisual: w0[2], quizLabel: w0[0], quizSub: w0[1],
      };
    });
  } else if (module === 'words') {
    WORD_THEMES.forEach((t, ti) => t.words.forEach((w, wi) => list.push({
      id: ti + '_' + wi, title: `单词 ${w[0]}`,
      visual: w[2],
      sub: `${w[1]} · 主题「${t.name}」`,
      play: [{ text: w[0], lang: 'en-US' }, { text: w[1], lang: 'zh-CN' }],
      follow: { lang: 'en-US', target: w[0], demo: w[0] },
      trace: [w[0]],
      audio: [{ text: w[0], lang: 'en-US' }],
      quizVisual: w[2], quizLabel: w[0], quizSub: w[1],
    })));
  } else if (module === 'pinyin') {
    PINYIN_GROUPS.forEach((g, gi) => g.items.forEach((p, ii) => list.push({
      id: gi + '_' + ii, title: `拼音 ${p[0]}`,
      visual: `<span class="dup">${p[0]}</span>`,
      sub: `${p[1]} · ${p[2]} · ${g.name}`,
      /* 标准发音：先慢速单独读准音字（自然音高），再带一次音→词巩固，避免连读句子导致读音不标准 */
      play: [{ text: p[1], lang: 'zh-CN', rate: 0.7, pitch: 1 },
             { text: `${p[1]}，${p[2]}`, lang: 'zh-CN', rate: 0.8, pitch: 1 }],
      tones: (typeof PINYIN_TONES !== 'undefined' ? PINYIN_TONES[p[0]] : null) || null,
      follow: { lang: 'zh-CN', target: p[2], demo: `${p[1]}，${p[2]}` },
      trace: [p[0]],
      audio: [{ text: p[1], lang: 'zh-CN', rate: 0.7, pitch: 1 },
              { text: p[2], lang: 'zh-CN', rate: 0.8, pitch: 1 }],
      quizVisual: p[3], quizLabel: p[0], quizSub: p[1],
    })));
  } else if (module === 'math') {
    /* ① 数字 1-10：认数 → 描中文数字 → 跟读 → 数数配对 */
    MATH_NUMBERS.forEach((a, i) => list.push({
      id: 'num_' + i, title: `数字 ${a[0]}`,
      visual: `<span class="math-num">${a[0]}</span><span class="math-num-cn">${a[1]}</span><span class="math-count">${countEm(a[3], +a[0])}</span>`,
      sub: `${a[1]} ${a[2]} · ${a[4]} · ${MATH_GROUPS[0].name}`,
      play: [{ text: `${a[0]}，${a[1]}，${a[4]}`, lang: 'zh-CN' }],
      follow: { lang: 'zh-CN', target: a[1], demo: `${a[1]}，${a[4]}` },
      trace: [a[0]],
      practices: ['trace', 'follow', 'sound', 'match'],
      quizVisual: countEm(a[3], +a[0]), quizLabel: a[1], quizSub: a[4],
      audio: [{ text: `${a[1]}，${a[4]}`, lang: 'zh-CN' }],
      quizGen: () => countQuizOf(a),
    }));
    /* ② 100 以内加减法：示范算式 → 跟读算式 → 口算闯关 */
    MATH_CALC_LEVELS.forEach((lv, i) => list.push({
      id: 'calc_' + lv.id, title: lv.name,
      visual: `<span class="math-eq">${lv.ex.f}</span>`,
      sub: `${lv.tip} · ${MATH_GROUPS[1].name}`,
      play: lv.ex.play,
      follow: { lang: 'zh-CN', target: lv.ex.target, demo: lv.ex.target },
      practices: ['follow', 'quiz'],
      quizCount: 8,
      quizVisual: lv.ex.ans, quizLabel: lv.ex.f, quizSub: lv.name,
      audio: lv.ex.play,
      quizGen: lv.gen,
    }));
    /* ③ 九九乘法表：口诀行 → 跟读口诀 → 口算闯关 */
    MULT_FACTS.forEach((row, gi) => list.push({
      id: 'mul_' + row.n, title: row.name,
      visual: `<span class="mult-table">${row.items.map(f => f.f).join('<br>')}</span>`,
      sub: `${row.n} 的乘法口诀共 ${row.items.length} 句 · ${MATH_GROUPS[2].name}`,
      play: row.items.flatMap(it => it.play),
      follow: { lang: 'zh-CN', target: row.items[0].target, demo: row.items[0].target },
      practices: ['follow', 'quiz'],
      quizCount: 6,
      quizVisual: String(row.n), quizLabel: row.name, quizSub: row.n + ' 的口诀',
      audio: row.items[0].play,
      quizGen: () => multQuizOf(row),
    }));
  } else if (module === 'chengyu') {
    /* 成语接龙：每字为龙头一课时，学习卡展示整条链，练习 = 描龙字 + 跟读龙头成语 + 接龙闯关 */
    CHENGYU_GROUPS.forEach((g, gi) => g.chars.forEach((ch, ii) => {
      const chain = CHENGYU_CHAINS[ch] || [];
      const first = chain[0];
      list.push({
        id: gi + '_' + ii, title: `成语接龙 ${ch}`,
        visual: `<span class="dup">${ch}</span>`,
        sub: `${g.em} ${g.name} · 以「${ch}」为龙头接 12 条成语`,
        chain: chain,
        /* 上方按钮连播整条接龙：逐条只读成语本身（每条独立一段，自然停顿、可被新播放取代），不读释义 */
        play: chain.map(x => ({ text: x[0], lang: 'zh-CN' })),
        follow: { lang: 'zh-CN', target: first[0], demo: first[0] },
        trace: [ch],
        practices: ['trace', 'follow', 'chain'],
        audio: [{ text: first[0], lang: 'zh-CN' }],
        quizVisual: g.em, quizLabel: ch, quizSub: first[0],
      });
    }));
  } else {
    HANZI_GROUPS.forEach((g, gi) => g.items.forEach((h, ii) => {
      const words = h[2];
      list.push({
        id: gi + '_' + ii, title: `汉字 ${h[0]}`,
        visual: h[0],
        sub: `${h[1]} · ${g.name}`,
        words: words,
        play: [{ text: `${h[0]}。${words.map(w => w[0]).join('。')}。`, lang: 'zh-CN' }],
        follow: { lang: 'zh-CN', target: words[0][0], demo: `${h[0]}，${words[0][0]}` },
        trace: [h[0]],
        audio: [{ text: `${words[0][0]}，${h[0]}`, lang: 'zh-CN' }],
        quizVisual: h[3], quizLabel: h[0], quizSub: words[0][0],
      });
    }));
  }
  LESSON_CACHE[module] = list;
  return list;
}
function lessonOf(module, index) {
  return LESSONS(module).find(l => String(l.id) === String(index));
}
/* 某一课时可用的练习集（数学等模块按内容裁剪） */
function practicesOf(module, index) {
  const item = lessonOf(module, index);
  if (!item || !item.practices) return PRACTICES;
  return PRACTICE_DEFS.filter(p => item.practices.includes(p.kind));
}
/* 课时整体完成（该课时全部练习环节都打勾） */
function lessonDone(module, index) {
  return practicesOf(module, index).every(p => Store.practiceDone(module, index, p.kind));
}

/* ---------- 引擎 ---------- */
const Learn = (() => {
  let current = null;        // { module, index, item }
  let sheet = null;          // { el, close }
  let micCleanup = null;     // 离开时释放麦克风/识别

  /* 跟读判分：文本归一化 + 最长公共子序列相似度 */
  function normText(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, ' ').trim(); }
  function similarity(a, b) {
    const m = a.length, n = b.length;
    if (!m || !n) return 0;
    let prev = new Array(n + 1).fill(0);
    for (let i = 1; i <= m; i++) {
      const cur = [0];
      for (let j = 1; j <= n; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
      prev = cur;
    }
    return (2 * prev[n]) / (m + n);
  }
  function scoreFollow(heard, target) {
    const h = normText(heard), t = normText(target);
    if (!h) return 2;
    if (t && (h.includes(t) || t.includes(h))) return 3;
    const hw = h.split(' '), tw = t.split(' ');
    if (tw.length > 1 && hw.length > 1 && tw.some(w => hw.includes(w))) return 3;
    return similarity(h, t) >= 0.5 ? 3 : 2;
  }

  const MODULE_NAME = { letters: '字母', words: '单词', pinyin: '拼音', hanzi: '汉字', math: '数学', chengyu: '成语接龙' };
  let clipUrl = null;        // 最近一次跟读录音（仅当次弹层会话内可回听）

  function closeSheet() {
    TTS.stop();
    if (micCleanup) { micCleanup(); micCleanup = null; }
    if (clipUrl) { URL.revokeObjectURL(clipUrl); clipUrl = null; }   // 释放跟读录音回听链接
    if (sheet) sheet.close();
  }

  /* ----- 弹层骨架：sheet-head + practiceNav + practiceBody ----- */
  function openStudy(module, index) {
    const item = lessonOf(module, index);
    if (!item) return;
    current = { module, index: item.id, item };
    const d = UI.dialog(`
      <div class="sheet-head"><h3>${MODULE_NAME[module]} · ${item.title}</h3><button class="close" data-x="hide">✕</button></div>
      <div id="practiceNav"></div>
      <div id="practiceBody"></div>`, { dismissable: false });
    sheet = { el: d.el, close: d.close };
    d.el.querySelector('[data-x="hide"]').onclick = closeSheet;
    renderStudy();
  }

  /* ----- 练习导航条（active / done✓），点击切换练习 ----- */
  function navHtml(active) {
    if (!current) return '';
    const { module, index } = current;
    return `<div class="practice-nav">${practicesOf(module, index).map(p => {
      const done = Store.practiceDone(module, index, p.kind);
      return `<button class="${active === p.kind ? 'active' : ''}${done ? ' done' : ''}" data-kind="${p.kind}">${p.icon} ${p.label}${done ? ' ✓' : ''}</button>`;
    }).join('')}</div>`;
  }
  function bindNav(body) {
    body.parentElement.querySelectorAll('.practice-nav [data-kind]').forEach(b => {
      b.onclick = () => { UI.sfx.tap(); startPractice(b.dataset.kind); };
    });
  }

  /* ----- 「学习」总览：study-card + action-grid 四按钮 ----- */
  const TONE_MARKS = ['ˉ', 'ˊ', 'ˇ', 'ˋ'];   // 四声调号
  function renderToneRow(body, module, item) {
    if (module !== 'pinyin' || !item.tones || item.tones.length !== 4) return;
    const card = body.querySelector('.study-card');
    if (!card) return;
    const row = document.createElement('div');
    row.className = 'tone-row';
    row.innerHTML = `<span class="tone-label">🔤 声调</span>` + item.tones.map((ch, k) =>
      `<button class="tone-btn" data-tone="${k}"><b>${TONE_MARKS[k]}</b><span>${ch}</span><small>${'一二三四'[k]}声</small></button>`).join('');
    card.appendChild(row);
    row.querySelectorAll('.tone-btn').forEach(b => b.onclick = () => {
      UI.sfx.pop();
      /* 四声单字：慢速 + 自然音高，声调读得更准更清楚 */
      TTS.speak({ text: item.tones[+b.dataset.tone], lang: 'zh-CN', rate: 0.7, pitch: 1 });
    });
  }

  function renderStudy() {
    if (!current) return;
    if (micCleanup) { micCleanup(); micCleanup = null; }
    TTS.stop();
    const { module, index, item } = current;
    const nav = document.getElementById('practiceNav');
    if (nav) nav.innerHTML = navHtml('');
    const body = document.getElementById('practiceBody');
    if (!body) return;
    const recs = Store.recordList(module, index);
    body.innerHTML = `
      <div class="study-card">
        <div class="study-visual">${item.visual}</div>
        <div class="study-word">${item.title}</div>
        <div class="study-sub">${item.sub}</div>
        ${module === 'hanzi' && item.words ? `<div class="hanzi-words study-hz-words">${item.words.map((w, wi) => `<button class="hw-chip" data-w="${wi}"><span class="hw-py">${w[1]}</span><span class="hw-word">${w[0]}</span></button>`).join('')}</div>` : ''}
        <button class="play-row" id="studyPlay"><span>${module === 'chengyu' ? '🔊 点我听本次 12 条成语接龙' : '🔊 点我听标准发音'}</span><span class="rp">播放</span></button>
      </div>
      ${module === 'chengyu' && item.chain ? `<div class="chain-list">${item.chain.map((x, ci) => `<button class="chain-row" data-c="${ci}"><span class="chain-no">${ci + 1}</span><span class="chain-cy">${x[0]}<small>${x[1]}</small></span><span class="chain-mean">${x[2]}</span>${x[3] ? `<em class="chain-note">${x[3]}</em>` : ''}<span class="chain-play" aria-label="播放这条成语">🔊</span></button>`).join('')}</div>` : ''}
      <div class="action-grid">${practicesOf(module, index).map(p => {
        const done = Store.practiceDone(module, index, p.kind);
        return `<button class="action-btn${done ? ' practice-done' : ''}" data-kind="${p.kind}">
          <span class="ab-ico">${p.icon}</span><span class="ab-label">${p.label}</span>
          <small>${done ? '已完成 ✓' : '点我开始'}</small></button>`;
      }).join('')}</div>
      ${recs.length ? `<button class="rec-toggle" id="recToggle">📒 本课练习记录（${recs.length}）</button><div class="rec-list" id="recList" hidden>${recs.map(r => recRowHtml(r)).join('')}</div>` : ''}`;
    body.parentElement.querySelectorAll('.action-grid [data-kind]').forEach(b => {
      b.onclick = () => { UI.sfx.tap(); startPractice(b.dataset.kind); };
    });
    bindNav(body);
    document.getElementById('studyPlay').onclick = () => { UI.sfx.pop(); TTS.speak(item.play); };
    body.querySelectorAll('.study-hz-words .hw-chip').forEach(c => c.onclick = () => { UI.sfx.tap(); const w = item.words[+c.dataset.w]; TTS.speak([{ text: w[0], lang: 'zh-CN' }]); });
    body.querySelectorAll('.chain-row').forEach(r => r.onclick = () => {
      const x = item.chain[+r.dataset.c]; UI.sfx.pop();
      /* 播放中高亮该行，让用户看到反馈；被新播放取代也会清理 */
      body.querySelectorAll('.chain-row.chain-playing').forEach(o => o.classList.remove('chain-playing'));
      r.classList.add('chain-playing');
      Promise.resolve(TTS.speak({ text: x[0], lang: 'zh-CN' })).finally(() => r.classList.remove('chain-playing'));
    });
    const recToggle = body.querySelector('#recToggle');
    if (recToggle) recToggle.onclick = () => { UI.sfx.tap(); const rl = body.querySelector('#recList'); rl.hidden = !rl.hidden; };
    renderToneRow(body, module, item);
  }

  function startPractice(kind) {
    if (micCleanup) { micCleanup(); micCleanup = null; }
    TTS.stop();
    if (kind === 'trace') openTrace();
    else if (kind === 'follow') openFollow();
    else if (kind === 'quiz') openQuiz();
    else if (kind === 'chain') openChain();
    else openGame(kind);
  }

  /* 练习弹层通用外壳：nav + 返回学习 + 内容容器 */
  function practiceShell(active, inner) {
    const nav = document.getElementById('practiceNav');
    if (nav) nav.innerHTML = navHtml(active);
    const body = document.getElementById('practiceBody');
    body.innerHTML = `<button class="back-study" id="backStudy">← 返回选择练习</button>${inner}`;
    document.getElementById('backStudy').onclick = renderStudy;
    if (nav) bindNav(body);
    return body;
  }

  /* ----- 描红：画完就算完成（demo 语义，无覆盖判定） ----- */
  function openTrace() {
    const { module, index, item } = current;
    const againHint = Store.practiceDone(module, index, 'trace')
      ? '<div class="study-card"><div class="study-word">✍️ 描红练习</div><div class="study-sub">这个已经练过啦，再描一遍也很棒！</div></div>'
      : '<div class="study-card"><div class="study-word">✍️ 描红练习</div><div class="study-sub">沿着浅色字形慢慢描，画完就算完成</div></div>';
    practiceShell('trace', againHint + '<div id="traceHost"></div>');
    const scores = [];
    (function paint(k) {
      const host = document.getElementById('traceHost');
      host.innerHTML = '';
      const ch = item.trace[k];
      const head = document.createElement('div');
      head.className = 'trace-head';
      head.textContent = item.trace.length > 1 ? `描一描（${k + 1} / ${item.trace.length}）：${ch}` : `描一描：${ch}`;
      host.appendChild(head);
      host.appendChild(TracePad(ch, (score) => {
        scores.push(score);
        if (k + 1 < item.trace.length) paint(k + 1);
        else finishPractice('trace', '描得真棒！可以继续选择下一个练习环节', Math.round(scores.reduce((a, b) => a + b, 0) / scores.length));
      }));
    })(0);
  }

  /* ----- AI 跟读：两步手动——点话筒开始读，读完再点一次才结束评分（不再开口即发奖） ----- */
  function openFollow() {
    const item = current.item;
    const body = practiceShell('follow', `
      <div class="study-card">
        <div class="study-word">🎙️ AI跟读</div>
        <div class="study-sub">先听示范，点话筒开始读，读完再点一下结束</div>
        <button class="play-word" id="followPlay">🔊 播放示范</button>
        <button class="mic" id="micBtn" aria-label="开始录音跟读">🎤</button>
        <div class="follow-result tip" id="followStep">第 1 步：点击话筒，开始读</div>
        <div class="meter"><i id="meterBar"></i></div>
        <div class="follow-result tip" id="followResult">准备就绪，点击话筒开始读</div>
        <div id="clipHost"></div>
        <div style="margin-top:12px"><button class="primary ghost" id="followSkip">麦克风不方便？我读过啦</button></div>
      </div>`);
    const micBtn = body.querySelector('#micBtn');
    const meter = body.querySelector('#meterBar');
    const step = body.querySelector('#followStep');
    const result = body.querySelector('#followResult');
    const speakDemo = () => { UI.sfx.pop(); TTS.speak(item.play); };
    body.querySelector('#followPlay').onclick = speakDemo;
    body.querySelector('#followSkip').onclick = () => finishPractice('follow', '读得真棒！可以继续选择下一个练习环节', 1);
    setTimeout(speakDemo, 400);

    const clipHost = body.querySelector('#clipHost');
    let recording = false, abortParts = [], resolved = false, starting = false;
    let recorder = null, chunks = [], recT0 = 0, rafId = null;
    let heardText = '', spoke = false;
    function releaseStream() { abortParts.forEach(f => { try { f(); } catch (e) {} }); abortParts = []; }
    micCleanup = () => { recording = false; if (rafId) { cancelAnimationFrame(rafId); rafId = null; } releaseStream(); };
    function dropClip() { if (clipUrl) { URL.revokeObjectURL(clipUrl); clipUrl = null; } if (clipHost) clipHost.innerHTML = ''; }

    function startRecording() {
      UI.sfx.tap();
      if (starting) return;
      starting = true;
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        starting = false;
        if (!body.isConnected) { stream.getTracks().forEach(t => t.stop()); return; }
        recording = true; resolved = false; heardText = ''; spoke = false;
        dropClip();
        if (window.MediaRecorder) {
          try {
            chunks = [];
            recorder = new MediaRecorder(stream);
            recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
            recorder.onstop = () => {
              if (recorder.mimeType.includes('webm') && chunks.length) {
                const blob = new Blob(chunks, { type: recorder.mimeType });
                if (blob.size > 2000) {
                  clipUrl = URL.createObjectURL(blob);
                  if (clipHost.isConnected) clipHost.innerHTML = `<div class="clip-box"><span>🎧 听一听我读的</span><audio class="clip-audio" controls src="${clipUrl}"></audio></div>`;
                }
              }
            };
            recorder.start();
            recT0 = Date.now();
            abortParts.push(() => { try { if (recorder.state !== 'inactive') recorder.stop(); } catch (e) {} });
          } catch (e) { recorder = null; }
        }
        abortParts.push(() => stream.getTracks().forEach(t => t.stop()));
        startRecognition(stream);
        startVolumeMonitor(stream);
        micBtn.classList.add('listening'); micBtn.textContent = '👂';
        step.textContent = '第 2 步：正在录音，大声朗读…';
        result.textContent = '读完后再点一下红色按钮结束';
      }).catch(() => {
        starting = false;
        result.textContent = '麦克风不可用，点「我读过啦」也能通过哦';
      });
    }

    function stopAndScore() {
      if (resolved) return;
      resolved = true;
      const wasRecording = recording;
      recording = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (recorder && recorder.state !== 'inactive') { try { recorder.stop(); } catch (e) {} }
      releaseStream();
      micBtn.classList.remove('listening'); micBtn.textContent = '🎤';
      meter.style.width = '0%';
      if (!wasRecording) { result.textContent = '还没有开始录音哦，先点话筒开始读'; resolved = false; recording = false; return; }
      /* 评分：优先用识别文本，其次依据是否发出过声音（全程正向，不惩罚） */
      let sc, note;
      if (heardText.trim()) {
        sc = scoreFollow(heardText, item.follow.target);
        note = sc === 3 ? '听得清清楚楚，说得标准又流利 ✨' : '听到了！再贴近示范一点会更棒哦';
      } else { sc = spoke ? 2 : 1; note = spoke ? '听到了！你的声音真有精神 ✨' : '没有听清呢，可以再读一次，也能直接领奖励'; }
      showReview(sc, note);
    }

    /* 回放确认：先听自己读的，由用户点按钮才发分进入下一环节（不自动跳转） */
    function showReview(sc, note) {
      step.textContent = '🎧 听听自己读的，满意再领奖励';
      result.textContent = note;
      micBtn.style.display = 'none';
      let box = body.querySelector('#reviewBox');
      if (!box) {
        box = document.createElement('div');
        box.id = 'reviewBox';
        clipHost.after(box);
      }
      box.innerHTML = `<div class="flow-btns" style="margin-top:10px">
        <button class="primary ghost" id="followRetry">🔁 再读一次</button>
        <button class="primary" id="followClaim">✅ 完成跟读，领取奖励</button></div>`;
      box.querySelector('#followRetry').onclick = () => {
        UI.sfx.tap();
        box.remove();
        micBtn.style.display = '';
        step.textContent = '正在准备麦克风…';
        result.textContent = '马上开始录音，大声读出来';
        resolved = false;
        startRecording();
      };
      let awarding = false;
      box.querySelector('#followClaim').onclick = () => {
        if (awarding) return;
        awarding = true;
        UI.sfx.tap();
        clipHost.querySelectorAll('audio').forEach(a => { try { a.pause(); } catch (e) {} });
        box.remove();
        micBtn.style.display = '';
        finishPractice('follow', '读得真棒！可以继续选择下一个练习环节', sc);
      };
    }

    micBtn.onclick = () => { recording ? stopAndScore() : startRecording(); };

    /* 语音识别：连续模式累积最终文本，仅用于结束时的判分，不再自动过 */
    function startRecognition(stream) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return;
      let rec;
      try { rec = new SR(); } catch (e) { return; }
      rec.lang = item.follow.lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (ev) => {
        let finalTxt = '';
        for (let i = 0; i < ev.results.length; i++) {
          if (ev.results[i].isFinal) finalTxt += ev.results[i][0].transcript;
        }
        if (finalTxt.trim()) heardText = finalTxt.trim();
      };
      rec.onerror = () => {};
      rec.onend = () => { if (recording && !resolved) { try { rec.start(); } catch (e) {} } };
      abortParts.push(() => { try { rec.stop(); } catch (e) {} });
      try { rec.start(); } catch (e) {}
    }

    /* 实时音量条 + 记录是否发出过声音（不自动结束） */
    function startVolumeMonitor(stream) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ac = new AC();
      const srcNode = ac.createMediaStreamSource(stream);
      const ana = ac.createAnalyser(); ana.fftSize = 512;
      srcNode.connect(ana);
      const buf = new Uint8Array(ana.frequencyBinCount);
      const stopAudio = () => { if (rafId) cancelAnimationFrame(rafId); try { ac.close(); } catch (e) {} };
      abortParts.push(stopAudio);
      (function vol() {
        if (!recording || resolved) return;
        if (recorder && recorder.state === 'recording' && Date.now() - recT0 > 60000) { try { recorder.stop(); } catch (e) {} }
        ana.getByteTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
        meter.style.width = Math.min(100, peak * 1.6) + '%';
        if (peak > 26) spoke = true;
        rafId = requestAnimationFrame(vol);
      })();
    }
  }

  /* ----- 小游戏：听音识图 / 图文配对（3 选项，答对即发奖） ----- */
  function openGame(kind) {
    let miss = 0;
    const { module, index, item } = current;
    const list = LESSONS(module);
    const pos = list.indexOf(item);
    /* target + 顺序取 2 个不重复干扰项（demo gameChoices），展示时乱序 */
    const distract = [];
    for (let step = 1; step < list.length && distract.length < 2; step++) {
      const c = list[(pos + step) % list.length];
      if (c !== item && distract.every(d => d.quizVisual !== c.quizVisual)) distract.push(c);
    }
    const opts = shuffle([{ it: item, ok: true }, ...distract.map(it => ({ it, ok: false }))]);
    const prompt = kind === 'sound'
      ? `<div class="quiz-prompt">👂 听一听，哪一个是正确答案？</div>
         <button class="play-row" id="quizPlay"><span>🔊 再听一次</span><span class="rp">播放</span></button>`
      : `<div class="quiz-prompt">🧩 看一看，选出配对的答案</div>
         <div class="quiz-picture${[...String(item.quizVisual)].length > 6 ? ' math-count' : ''}">${item.quizVisual}</div><div class="quiz-label">${item.quizSub}</div>`;
    const body = practiceShell(kind, `
      <div class="study-card">
        ${prompt}
        <div class="opts" id="quizOpts"></div>
      </div>`);
    const optsEl = body.querySelector('#quizOpts');
    opts.forEach(o => {
      const b = document.createElement('button');
      b.className = 'quiz-option';
      b.dataset.ok = o.ok ? '1' : '';
      b.innerHTML = kind === 'sound'
        ? `<span class="quiz-picture sm">${o.it.quizVisual}</span><span class="quiz-label">${o.it.quizSub}</span>`
        : `<span class="quiz-word-opt">${o.it.quizLabel}</span>`;
      b.onclick = () => answerGame(b, o.ok, kind, () => miss++, () => miss);
      optsEl.appendChild(b);
    });
    if (kind === 'sound') {
      const play = () => { UI.sfx.pop(); TTS.speak(item.audio); };
      body.querySelector('#quizPlay').onclick = play;
      setTimeout(play, 400);
    }
  }
  function answerGame(btn, ok, kind, bumpMiss, peekMiss) {
    if (btn.classList.contains('correct')) return;
    if (ok) {
      btn.classList.add('correct'); UI.sfx.right();
      const m = peekMiss();
      finishPractice(kind, '答对啦！可以继续选择下一个练习环节', m === 0 ? 3 : m === 1 ? 2 : 1);
    } else {
      bumpMiss();
      btn.classList.add('wrong'); UI.sfx.wrong();
      UI.toast('再听一次，慢慢想一想');
      setTimeout(() => btn.classList.remove('wrong'), 550);
    }
  }

  /* ----- 口算闯关：连答 6~8 题，每题三选一，答错只鼓励不扣分 ----- */
  function openQuiz() {
    const { item } = current;
    const total = item.quizCount || 5;
    const qs = [];
    for (let i = 0; i < total; i++) qs.push(item.quizGen());
    const miss = qs.map(() => 0);
    let qi = 0;
    const body = practiceShell('quiz', `
      <div class="study-card">
        <div class="quiz-prompt">➗ 口算闯关（<b id="qNo">1</b> / ${total}）</div>
        <div class="quiz-progress" id="qDots"></div>
        <div id="qStage"></div>
      </div>`);
    const stage = body.querySelector('#qStage');
    const dots = body.querySelector('#qDots');
    const sayText = q => [{ text: q.prompt.replace(/[？?]$/, ''), lang: 'zh-CN' }];
    function paintDots() {
      dots.textContent = qs.map((_, i) => i < qi ? '★' : i === qi ? '●' : '☆').join(' ');
    }
    function renderQ() {
      const q = qs[qi];
      body.querySelector('#qNo').textContent = qi + 1;
      paintDots();
      const v = String(q.visual);
      const cls = /\n/.test(v) ? ' math-mult' : v.length > 7 ? ' math-long' : ' math';
      stage.innerHTML = `
        <div class="quiz-picture${cls}">${q.visual}</div>
        <div class="quiz-label">${q.prompt}</div>
        <button class="play-row play-again" id="qPlay"><span>🔊 再读一遍题</span><span class="rp">播放</span></button>
        <div class="opts" id="qOpts"></div>`;
      const opts = stage.querySelector('#qOpts');
      q.opts.forEach(v => {
        const b = document.createElement('button');
        b.className = 'quiz-option';
        b.innerHTML = `<span class="quiz-word-opt">${v}</span>`;
        b.onclick = () => {
          if (b.classList.contains('correct')) return;
          if (v === q.answer) {
            b.classList.add('correct'); UI.sfx.right();
            qi++;
            setTimeout(() => qi < qs.length ? renderQ() : finish(), 620);
          } else {
            miss[qi]++;
            b.classList.add('wrong'); UI.sfx.wrong();
            UI.toast('算错一道也没关系，再算一次～');
            setTimeout(() => b.classList.remove('wrong'), 550);
          }
        };
        opts.appendChild(b);
      });
      stage.querySelector('#qPlay').onclick = () => { UI.sfx.pop(); TTS.speak(sayText(q)); };
      setTimeout(() => TTS.speak(sayText(q)), 350);
    }
    function finish() {
      const m = miss.reduce((a, b) => a + b, 0);
      const sc = m === 0 ? 3 : m <= Math.ceil(total / 4) ? 2 : 1;
      finishPractice('quiz', `口算 ${total} 题全答完啦！`, sc);
    }
    renderQ();
  }

  /* ----- 接龙闯关：给出前一条成语，三选一接下一条（6 题，答错只鼓励） ----- */
  function openChain() {
    const { module, index, item } = current;
    const chain = item.chain;
    /* 干扰项池：全链条去重成语 */
    const pool = [];
    Object.keys(CHENGYU_CHAINS).forEach(c => CHENGYU_CHAINS[c].forEach(x => { if (pool.every(y => y[0] !== x[0])) pool.push(x); }));
    const links = [];
    for (let i = 0; i < chain.length - 1; i++) links.push(i);
    const total = Math.min(6, links.length);
    const qs = shuffle(links).slice(0, total).sort((a, b) => a - b).map(i => {
      const prev = chain[i], right = chain[i + 1];
      const tail = prev[0][prev[0].length - 1];
      const distract = shuffle(pool.filter(x => x[0] !== right[0] && x[0][0] !== tail && x[0][0] !== right[0][0])).slice(0, 2);
      return { prev, right, opts: shuffle([right, ...distract]) };
    });
    const miss = qs.map(() => 0);
    let qi = 0;
    const body = practiceShell('chain', `
      <div class="study-card">
        <div class="quiz-prompt">🐉 成语接龙闯关（<b id="cNo">1</b> / ${total}）</div>
        <div class="quiz-progress" id="cDots"></div>
        <div id="cStage"></div>
      </div>`);
    const stage = body.querySelector('#cStage');
    const dots = body.querySelector('#cDots');
    function paintDots() { dots.textContent = qs.map((_, i) => i < qi ? '★' : i === qi ? '●' : '☆').join(' '); }
    function renderQ() {
      const q = qs[qi];
      body.querySelector('#cNo').textContent = qi + 1;
      paintDots();
      stage.innerHTML = `
        <div class="chain-prev">「${q.prev[0]}」的下一个成语是什么？</div>
        <button class="play-row play-again" id="cPlay"><span>🔊 再读一遍题</span><span class="rp">播放</span></button>
        <div class="opts" id="cOpts"></div>`;
      const opts = stage.querySelector('#cOpts');
      q.opts.forEach(o => {
        const b = document.createElement('button');
        b.className = 'quiz-option';
        b.innerHTML = `<span class="quiz-word-opt">${o[0]}</span><small class="opt-py">${o[1]}</small>`;
        b.onclick = () => {
          if (b.classList.contains('correct')) return;
          if (o === q.right) {
            b.classList.add('correct'); UI.sfx.right();
            qi++;
            setTimeout(() => qi < qs.length ? renderQ() : finish(), 620);
          } else {
            miss[qi]++;
            b.classList.add('wrong'); UI.sfx.wrong();
            UI.toast('听一听首字，再试一次～');
            setTimeout(() => b.classList.remove('wrong'), 550);
          }
        };
        opts.appendChild(b);
      });
      const sayText = () => ({ text: `${q.prev[0]}。下一个成语是：${q.right[0]}`, lang: 'zh-CN' });
      stage.querySelector('#cPlay').onclick = () => { UI.sfx.pop(); TTS.speak(sayText()); };
      setTimeout(() => TTS.speak(sayText()), 350);
    }
    function finish() {
      const m = miss.reduce((a, b) => a + b, 0);
      const sc = m === 0 ? 3 : m <= Math.ceil(total / 3) ? 2 : 1;
      finishPractice('chain', `接龙 ${total} 题全接完啦，你也是接龙小高手！`, sc);
    }
    renderQ();
  }

  /* ----- 完成一个练习：即时发奖（无结算页）+ 打勾 + 解锁检查 ----- */
  function finishPractice(kind, msg, score) {
    const { module, index, item } = current;
    const sc = Math.min(3, Math.max(1, score || 3));
    const pct = [0.4, 0.7, 1][sc - 1];
    const again = Store.practiceDone(module, index, kind);
    const rw = again ? ECON.rewards[module].again : ECON.rewards[module].first;
    const pt = Math.max(4, Math.round(rw.p * pct));
    const st = rw.s ? Math.max(1, Math.round(rw.s * pct)) : 0;
    Store.recordPractice(module, index, kind, item.title, pt, sc);
    Store.addPoints(pt); Store.addStars(st);
    Store.state.minutes++;
    if (practicesOf(module, index).every(p => Store.practiceDone(module, index, p.kind))) {
      Store.markCompleted(Store.keyOf(module, index));
    }
    Store.save();
    UI.sfx.star(); UI.burst(again ? 40 : 80);
    const starTxt = '★'.repeat(sc) + '☆'.repeat(3 - sc);
    UI.toast(msg + ` ${starTxt}（${st ? '⭐+' + st + ' ' : ''}🟡+${pt}）`);
    TTS.speak({ text: msg, lang: 'zh-CN' });
    setTimeout(() => renderStudy(), 900);
    setTimeout(() => UI.checkUnlockCelebration(), 1000);
  }

  return { openStudy, startPractice, closeSheet, lessonDone, LESSONS, practicesOf };
})();
