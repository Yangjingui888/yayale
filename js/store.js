/* ============ 全局状态（localStorage 本地存档，无需后台） ============ */
const Store = (() => {
  const KEY = 'qiqu启蒙乐园v1';
  const defaults = () => ({
    stars: 0,             // 星星余额（仅兑换皮肤时消耗，只增不减除兑换外）
    points: 0,            // 积分余额（可购粮消耗）
    lifetimePoints: 0,    // 累计总积分（用于解锁宠物，永不清零不扣除）
    letters: {},          // {A:1} 已通关
    words: {},            // {themeIdx_wordIdx:1}
    pinyin: {},           // {groupIdx_itemIdx:1}
    hanzi: {},            // {groupIdx_itemIdx:1}
    petsUnlocked: 0,      // 已解锁数量（按 A-Z 顺序，累计积分达标自动解锁）
    petData: {},          // {idx:{lv, af, skins:[0], cur:0}}
    foods: {},            // {食物中文名: 数量} 全局共享背包
    seconds: 0,           // 总学习时长
    settings: { anim:true, limit:0 },  // 动画开关 / 防沉迷分钟(0=关)
    daily: { date:'', done:{} },       // 今日四项进度（首页进度卡）
    born: Date.now(),
  });

  let s = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(defaults(), JSON.parse(raw));
    } catch (e) {}
    return defaults();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    window.dispatchEvent(new Event('qsave'));   // 通知 HUD 刷新
  }

  /* ---------- 双货币 ---------- */
  const hudHooks = [];
  function onHud(fn) { hudHooks.forEach(h => h(fn)); hudHooks.push(fn); }
  function bump(el) { if (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } }
  function addStars(n) { s.stars += n; bump(document.getElementById('hudStars')); save(); }
  function addPoints(n) {
    s.points += n;
    if (n > 0) s.lifetimePoints += n;   // 累计积分只增（解锁依据）
    bump(document.getElementById('hudPoints'));
    checkUnlock();
    save();
  }
  function spendStars(n) { if (s.stars < n) return false; s.stars -= n; save(); return true; }
  function spendPoints(n) { if (s.points < n) return false; s.points -= n; save(); return true; }

  /* ---------- 宠物解锁（严格按 A-Z，达标自动解锁，不消耗积分） ---------- */
  let unlockQueue = [];   // 待弹出的解锁动画队列
  function checkUnlock() {
    let changed = false;
    while (s.petsUnlocked < 26 && s.lifetimePoints >= ECON.unlockAt(s.petsUnlocked)) {
      s.petsUnlocked++; changed = true;
      unlockQueue.push(s.petsUnlocked - 1);
    }
    if (changed) save();
  }
  function popUnlock() { return unlockQueue.length ? unlockQueue.shift() : null; }
  function peekUnlock() { return unlockQueue.length ? unlockQueue[0] : null; }

  /* ---------- 宠物养成数据 ---------- */
  function pet(idx) {
    if (!s.petData[idx]) s.petData[idx] = { lv:1, af:0, skins:[0], cur:0 };
    return s.petData[idx];
  }
  function isUnlocked(idx) { return idx < s.petsUnlocked; }

  /* ---------- 食物背包 ---------- */
  function foodCount(name) { return s.foods[name] || 0; }
  function addFood(name, n) {
    const cap = ECON.foodCap;
    s.foods[name] = Math.min(cap, (s.foods[name] || 0) + n); save();
  }
  function takeFood(name) {
    if (!s.foods[name]) return false;
    s.foods[name]--; save(); return true;
  }

  /* ---------- 关卡通关记录 ---------- */
  function cleared(map, key) { return !!s[map][key]; }
  function markClear(map, key) { s[map][key] = 1; save(); }

  /* ---------- 学习时长 ---------- */
  function tick(sec) { s.seconds += sec; }

  /* ---------- 今日学习进度（四大模块各完成一关记 1 项，跨天自动重置） ---------- */
  function todayStr() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function dailyDone() {
    if (s.daily.date !== todayStr()) { s.daily = { date: todayStr(), done: {} }; }
    return s.daily.done;
  }
  function markDaily(module) { const d = dailyDone(); d[module] = 1; save(); }
  function dailyCount() { return Object.keys(dailyDone()).length; }

  /* ---------- 统计（家长中心） ---------- */
  function stats() {
    const petVals = Object.entries(s.petData).filter(([i]) => i < s.petsUnlocked);
    const avgLv = petVals.length ? (petVals.reduce((a, [, p]) => a + p.lv, 0) / petVals.length) : 1;
    return {
      letters: Object.keys(s.letters).length,
      words: Object.keys(s.words).length,
      hanzi: Object.keys(s.hanzi).length,
      pinyin: Object.keys(s.pinyin).length,
      seconds: s.seconds,
      petsUnlocked: s.petsUnlocked,
      stars: s.stars, points: s.points, lifetime: s.lifetimePoints,
      avgLv: avgLv.toFixed(1),
      foodTotal: Object.values(s.foods).reduce((a, b) => a + b, 0),
    };
  }

  /* ---------- 保存 / 恢复存档（家长中心导出） ---------- */
  function exportCode() { return btoa(unescape(encodeURIComponent(JSON.stringify(s)))); }
  function importCode(code) {
    try {
      const obj = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      if (typeof obj !== 'object') return false;
      s = Object.assign(defaults(), obj); save(); return true;
    } catch (e) { return false; }
  }
  function reset() { s = defaults(); save(); }

  return {
    get state() { return s; },
    save, onHud, addStars, addPoints, spendStars, spendPoints,
    checkUnlock, popUnlock, peekUnlock,
    pet, isUnlocked, foodCount, addFood, takeFood,
    cleared, markClear, tick, stats, markDaily, dailyCount,
    exportCode, importCode, reset,
  };
})();
