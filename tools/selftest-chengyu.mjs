/* 成语接龙模块运行时自测：Chrome headless + CDP（无第三方依赖） */
import { setTimeout as sleep } from 'node:timers/promises';

const CDP_PORT = 9333;
const APP = 'http://localhost:8734/';
let id = 0;
const pending = new Map();
let ws;

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}

/* 页内执行 async 函数并取回 JSON 结果 */
async function evalInPage(functionBody) {
  const r = await send('Runtime.evaluate', {
    expression: `(${functionBody})()`,
    awaitPromise: true, returnByValue: true,
  });
  if (r.exceptionDetails) throw new Error('页内异常: ' + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

/* 自动接龙答题：读题干 → 找正确选项 → 点击，直到闯关结束 */
const autoChain = `
async () => {
  const sleepMs = ms => new Promise(r => setTimeout(r, ms));
  const item = lessonOf('chengyu', '0_0');
  const chain = item.chain;
  let guard = 0;
  while (guard++ < 30) {
    const prev = document.querySelector('.chain-prev');
    if (!prev) return { done: true, rounds: guard };
    const m = prev.textContent.match(/「(.+?)」/);
    if (!m) return { error: '无法解析题干', text: prev.textContent };
    const x = m[1];
    let answer = null;
    for (let i = 0; i < chain.length - 1; i++) if (chain[i][0] === x) { answer = chain[i + 1][0]; break; }
    if (!answer) return { error: '链中未找到题干成语: ' + x };
    const btn = [...document.querySelectorAll('#cOpts .quiz-option')].find(b => b.textContent.includes(answer));
    if (!btn) return { error: '选项中未找到正确成语: ' + answer };
    btn.click();
    await sleepMs(800);
  }
  return { done: false, note: 'guard 超限' };
}`;

async function main() {
  /* 打开新 tab */
  const target = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(APP)}`, { method: 'PUT' })).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  };
  await send('Runtime.enable');
  await send('Page.enable');
  /* 收集页面 JS 错误 */
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__errs=[];window.addEventListener("error",e=>window.__errs.push(String(e.message)));' });
  await send('Page.navigate', { url: APP });
  await sleep(1800);

  /* ⓪ 登录门禁：先注册测试账号并重新进入 */
  const logged = await evalInPage(`async () => { if (Auth.current()) return true; const r = await Auth.register('chytest', '1234', '自测娃', '🐰'); return !!r.ok; }`);
  if (!logged) { console.error('无法创建测试账号'); process.exit(2); }
  await send('Page.navigate', { url: APP });
  await sleep(1800);

  /* ① 首页成语接龙卡片 */
  check('首页有成语接龙卡片', await evalInPage(`() => !!document.querySelector('.module.m-rose[data-go="#/learn/chengyu"]')`));

  /* ② 进入模块学习页 */
  await evalInPage(`() => { location.hash = '#/learn/chengyu'; return true; }`);
  await sleep(600);
  check('路由进入学习页', await evalInPage(`() => document.querySelector('.sub-top h1')?.textContent === '成语接龙'`));
  check('课时列表 20 行', await evalInPage(`() => document.querySelectorAll('#lessonList .lesson').length === 20`), await evalInPage(`() => String(document.querySelectorAll('#lessonList .lesson').length)`));
  check('5 个 tab（含接龙）', await evalInPage(`() => document.querySelectorAll('#learnTabs button').length === 5`));
  check('筛选标签 = 全部+4 组', await evalInPage(`() => document.querySelectorAll('#flt button').length === 5`));
  check('龙字图标正确', await evalInPage(`() => [...document.querySelectorAll('#lessonList .lesson-icon')].map(e=>e.textContent.trim()).join('') === '白日依山尽黄河入海流欲穷千里目更上一层楼'`));

  /* ③ 筛选 */
  await evalInPage(`() => { document.querySelectorAll('#flt button')[2].click(); return true; }`);
  await sleep(300);
  check('筛选「黄河入海流」剩 5 行', await evalInPage(`() => document.querySelectorAll('#lessonList .lesson').length === 5`));
  await evalInPage(`() => { document.querySelectorAll('#flt button')[0].click(); return true; }`);
  await sleep(300);

  /* ④ 学习弹层 + 链条 */
  await evalInPage(`() => { Learn.openStudy('chengyu', '0_0'); return true; }`);
  await sleep(500);
  check('学习卡显示 12 条链', await evalInPage(`() => document.querySelectorAll('.chain-row').length === 12`));
  check('链条含拼音与释义', await evalInPage(`() => { const r = document.querySelector('.chain-row'); return r && r.querySelector('.chain-cy small').textContent.includes('bái') && r.querySelector('.chain-mean').textContent.length > 3; }`));
  check('练习按钮 3 个', await evalInPage(`() => document.querySelectorAll('.action-grid .action-btn').length === 3`));

  /* ⑤ 接龙闯关自动化 */
  const pointsBefore = await evalInPage(`() => Store.state.points`);
  await evalInPage(`() => { Learn.startPractice('chain'); return true; }`);
  await sleep(500);
  check('进入接龙闯关', await evalInPage(`() => !!document.querySelector('#cStage .quiz-option')`));
  const auto = await evalInPage(autoChain);
  check('6 题全部答完', !!auto.done, JSON.stringify(auto));
  await sleep(1200);
  check('chain 练习已打勾', await evalInPage(`() => Store.practiceDone('chengyu', '0_0', 'chain') === true`));
  const pb = await evalInPage(`() => Store.state.points`);
  check('发奖生效（points 增加）', pb > pointsBefore, `${pointsBefore} → ${pb}`);
  check('完成后可返回总览', await evalInPage(`() => !!document.querySelector('.action-grid')`));

  /* ⑤b 描红 + 跟读（无麦克风走「我读过啦」），验证整课完成与统计 */
  await evalInPage(`() => { Learn.startPractice('trace'); return true; }`);
  await sleep(400);
  check('描红板出现', await evalInPage(`() => !!document.querySelector('.trace-wrap canvas')`));
  await evalInPage(`() => { document.querySelector('[data-act="ok"]').click(); return true; }`);
  await sleep(1400);
  check('trace 已打勾', await evalInPage(`() => Store.practiceDone('chengyu', '0_0', 'trace') === true`));
  await evalInPage(`() => { Learn.startPractice('follow'); return true; }`);
  await sleep(400);
  await evalInPage(`() => { document.getElementById('followSkip').click(); return true; }`);
  await sleep(1400);
  check('follow 已打勾', await evalInPage(`() => Store.practiceDone('chengyu', '0_0', 'follow') === true`));
  check('整课完成记录', await evalInPage(`() => Store.state.completed.includes('chengyu-0_0')`));
  check('已学接龙统计 +1', await evalInPage(`() => Store.state.learned.chengyu >= 1`));

  /* ⑥ 跨模块接龙 tab 提示 */
  await evalInPage(`() => { Learn.closeSheet(); location.hash = '#/learn/letters'; return true; }`);
  await sleep(600);
  await evalInPage(`() => { [...document.querySelectorAll('#learnTabs button')].find(b => b.dataset.tab === 'chain').click(); return true; }`);
  await sleep(300);
  check('字母模块点接龙出现提示', await evalInPage(`() => [...document.querySelectorAll('.toast, [class*=toast]')].some(e => e.textContent.includes('成语接龙'))`) || await evalInPage(`() => document.body.textContent.includes('接龙闯关在')`));

  /* ⑦ 页面 JS 错误收集 */
  const errs = await evalInPage(`() => window.__errs`);
  check('页面无 JS 错误', !errs || errs.length === 0, (errs || []).join(' | '));

  const bad = results.filter(r => !r.ok).length;
  console.log(bad ? `\n💥 ${bad} 项未通过` : '\n🎉 浏览器运行时自测全部通过');
  process.exit(bad ? 1 : 0);
}
main().catch(e => { console.error('自测脚本失败:', e.message); process.exit(2); });
