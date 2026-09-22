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

  function speakOne(text, lang, rate) {
    return new Promise(res => {
      if (!synth || !enabled) return res();
      try { synth.cancel(); } catch (e) {}
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      const v = pickVoice(lang);
      if (v) u.voice = v;
      u.rate = rate || (isChildLang(lang) ? 0.85 : 0.9);
      u.pitch = 1.15;              // 稍微偏高，更活泼亲和
      u.onend = u.onerror = () => res();
      synth.speak(u);
      /* 兜底：部分内核 onend 不触发 */
      setTimeout(res, Math.min(9000, 1500 + text.length * 260));
    });
  }
  const isChildLang = l => l.startsWith('zh');

  /* 依次朗读多段（如：字母名 → 拼读音 → 单词） */
  async function speak(items) {
    if (!Array.isArray(items)) items = [items];
    for (const it of items) {
      const { text, lang, rate } = typeof it === 'string' ? { text: it } : it;
      await speakOne(text, lang || 'en-US', rate);
    }
  }
  function stop() { try { synth && synth.cancel(); } catch (e) {} }
  function setEnabled(b) { enabled = b; if (!b) stop(); }

  return { speak, stop, setEnabled };
})();
