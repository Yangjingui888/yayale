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

  const MODULE_NAME = { letters: '字母', words: '单词', pinyin: '拼音', hanzi: '汉字' };

  function closeSheet() {
    TTS.stop();
    if (micCleanup) { micCleanup(); micCleanup = null; }
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
      }).join('')}</div>`;
    body.parentElement.querySelectorAll('.action-grid [data-kind]').forEach(b => {
      b.onclick = () => { UI.sfx.tap(); startPractice(b.dataset.kind); };
    });
    bindNav(body);
    document.getElementById('studyPlay').onclick = () => { UI.sfx.pop(); TTS.speak(item.play); };
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
    (function paint(k) {
      const host = document.getElementById('traceHost');
      host.innerHTML = '';
      const ch = item.trace[k];
      const head = document.createElement('div');
      head.className = 'trace-head';
      head.textContent = item.trace.length > 1 ? `描一描（${k + 1} / ${item.trace.length}）：${ch}` : `描一描：${ch}`;
      host.appendChild(head);
      host.appendChild(TracePad(ch, () => {
        if (k + 1 < item.trace.length) paint(k + 1);
        else finishPractice('trace', '描得真棒！可以继续选择下一个练习环节');
      }));
    })(0);
  }

  /* ----- AI 跟读：语音识别优先，音量兜底，开口即过（demo 流程） ----- */
  function openFollow() {
    const item = current.item;
    const body = practiceShell('follow', `
      <div class="study-card">
        <div class="study-word">🎙️ AI跟读</div>
        <div class="study-sub">先听示范，再点话筒大声读出来</div>
        <button class="play-word" id="followPlay">🔊 播放示范</button>
        <button class="mic" id="micBtn" aria-label="开始录音跟读">🎤</button>
        <div class="meter"><i id="meterBar"></i></div>
        <div class="follow-result tip" id="followResult">点击话筒开始跟读</div>
        <div style="margin-top:12px"><button class="primary ghost" id="followSkip">麦克风不方便？我读过啦</button></div>
      </div>`);
    const micBtn = body.querySelector('#micBtn');
    const meter = body.querySelector('#meterBar');
    const result = body.querySelector('#followResult');
    const speakDemo = () => { UI.sfx.pop(); TTS.speak(item.play); };
    body.querySelector('#followPlay').onclick = speakDemo;
    body.querySelector('#followSkip').onclick = () => finishPractice('follow', '读得真棒！可以继续选择下一个练习环节');
    setTimeout(speakDemo, 400);

    let listening = false, stopFn = null, resolved = false;
    micCleanup = () => { listening = false; if (stopFn) { stopFn(); stopFn = null; } };

    micBtn.onclick = async () => {
      if (listening) { micCleanup(); micBtn.classList.remove('listening'); micBtn.textContent = '🎤'; result.textContent = '点击话筒开始跟读'; return; }
      UI.sfx.tap();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        listening = true; resolved = false;
        micBtn.classList.add('listening'); micBtn.textContent = '👂';
        result.textContent = '正在听…大声读出来吧！';
        startRecognition(stream) || startVolumeMonitor(stream);
      } catch (e) {
        result.textContent = '麦克风不可用，点「我读过啦」也能通过哦';
      }
    };

    function doneFollow(msg) {
      if (resolved) return;
      resolved = true;
      micCleanup();
      micBtn.classList.remove('listening'); micBtn.textContent = '🎤';
      meter.style.width = '0%';
      result.textContent = msg;
      finishPractice('follow', '读得真棒！可以继续选择下一个练习环节');
    }

    /* 优先：SpeechRecognition，听到内容即算成功（demo hearing 即过） */
    function startRecognition(stream) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { stream.getTracks().forEach(t => t.stop()); return null; }
      let rec;
      try { rec = new SR(); } catch (e) { stream.getTracks().forEach(t => t.stop()); return null; }
      let fellBack = false;
      rec.lang = item.follow.lang;
      rec.interimResults = true;
      rec.continuous = false;
      const fallback = () => {
        if (fellBack || resolved) return;
        fellBack = true;
        try { rec.abort(); } catch (e) {}
        startVolumeMonitor(stream);
      };
      rec.onresult = (ev) => {
        const t = Array.from(ev.results).map(r => r[0].transcript).join('').trim();
        if (t) doneFollow('听到了！你说得很棒 ✨');
      };
      rec.onerror = (ev) => { if (ev.error !== 'aborted' && listening) fallback(); };
      stopFn = () => { try { rec.abort(); } catch (e) {} };
      try { rec.start(); } catch (e) { return null; }
      /* 6.5s 未识别到 → 音量兜底 */
      setTimeout(fallback, 6500);
      return true;
    }

    /* 兜底：音量检测，开口即过（demo monitorFollowAudio） */
    function startVolumeMonitor(stream) {
      if (resolved) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      const ac = new AC();
      const src = ac.createMediaStreamSource(stream);
      const ana = ac.createAnalyser(); ana.fftSize = 512;
      src.connect(ana);
      const buf = new Uint8Array(ana.frequencyBinCount);
      let rafId = null; const t0 = Date.now();
      const prevStop = stopFn;
      stopFn = () => { listening = false; if (rafId) cancelAnimationFrame(rafId); try { ac.close(); } catch (e) {} if (prevStop) prevStop(); stream.getTracks().forEach(t => t.stop()); };
      (function vol() {
        if (!listening || resolved) return;
        ana.getByteTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
        meter.style.width = Math.min(100, peak * 1.6) + '%';
        if (peak > 26) { doneFollow('听到了！你的声音真有精神 ✨'); return; }
        if (Date.now() - t0 > 8000) {
          micCleanup();
          micBtn.classList.remove('listening'); micBtn.textContent = '🎤';
          result.textContent = '没有听清呢，再试一次，或点「我读过啦」';
          return;
        }
        rafId = requestAnimationFrame(vol);
      })();
    }
  }

  /* ----- 小游戏：听音识图 / 图文配对（3 选项，答对即发奖） ----- */
  function openGame(kind) {
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
      b.onclick = () => answerGame(b, o.ok, kind);
      optsEl.appendChild(b);
    });
    if (kind === 'sound') {
      const play = () => { UI.sfx.pop(); TTS.speak(item.audio); };
      body.querySelector('#quizPlay').onclick = play;
      setTimeout(play, 400);
    }
  }
  function answerGame(btn, ok, kind) {
    if (btn.classList.contains('correct')) return;
    if (ok) {
      btn.classList.add('correct'); UI.sfx.right();
      finishPractice(kind, '答对啦！可以继续选择下一个练习环节');
    } else {
      btn.classList.add('wrong'); UI.sfx.wrong();
      UI.toast('再听一次，慢慢想一想');
      setTimeout(() => btn.classList.remove('wrong'), 550);
    }
  }

  /* ----- 完成一个练习：即时发奖（无结算页）+ 打勾 + 解锁检查 ----- */
  function finishPractice(kind, msg) {
    const { module, index, item } = current;
    const again = Store.practiceDone(module, index, kind);
    const rw = again ? ECON.rewards[module].again : ECON.rewards[module].first;
    Store.recordPractice(module, index, kind, item.title, rw.p);
    Store.addPoints(rw.p); Store.addStars(rw.s);
    Store.state.minutes++;
    if (PRACTICES.every(p => Store.practiceDone(module, index, p.kind))) {
      Store.markCompleted(Store.keyOf(module, index));
    }
    Store.save();
    UI.sfx.star(); UI.burst(again ? 40 : 80);
    UI.toast(msg + `（🟡+${rw.p}${rw.s ? ' ⭐+' + rw.s : ''}）`);
    TTS.speak({ text: msg, lang: 'zh-CN' });
    setTimeout(() => renderStudy(), 900);
    setTimeout(() => UI.checkUnlockCelebration(), 1000);
  }

  return { openStudy, startPractice, closeSheet, lessonDone, LESSONS };
})();
