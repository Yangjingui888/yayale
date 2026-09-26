/* ============ 语音引擎：浏览器内置 TTS（离线可用，无需后台） ============ */
const TTS = (() => {
  const synth = window.speechSynthesis || null;
  let voices = [];
  let enabled = true;
  /* 播放代次令牌：每次新播放/停止自增，旧队列发现被取代即中断，杜绝连点叠加与重复发声 */
  let gen = 0;

  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices();
  }
  if (synth) {
    loadVoices();
    synth.onvoiceschanged = loadVoices;
  }

  /* 为孩子挑选最自然的音色：优先儿童/可爱系本地音色 */
  function pickVoice(lang) {
    if (!voices.length) loadVoices();
    const isZh = lang.startsWith('zh');
    const pool = voices.filter(v => (isZh ? /^zh/i : /^en/i).test(v.lang));
    if (!pool.length) return null;
    const prefer = isZh
      ? ['Xiaoyi', 'Xiaoxiao', 'Tiantian', 'Mei-Jia', '婷婷', '燕妮', 'Sinji']
      : ['Ana', 'Zira', 'Samantha', 'Google UK English Female', 'Karen', 'Kitty'];
    for (const p of prefer) {
      const v = pool.find(v => v.name.includes(p));
      if (v) return v;
    }
    const local = pool.find(v => !v.name.includes('Google'));
    return local || pool[0];
  }

  /* 设备是否有该语言的本地音色（无音色时 speak 多半不发声，直接走网络兜底） */
  function hasVoiceFor(lang) {
    if (!synth) return false;
    if (!voices.length) loadVoices();
    if (!voices.length) return true;   // 音色表延迟加载（Chrome 冷启动），先交给原生+看门狗判断
    const isZh = (lang || '').startsWith('zh');
    return voices.some(v => (isZh ? /^zh/i : /^en/i).test(v.lang));
  }

  function speakOne(text, lang, rate, myGen, pitch) {
    return new Promise(res => {
      if (!enabled || !String(text).trim() || myGen !== gen) return res();
      if (!synth || !hasVoiceFor(lang)) { netSpeak(text, lang, myGen).finally(res); return; }
      /* Chrome 已知 bug：引擎空闲时同帧 cancel() 紧接 speak() 也会吞掉发声；
         仅在引擎真在忙时才 cancel，并稍等一拍再 speak，再开始新 utterance */
      const busy = synth.speaking || synth.pending;
      if (busy) { try { synth.cancel(); } catch (e) {} }
      /* 平板/iOS 修复：播报前先 resume，解除引擎被挂起导致的“无声” */
      try { synth.resume(); } catch (e) {}
      if (busy) { setTimeout(() => start(), 80); } else { start(); }
      function start() {
      if (myGen !== gen || !enabled) { res(); return; }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      const v = pickVoice(lang);
      if (v) u.voice = v;
      u.rate = rate || (isChildLang(lang) ? 0.85 : 0.9);
      /* 拼音等单字标准发音可传 pitch:1 用自然音高，避免机械变调导致读音不标准 */
      u.pitch = pitch || 1.15;       // 默认稍微偏高，更活泼亲和
      let done = false, started = false;
      /* 预声明计时器句柄：部分内核会在 speak() 后同步触发 onend/onerror，若用 const 后置声明会命中 TDZ 报错 */
      let watchdog = null, keep = null;
      /* 引擎是否有发声迹象：onstart 触发过，或 synth 正处于 speaking/pending（很多内核不发 onstart 但其实已在读） */
      const nativeAlive = () => started || (synth && (synth.speaking || synth.pending));
      /* 仅在确认原生没在发声时才走网络兜底，杜绝「原生人声 + 网络人声」同时叠加 */
      const fallback = () => {
        if (myGen !== gen) { res(); return; }
        if (nativeAlive()) { res(); return; }
        try { synth.cancel(); } catch (e) {}
        netSpeak(text, lang, myGen).finally(res);
      };
      const finish = ok => {
        if (done) return; done = true;
        clearInterval(keep); clearTimeout(watchdog);
        if (!ok) fallback(); else res();
      };
      u.onstart = () => { started = true; };
      u.onend = () => finish(true);
      u.onerror = () => finish(false);
      synth.speak(u);
      /* 看门狗：1.2s 内既没有 onstart，synth 也未处于 speaking/pending → 判定该引擎不可用，走网络兜底；
         若仅 onstart 不触发但引擎确实在发声，则视为原生正常，绝不再叠加网络音 */
      watchdog = setTimeout(() => { if (!started) { if (synth && (synth.speaking || synth.pending)) { started = true; } else finish(false); } }, 1200);
      /* 平板/iOS 修复：部分内核对较长文本会中途挂起不再发声，定时 pause+resume 保活；被取代则停保活 */
      keep = setInterval(() => {
        if (myGen !== gen) { clearInterval(keep); return; }
        if (!synth.speaking && !synth.pending) { clearInterval(keep); return; }
        try { synth.pause(); synth.resume(); } catch (e) {}
      }, 3500);
      /* 兜底：部分内核 onend 不触发；到点仍无任何发声迹象按失败处理，否则视为正常结束 */
      setTimeout(() => { nativeAlive() ? finish(true) : finish(false); }, Math.min(15000, 1500 + text.length * 260));
      }
    });
  }
  const isChildLang = l => l.startsWith('zh');

  /* ---------- 网络兜底 TTS（小米等国产品牌平板常缺系统引擎） ----------
     英文：有道 dictvoice（实测单句可靠，去标点后整句可播）
     中文：dictvoice 常不支持，逐段尝试；全部失败时提示家长开启系统 TTS */
  const netCache = new Set();
  let netFailedZh = false, zhHintShown = false;
  function stripPunct(t) { return t.replace(/[。，！？；：、,.!?;:]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function netSpeak(text, lang, myGen) {
    const isZh = (lang || '').startsWith('zh');
    const parts = (isZh ? text.split(/[。，！？；、,.!?;:\s]+/) : [stripPunct(text)])
      .map(s => s.trim()).filter(Boolean);
    let i = 0;
    function next() {
      if (!enabled || myGen !== gen || i >= parts.length) {
        if (myGen === gen && isZh && netFailedZh && !zhHintShown) {
          zhHintShown = true;
          try { UI.toast('本机无法合成中文语音：请用 Chrome/Edge 打开本页，或在系统设置→语音播报(文字转语音)启用 TTS 引擎'); } catch (e) {}
        }
        return Promise.resolve();
      }
      return netPlayOne(parts[i++], false, myGen).then(ok => {
        if (myGen !== gen) return Promise.resolve();
        if (ok) return new Promise(r => setTimeout(r, isZh ? 150 : 350)).then(next);
        if (isZh) { netFailedZh = true; return; }
        /* 英文整句失败 → 拆成单词逐个重试一次（dictvoice 对部分句子会 500） */
        const seg = parts[i - 1], words = seg.split(/\s+/).filter(Boolean);
        if (words.length > 1) {
          let j = 0;
          const wordNext = () => {
            if (myGen !== gen) return Promise.resolve();
            while (j < words.length && netCache.has(lang + '|' + words[j])) j++;
            if (j >= words.length) return Promise.resolve();
            return netPlayOne(words[j++], true, myGen).then(wordNext);
          };
          return wordNext().then(() => new Promise(r => setTimeout(r, 250)).then(next));
        }
        return next();   // 单词也失败则跳过
      });
    }
    return next();
    function netPlayOne(seg, isWord, myGen) {
      const key = lang + '|' + seg;
      if (netCache.has(key)) return Promise.resolve(true);
      if (myGen !== gen) return Promise.resolve(false);
      const url = 'https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent(seg) + '&type=1';
      return new Promise(res => {
        const a = new Audio(url);
        lastAudio = a;
        let settled = false;
        const finish = ok => {
          if (settled) return; settled = true;
          clearTimeout(kill);
          if (ok && myGen === gen) { netCache.add(key); if (netCache.size > 800) netCache.clear(); }
          res(ok);
        };
        a.onended = () => finish(true);
        a.onerror = () => finish(false);
        const kill = setTimeout(() => { try { a.pause(); } catch (e) {} finish(false); }, isWord ? 5000 : 9000);
        a.play().catch(() => { clearTimeout(kill); finish(false); });
      });
    }
  }
  let lastAudio = null;

  /* 首次用户手势内解锁语音引擎（平板/iOS 要求 speak 必须由交互触发一次） */
  function unlock() {
    if (!synth) return;
    try {
      try { synth.resume(); } catch (e) {}
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0; u.rate = 1;
      synth.speak(u);
    } catch (e) {}
  }

  /* 依次朗读多段（如：字母名 → 拼读音 → 单词）；新一轮取代旧队列 */
  async function speak(items) {
    const myGen = ++gen;
    /* 只在引擎真在忙时 cancel（speakOne 内部自行处理取消+缓冲，避开 Chrome 同帧 cancel 吞声 bug） */
    try { if (synth && (synth.speaking || synth.pending)) synth.cancel(); } catch (e) {}
    try { if (lastAudio) { lastAudio.pause(); lastAudio = null; } } catch (e) {}
    if (!Array.isArray(items)) items = [items];
    for (const it of items) {
      if (myGen !== gen || !enabled) return;
      const { text, lang, rate, pitch } = typeof it === 'string' ? { text: it } : it;
      await speakOne(text, lang || 'en-US', rate, myGen, pitch);
    }
  }
  function stop() {
    gen++;   // 使进行中的 speak 队列在下个检查点中断
    try { synth && synth.cancel(); } catch (e) {}
    try { if (lastAudio) { lastAudio.pause(); lastAudio = null; } } catch (e) {}
  }
  function setEnabled(b) { enabled = b; if (!b) stop(); }

  return { speak, stop, setEnabled, unlock };
})();
