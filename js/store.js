/* ============ 全局状态（demo 状态模型 + localStorage 本地存档） ============ */
const Store = (() => {
  const KEY = 'qiqu启蒙乐园v1';
  const defaultState = () => ({
    v: 2,                   // 存档版本：旧版结构自动重置
    points: 0,              // 积分余额（购粮消耗；买皮肤耗星星）
    stars: 0,               // 星星余额
    lifetimePoints: 0,      // 累计积分（解锁依据，只增不减）
    completed: [],          // 已完成的课时 key（首次通关判定）
    practiceRecords: [],    // 练习记录（近 500 条，练习打勾依据）
    learned: { letters: 0, words: 0, hanzi: 0, pinyin: 0 },
    minutes: 0,             // 总学习分钟（completeTask +1，兼容 tick 秒表）
    seconds: 0,
    timer: 10,              // 防沉迷分钟（demo 默认 10；0=不限）
    motion: true,           // 动画效果
    clean: true,            // 纯净模式（徽章展示）
    pet: 0,                 // 当前查看的宠物索引
    affection: {},          // {petIdx: 好感值}（Lv = floor(aff/20)+1，封顶 5）
    food: {},               // {petIdx: 食物库存}（上限 99）
    skinOwned: {},          // {petIdx: {skinId: true}}（forest 恒拥有）
    skinEquipped: {},       // {petIdx: skinId}
    daily: { date: '', keys: [] },   // 今日练过的课时（首页进度卡）
  });

  let s = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && obj.v === 2) return Object.assign(defaultState(), obj);   // 旧结构自动重置
      }
    } catch (e) {}
    return defaultState();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    window.dispatchEvent(new Event('qsave'));
  }

  /* ---------- 双货币 ---------- */
  function bump(el) { if (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } }
  function addStars(n) { if (n) { s.stars += n; bump(document.getElementById('hudStars')); save(); } }
  function addPoints(n) {
    if (n > 0) { s.lifetimePoints += n; checkUnlock(); }
    s.points += n; bump(document.getElementById('hudPoints')); save();
  }
  function spendStars(n) { if (s.stars < n) return false; s.stars -= n; save(); return true; }
  function spendPoints(n) { if (s.points < n) return false; s.points -= n; save(); return true; }

  /* ---------- 宠物解锁（严格 A-Z，累计积分达标自动解锁，不扣除） ---------- */
  let unlockQueue = [];
  function unlockCount() {
    let n = 0;
    for (let i = 0; i < 26; i++) { if (s.lifetimePoints >= ECON.unlockAt(i)) n++; else break; }
    return n;
  }
  function checkUnlock() {
    const n = unlockCount();
    while ((s._seenUnlocks || (s._seenUnlocks = s._lastSeen || 0)) < n) {
      s._seenUnlocks++;
      unlockQueue.push(s._seenUnlocks - 1);
    }
  }
  /* 兼容：启动时把已解锁但未庆祝的补进队列（仅一次） */
  function initUnlockQueue() {
    if (s._lastSeen === undefined) s._lastSeen = unlockCount();
    const n = unlockCount();
    for (let i = s._lastSeen; i < n; i++) unlockQueue.push(i);
    s._seenUnlocks = n; s._lastSeen = n;
  }
  function popUnlock() { const v = unlockQueue.shift(); if (unlockQueue.length === 0) { s._lastSeen = unlockCount(); save(); } return v === undefined ? null : v; }
  function peekUnlock() { return unlockQueue.length ? unlockQueue[0] : null; }

  /* ---------- 养成 ---------- */
  function petLevel(idx) { return Math.min(ECON.maxLevel, Math.floor(Number(s.affection[idx] || 0) / ECON.feedGain) + 1); }
  function petAff(idx) {
    const lv = petLevel(idx);
    if (lv >= ECON.maxLevel) return 100;
    return Math.round((Number(s.affection[idx] || 0) % ECON.feedGain) / ECON.feedGain * 100);
  }
  function isUnlocked(idx) { return idx < unlockCount(); }
  function addFood(idx, n) { s.food[idx] = Math.min(ECON.foodCap, (s.food[idx] || 0) + n); save(); }
  function foodCount(idx) { return s.food[idx] || 0; }
  function takeFood(idx) { if (!s.food[idx]) return false; s.food[idx]--; save(); return true; }
  function addAffection(idx, n) { s.affection[idx] = Number(s.affection[idx] || 0) + n; save(); }
  function skinOwned(idx, id) { return id === 'forest' || !!(s.skinOwned[idx] && s.skinOwned[idx][id]); }
  function buySkin(idx, id) { s.skinOwned[idx] = Object.assign({}, s.skinOwned[idx], { [id]: true }); save(); }
  function equipSkin(idx, id) { s.skinEquipped[idx] = id; save(); }
  function curSkin(idx) { return s.skinEquipped[idx] || 'forest'; }

  /* ---------- 课时完成 / 练习打勾 ---------- */
  function isCompleted(key) { return s.completed.includes(key); }
  function markCompleted(key) { if (!s.completed.includes(key)) { s.completed.push(key); s.learned[learnedKey(key)] = (s.learned[learnedKey(key)] || 0) + 1; } }
  function learnedKey(key) { return key.split('-')[0]; }
  function recordPractice(module, index, kind, title, value) {
    s.practiceRecords.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), module, index, kind, title, value, completedAt: new Date().toISOString() });
    if (s.practiceRecords.length > 500) s.practiceRecords = s.practiceRecords.slice(-500);
    markDaily(keyOf(module, index));
  }
  function practiceDone(module, index, kind) {
    return s.practiceRecords.some(r => r.module === module && String(r.index) === String(index) && (r.kind === kind || (kind === 'sound' && r.kind === 'game')));
  }
  const keyOf = (module, index) => module + '-' + index;

  /* ---------- 学习时长 ---------- */
  function tick(sec) { s.seconds += sec; }

  /* ---------- 今日进度（首页卡：今天练过的课时数，封顶 4） ---------- */
  function todayStr() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function markDaily(key) {
    if (s.daily.date !== todayStr()) s.daily = { date: todayStr(), keys: [] };
    if (!s.daily.keys.includes(key)) s.daily.keys.push(key);
  }
  function dailyCount() { return s.daily.date === todayStr() ? Math.min(4, s.daily.keys.length) : 0; }

  /* ---------- 统计（家长中心，照 demo renderParent） ---------- */
  function stats() {
    const n = unlockCount();
    let affSum = 0;
    for (let i = 0; i < n; i++) affSum += Number(s.affection[i] || 0);
    return {
      learned: s.learned, minutes: Math.max(s.minutes, Math.floor(s.seconds / 60)),
      petsUnlocked: n, stars: s.stars, points: s.points, lifetime: s.lifetimePoints,
      avgLevel: n ? Math.max(1, Math.round(affSum / n / 20) + 1) : 1,
      foodTotal: Object.values(s.food).reduce((a, b) => a + Number(b || 0), 0),
    };
  }

  /* ---------- 存档导出 / 导入 / 重置 ---------- */
  function exportCode() { return btoa(unescape(encodeURIComponent(JSON.stringify(s)))); }
  function importCode(code) {
    try {
      const obj = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      if (typeof obj !== 'object' || obj.v !== 2) return false;
      s = Object.assign(defaultState(), obj); save(); return true;
    } catch (e) { return false; }
  }
  function reset() { s = defaultState(); unlockQueue = []; save(); }

  return {
    get state() { return s; },
    save, addStars, addPoints, spendStars, spendPoints,
    initUnlockQueue, checkUnlock, popUnlock, peekUnlock, unlockCount,
    petLevel, petAff, isUnlocked, addFood, foodCount, takeFood, addAffection,
    skinOwned, buySkin, equipSkin, curSkin,
    isCompleted, markCompleted, recordPractice, practiceDone, keyOf,
    tick, stats, dailyCount, exportCode, importCode, reset,
  };
})();
