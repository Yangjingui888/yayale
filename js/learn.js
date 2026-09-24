/* ============ demo 练习引擎：课时学习弹层 + 四练习任意点选、独立完成、独立发奖、打勾记忆 ============ */

/* 四种练习（demo action-grid 同款顺序与文案） */
const PRACTICES = [
  { kind: 'trace',  icon: '✍️', label: '描红练习' },
  { kind: 'follow', icon: '🎙️', label: 'AI跟读' },
  { kind: 'sound',  icon: '👂', label: '听音识图' },
  { kind: 'match',  icon: '🧩', label: '图文配对' },
];

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
        sub: `拼读音 /${a.ph}/ · ${w0[0]} ${w0[1]} · ${w1[0]} ${w1[1]}`,
        play: [{ text: `${a.L}. ${a.L.toLowerCase()}.`, lang: 'en-US' },
               { text: `${a.L} says ${a.ph}. ${w0[0]}. ${w1[0]}`, lang: 'en-US' }],
        follow: { lang: 'en-US', target: w0[0], demo: `${a.L} says ${a.ph}. ${w0[0]}` },
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
      play: [{ text: `${p[1]}，${p[2]}`, lang: 'zh-CN' }],
      follow: { lang: 'zh-CN', target: p[2], demo: `${p[1]}，${p[2]}` },
      trace: [p[0]],
      audio: [{ text: `${p[2]}，${p[1]}`, lang: 'zh-CN' }],
      quizVisual: p[3], quizLabel: p[0], quizSub: p[1],
    })));
  } else {
    HANZI_GROUPS.forEach((g, gi) => g.items.forEach((h, ii) => list.push({
      id: gi + '_' + ii, title: `汉字 ${h[0]}`,
      visual: h[0],
      sub: `${h[1]} · ${h[2]} · ${g.name}`,
      play: [{ text: `${h[0]}。${h[2]}。`, lang: 'zh-CN' }],
      follow: { lang: 'zh-CN', target: h[2], demo: `${h[0]}，${h[2]}` },
      trace: [h[0]],
      audio: [{ text: `${h[2]}，${h[0]}`, lang: 'zh-CN' }],
      quizVisual: h[3], quizLabel: h[0], quizSub: h[2],
    })));
  }
  LESSON_CACHE[module] = list;
  return list;
}
function lessonOf(module, index) {
  return LESSONS(module).find(l => String(l.id) === String(index));
}
/* 课时整体完成（四练习全打勾） */
function lessonDone(module, index) {
  return PRACTICES.every(p => Store.practiceDone(module, index, p.kind));
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

  const MODULE_NAME = { letters: '字母', words: '单词', pinyin: '拼音', hanzi: '汉字' };
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

  /* ----- 四段条（active / done✓），点击切换练习 ----- */
  function navHtml(active) {
    if (!current) return '';
    const { module, index } = current;
    return `<div class="practice-nav">${PRACTICES.map(p => {
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
        <button class="play-row" id="studyPlay"><span>🔊 点我听标准发音</span><span class="rp">播放</span></button>
      </div>
      <div class="action-grid">${PRACTICES.map(p => {
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
    const recToggle = body.querySelector('#recToggle');
    if (recToggle) recToggle.onclick = () => { UI.sfx.tap(); const rl = body.querySelector('#recList'); rl.hidden = !rl.hidden; };
    setTimeout(() => TTS.speak(item.play), 500);
  }

  function startPractice(kind) {
    if (micCleanup) { micCleanup(); micCleanup = null; }
    TTS.stop();
    if (kind === 'trace') openTrace();
    else if (kind === 'follow') openFollow();
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
    let recording = false, abortParts = [], resolved = false;
    let recorder = null, chunks = [], recT0 = 0, rafId = null;
    let heardText = '', spoke = false;
    function releaseStream() { abortParts.forEach(f => { try { f(); } catch (e) {} }); abortParts = []; }
    micCleanup = () => { recording = false; if (rafId) { cancelAnimationFrame(rafId); rafId = null; } releaseStream(); };
    function dropClip() { if (clipUrl) { URL.revokeObjectURL(clipUrl); clipUrl = null; } if (clipHost) clipHost.innerHTML = ''; }

    function startRecording() {
      UI.sfx.tap();
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
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
        micBtn.classList.add('listening'); micBtn.textContent = '🛑';
        step.textContent = '第 2 步：正在录音，大声朗读…';
        result.textContent = '读完后再点一下红色按钮结束';
      }).catch(() => {
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
      let sc;
      if (heardText.trim()) sc = scoreFollow(heardText, item.follow.target);
      else sc = spoke ? 2 : 1;
      finishPractice('follow', '读得真棒！可以继续选择下一个练习环节', sc);
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
         <div class="quiz-picture">${item.quizVisual}</div><div class="quiz-label">${item.quizSub}</div>`;
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
    if (PRACTICES.every(p => Store.practiceDone(module, index, p.kind))) {
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

  return { openStudy, startPractice, closeSheet, lessonDone, LESSONS };
})();
