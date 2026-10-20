/* Store 层 + lessonDone 纯 Node 逻辑自测（无需浏览器 / 无第三方依赖）
 * 覆盖：全模块完成状态永久化（有界日志裁剪后不回退）、账号隔离、重载持久化、
 *       导出导入、重置、旧存档回填、发奖首次/复习判定、日进度上限、learned 计数幂等。
 * 运行：node tools/selftest-store.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const JS = path.join(__dir, '..', 'js');

/* ---------- 浏览器环境最小桩 ---------- */
function makeLocalStorage() {
  const mem = new Map();
  return {
    _mem: mem,
    getItem: k => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: k => { mem.delete(k); },
    clear: () => mem.clear(),
  };
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

/* 每次装载都新建一套隔离环境，返回该环境下的 Store / lessonDone */
function bootStore(sharedLocalStorage) {
  const ls = sharedLocalStorage || makeLocalStorage();
  const sandbox = {
    localStorage: ls,
    window: { dispatchEvent() {}, addEventListener() {}, crypto: undefined, isSecureContext: false },
    Event: class { constructor(t) { this.type = t; } },
    document: { getElementById: () => null, querySelector: () => null, createElement: () => ({ classList: { add() {}, remove() {} }, style: {} }) },
    btoa: s => Buffer.from(s, 'binary').toString('base64'),
    atob: s => Buffer.from(s, 'base64').toString('binary'),
    setTimeout, clearTimeout, Math, Date, JSON, Object, Array, String, Number,
  };
  sandbox.globalThis = sandbox;
  const dataSrc = fs.readFileSync(path.join(JS, 'data.js'), 'utf8');
  const storeSrc = fs.readFileSync(path.join(JS, 'store.js'), 'utf8');
  const learnSrc = fs.readFileSync(path.join(JS, 'learn.js'), 'utf8');
  // learn.js 的 Learn IIFE 只在函数体内用到 UI/TTS/TracePad，逻辑测试不触发；给空桩防止意外引用报错
  sandbox.UI = { sfx: {}, toast() {}, burst() {}, token: () => '' };
  sandbox.TTS = { speak() {}, stop() {} };
  sandbox.TracePad = () => ({});

  const ctx = vm.createContext(sandbox);
  vm.runInContext(
    dataSrc + '\n;this.ECON=ECON;this.MODULE_TOTAL=MODULE_TOTAL;\n' +
    storeSrc + '\n;this.Store=Store;\n' +
    learnSrc + '\n;this.lessonDone=lessonDone;this.practicesOf=practicesOf;this.LESSONS=LESSONS;this.PRACTICES=PRACTICES;',
    ctx, { filename: 'bundle.js' }
  );
  return { sandbox, ls, Store: sandbox.Store, lessonDone: sandbox.lessonDone, practicesOf: sandbox.practicesOf, LESSONS: sandbox.LESSONS };
}

/* 完整学完一个课时（把该课时所有练习环节都记录一遍），并模拟 finishPractice 的通关判定 */
function completeLesson(Store, module, index) {
  const kinds = kindsOf(Store, module, index);
  for (const k of kinds) Store.recordPractice(module, index, k, '标题', 5, 3);
  if (kinds.every(k => Store.practiceDone(module, index, k))) Store.markCompleted(Store.keyOf(module, index));
  Store.save();
  return kinds;
}
/* 通过 learn.js 的 practicesOf 拿真实练习集；拿不到就用默认四环节 */
let _practicesOf = null;
function kindsOf(Store, module, index) {
  if (_practicesOf) { try { return _practicesOf(module, index).map(p => p.kind); } catch (e) {} }
  return ['trace', 'follow', 'sound', 'match'];
}

/* 各模块挑一个真实课时 id 做代表 */
const MODULE_SAMPLE = {
  letters: 3,          // 字母 D
  words: '2_5',        // 颜色主题第 6 个
  hanzi: '0_0',
  pinyin: '0_1',
  math: 'num_2',
  chengyu: '0_0',
};
const MODULE_SAMPLE_EXTRA = { math: ['calc_1', 'mul_3'] };  // 数学另两类课时（练习集不同）

function main() {
  const env = bootStore();
  _practicesOf = env.practicesOf;
  const { Store } = env;

  /* ⓪ 默认状态 */
  Store.use('kid1');
  check('默认 v=2 且各计数为 0', Store.state.v === 2 && Store.state.points === 0 && Store.state.completed.length === 0);
  check('默认含 progress 空对象', Store.state.progress && typeof Store.state.progress === 'object');

  /* ① 全模块：完成后 lessonDone 立即为真 */
  const allSamples = [];
  for (const m of Object.keys(MODULE_SAMPLE)) {
    allSamples.push([m, MODULE_SAMPLE[m]]);
    (MODULE_SAMPLE_EXTRA[m] || []).forEach(idx => allSamples.push([m, idx]));
  }
  for (const [m, idx] of allSamples) {
    const kinds = completeLesson(Store, m, idx);
    check(`[${m} ${idx}] 完成后 lessonDone=true`, env.lessonDone(m, idx) === true, `环节=${kinds.join('/')}`);
  }

  /* ② 核心回归：制造 >500 条其它记录，把上面的记录全部挤出裁剪窗口，完成状态不得回退 */
  for (let i = 0; i < 700; i++) Store.recordPractice('letters', String(i % 26), 'trace', 'x', 5, 3);
  Store.save();
  check('practiceRecords 封顶 500 条', Store.state.practiceRecords.length === 500, '实际=' + Store.state.practiceRecords.length);
  let evicted = 0;
  for (const [m, idx] of allSamples) {
    const stillInLog = Store.state.practiceRecords.some(r => r.module === m && String(r.index) === String(idx));
    if (!stillInLog) evicted++;
    check(`[${m} ${idx}] 日志被裁剪后 lessonDone 仍=true`, env.lessonDone(m, idx) === true, stillInLog ? '仍在日志' : '已被裁出日志');
  }
  check('确实发生了日志裁剪（否则本回归无意义）', evicted > 0, `被裁出=${evicted}/${allSamples.length}`);

  /* ③ 各环节打勾（practiceDone）在裁剪后仍为真 */
  {
    const [m, idx] = ['words', '2_5'];
    for (const k of kindsOf(Store, m, idx)) {
      check(`[${m} ${idx}] practiceDone(${k}) 裁剪后仍=true`, Store.practiceDone(m, idx, k) === true);
    }
  }

  /* ④ 重载持久化：用同一 localStorage 重新 boot，进度应完整恢复 */
  {
    const env2 = bootStore(env.ls);
    _practicesOf = env2.practicesOf;
    env2.Store.use('kid1');
    let allDone = true;
    for (const [m, idx] of allSamples) if (!env2.lessonDone(m, idx)) allDone = false;
    check('重载后所有已完成课时仍 lessonDone=true', allDone);
    check('重载后 progress 已持久化', Object.keys(env2.Store.state.progress).length > 0);
  }

  /* ⑤ 账号隔离：新账号不应看到 kid1 的进度 */
  {
    const env3 = bootStore(env.ls);
    _practicesOf = env3.practicesOf;
    env3.Store.use('kid2');
    check('新账号进度为空', env3.Store.state.completed.length === 0 && Object.keys(env3.Store.state.progress).length === 0);
    check('新账号 words-2_5 未完成', env3.lessonDone('words', '2_5') === false);
    // 切回 kid1 仍在
    env3.Store.use('kid1');
    check('切回原账号进度恢复', env3.lessonDone('words', '2_5') === true);
  }

  /* ⑥ 发奖首次/复习判定：新课时首练=first，复习=again */
  {
    const env4 = bootStore();
    _practicesOf = env4.practicesOf;
    const S = env4.Store; S.use('eco');
    const before = S.state.points;
    const freshKind = env4.practicesOf('words', '0_0')[0].kind;
    const againFirst = S.practiceDone('words', '0_0', freshKind);
    check('全新课时首练 practiceDone=false（应发 first 奖）', againFirst === false);
    S.recordPractice('words', '0_0', freshKind, 'w', 5, 3);
    check('记录后同环节 practiceDone=true（再练应发 again 奖）', S.practiceDone('words', '0_0', freshKind) === true);
  }

  /* ⑦ learned 计数幂等：同一课时重复通关只 +1 */
  {
    const env5 = bootStore();
    _practicesOf = env5.practicesOf;
    const S = env5.Store; S.use('cnt');
    completeLesson(S, 'words', '0_0');
    const once = S.state.learned.words;
    completeLesson(S, 'words', '0_0');   // 再来一遍
    completeLesson(S, 'words', '0_0');
    check('learned.words 重复通关不重复计数', S.state.learned.words === once && once === 1, `值=${S.state.learned.words}`);
  }

  /* ⑧ 导出 / 导入 roundtrip 保留进度；非法码被拒 */
  {
    const env6 = bootStore();
    _practicesOf = env6.practicesOf;
    const S = env6.Store; S.use('exim');
    completeLesson(S, 'letters', 0);
    const code = S.exportCode();
    const env7 = bootStore();
    _practicesOf = env7.practicesOf;
    env7.Store.use('exim2');
    check('导入合法存档码成功', env7.Store.importCode(code) === true);
    check('导入后进度恢复', env7.lessonDone('letters', 0) === true);
    check('导入非法码返回 false', env7.Store.importCode('!!!not-base64-json!!!') === false);
    const badVer = Buffer.from(JSON.stringify({ v: 999, completed: ['x'] })).toString('base64');
    check('导入错误版本返回 false', env7.Store.importCode(badVer) === false);
  }

  /* ⑨ reset 清空进度 */
  {
    const env8 = bootStore();
    _practicesOf = env8.practicesOf;
    const S = env8.Store; S.use('rs');
    completeLesson(S, 'words', '1_1');
    check('reset 前有进度', env8.lessonDone('words', '1_1') === true);
    S.reset();
    check('reset 后进度清空', env8.lessonDone('words', '1_1') === false && S.state.completed.length === 0 && Object.keys(S.state.progress).length === 0);
  }

  /* ⑩ 旧存档回填：仅有 completed、无 progress、记录已被裁 → lessonDone 仍应 true */
  {
    const ls = makeLocalStorage();
    ls.setItem('qiqu启蒙乐园v2:legacy', JSON.stringify({
      v: 2, completed: ['words-3_5'], practiceRecords: [], progress: undefined,
      learned: { letters: 0, words: 1, hanzi: 0, pinyin: 0, math: 0, chengyu: 0 },
    }));
    const env9 = bootStore(ls);
    _practicesOf = env9.practicesOf;
    env9.Store.use('legacy');
    check('旧存档（无 progress）凭 completed 回填 lessonDone=true', env9.lessonDone('words', '3_5') === true);
    check('旧存档未学课时仍为 false', env9.lessonDone('words', '9_9') === false);
  }

  /* ⑪ 日进度上限不超过 MODULE_TOTAL */
  {
    const env10 = bootStore();
    _practicesOf = env10.practicesOf;
    const S = env10.Store; S.use('daily');
    for (let i = 0; i < 50; i++) S.recordPractice('words', `${i}_0`, 'trace', 'w', 5, 3);
    check('dailyCount 不超过 MODULE_TOTAL(6)', S.dailyCount() <= 6, '值=' + S.dailyCount());
    check('今天练过后 dailyCount > 0', S.dailyCount() > 0, '值=' + S.dailyCount());
    // 跨天归零：把 daily.date 改成昨天，dailyCount 应回到 0（首页「今日进度」卡依赖此语义）
    S.state.daily.date = '2000-1-1';
    check('跨天后 dailyCount 归零', S.dailyCount() === 0, '值=' + S.dailyCount());
  }

  const bad = results.filter(r => !r.ok);
  console.log(bad.length ? `\n💥 ${bad.length} 项未通过：\n` + bad.map(b => '  - ' + b.name + (b.detail ? ' (' + b.detail + ')' : '')).join('\n') : '\n🎉 Store 逻辑自测全部通过');
  process.exit(bad.length ? 1 : 0);
}

main();
