/* ============ 语音引擎：浏览器内置 TTS（离线可用，无需后台） ============ */
const TTS = (() => {
  const synth = window.speechSynthesis || null;
  let voices = [];
  let enabled = true;

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

  function speakOne(text, lang, rate) {
    return new Promise(res => {
      if (!enabled || !String(text).trim()) return res();
      if (!synth || !hasVoiceFor(lang)) { netSpeak(text, lang).finally(res); return; }
      try { synth.cancel(); } catch (e) {}
      /* 平板/iOS 修复：播报前先 resume，解除引擎被挂起导致的“无声” */
      try { synth.resume(); } catch (e) {}
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      const v = pickVoice(lang);
      if (v) u.voice = v;
      u.rate = rate || (isChildLang(lang) ? 0.85 : 0.9);
      u.pitch = 1.15;              // 稍微偏高，更活泼亲和
      let done = false, started = false;
      const finish = ok => {
        if (done) return; done = true;
        clearInterval(keep); clearTimeout(watchdog);
        /* 引擎未真正开声（平板常见：无引擎/无该语言音色）→ 网络兜底 */
        if (!ok) { netSpeak(text, lang).finally(res); } else res();
      };
      u.onstart = () => { started = true; };
      u.onend = () => finish(true);
      u.onerror = () => finish(false);
      synth.speak(u);
      /* 看门狗仅在不支持 onstart 的老内核禁用，避免无谓等待 */
      const onstartSupported = 'onstart' in u;
      /* 1.2s 内引擎没有开声回调，判定该引擎不可用，取消并走网络兜底 */
      const watchdog = onstartSupported && setTimeout(() => { if (!started) { try { synth.cancel(); } catch (e) {} finish(false); } }, 1200);
      /* 平板/iOS 修复：部分内核对较长文本会中途挂起不再发声，定时 pause+resume 保活 */
      const keep = setInterval(() => {
        if (!synth.speaking && !synth.pending) { clearInterval(keep); return; }
        try { synth.pause(); synth.resume(); } catch (e) {}
      }, 3500);
      /* 兜底：部分内核 onend 不触发 */
      setTimeout(() => finish(true), Math.min(15000, 1500 + text.length * 260));
    });
  }
  const isChildLang = l => l.startsWith('zh');

  /* ---------- 网络兜底 TTS（小米等国产品牌平板常缺系统引擎） ----------
     英文：有道 dictvoice（实测单句可靠，去标点后整句可播）
     中文：dictvoice 常不支持，逐段尝试；全部失败时提示家长开启系统 TTS */
  const netCache = new Set();
  let netFailedZh = false, zhHintShown = false;
  function stripPunct(t) { return t.replace(/[。，！？；：、,.!?;:]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function netSpeak(text, lang) {
    const isZh = (lang || '').startsWith('zh');
    const parts = (isZh ? text.split(/[。，！？；、,.!?;:\s]+/) : [stripPunct(text)])
      .map(s => s.trim()).filter(Boolean);
    let i = 0;
    function next() {
      if (!enabled || i >= parts.length) {
        if (isZh && netFailedZh && !zhHintShown) {
          zhHintShown = true;
          try { UI.toast('本机未开启中文语音：请到 系统设置 → 语音播报/文字转语音 启用 TTS 引擎'); } catch (e) {}
        }
        return Promise.resolve();
      }
      return netPlayOne(parts[i++]).then(ok => {
        if (ok) return new Promise(r => setTimeout(r, isZh ? 150 : 350)).then(next);
        if (isZh) { netFailedZh = true; return; }
        /* 英文整句失败 → 拆成单词逐个重试一次（dictvoice 对部分句子会 500） */
        const seg = parts[i - 1], words = seg.split(/\s+/).filter(Boolean);
        if (words.length > 1) {
          let j = 0;
          const wordNext = () => {
            while (j < words.length && netCache.has(lang + '|' + words[j])) j++;
            if (j >= words.length) return Promise.resolve();
            return netPlayOne(words[j++], true).then(wordNext);
          };
          return wordNext().then(() => new Promise(r => setTimeout(r, 250)).then(next));
        }
        return next();   // 单词也失败则跳过
      });
    }
    return next();
    function netPlayOne(seg, isWord) {
      const key = lang + '|' + seg;
      if (netCache.has(key)) return Promise.resolve(true);
      const url = 'https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent(seg) + '&type=1';
      return new Promise(res => {
        const a = new Audio(url);
        lastAudio = a;
        let settled = false;
        const finish = ok => {
          if (settled) return; settled = true;
          clearTimeout(kill);
          if (ok) { netCache.add(key); if (netCache.size > 800) netCache.clear(); }
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

  /* 依次朗读多段（如：字母名 → 拼读音 → 单词） */
  async function speak(items) {
    if (!Array.isArray(items)) items = [items];
    for (const it of items) {
      const { text, lang, rate } = typeof it === 'string' ? { text: it } : it;
      await speakOne(text, lang || 'en-US', rate);
    }
  }
  function stop() {
    try { synth && synth.cancel(); } catch (e) {}
    try { if (lastAudio) { lastAudio.pause(); lastAudio = null; } } catch (e) {}
  }
  function setEnabled(b) { enabled = b; if (!b) stop(); }

  return { speak, stop, setEnabled, unlock };
})();
