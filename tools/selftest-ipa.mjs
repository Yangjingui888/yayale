/* 字母乐园「音标」页签运行时自测：Chrome headless + CDP（无第三方依赖）
   用法：先启动站点（app/ 目录 python3 -m http.server 8734），再以调试端口启动 Chrome：
   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --headless=new --remote-debugging-port=9333 --user-data-dir=/tmp/qoder-chrome-ipa
   然后 node tools/selftest-ipa.mjs */
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

async function main() {
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
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__errs=[];window.addEventListener("error",e=>window.__errs.push(String(e.message)));' });
  await send('Page.navigate', { url: APP });
  await sleep(1800);

  /* ⓪ 登录门禁 */
  const logged = await evalInPage(`async () => { if (Auth.current()) return true; const r = await Auth.register('ipatest', '1234', '音标娃', '🦊'); return !!r.ok; }`);
  if (!logged) { console.error('无法创建测试账号'); process.exit(2); }
  await send('Page.navigate', { url: APP });
  await sleep(1800);

  /* ① 进入字母模块：上方有「A-Z 字母/音标」切换行，页签行 4 项（音标已提升、无接龙） */
  await evalInPage(`() => { location.hash = '#/learn/letters'; return true; }`);
  await sleep(600);
  check('路由进入字母乐园', await evalInPage(`() => document.querySelector('.sub-top h1')?.textContent === '字母乐园'`));
  check('字母模块视图切换行（A-Z 字母/音标）', await evalInPage(`() => [...document.querySelectorAll('#viewSwitch button')].map(b=>b.textContent).join(',') === 'A-Z 字母,音标'`));
  check('页签行 4 项不含音标', await evalInPage(`() => [...document.querySelectorAll('#learnTabs button')].map(b=>b.textContent).join(',') === '学习,描红,AI跟读,小游戏'`));

  /* ② 点「音标」切换：面板出现、48 卡、列表/页签行隐藏 */
  await evalInPage(`() => { document.querySelector('#viewSwitch [data-view="ipa"]').click(); return true; }`);
  await sleep(400);
  check('音标面板显示', await evalInPage(`() => !document.getElementById('ipaPanel').hidden`));
  check('课时列表/筛选/页签行隐藏', await evalInPage(`() => document.getElementById('lessonList').hidden && document.getElementById('flt').hidden && document.getElementById('learnTabs').hidden`));
  check('48 张音标卡', await evalInPage(`() => document.querySelectorAll('#ipaPanel .ipa-card').length === 48`), await evalInPage(`() => String(document.querySelectorAll('#ipaPanel .ipa-card').length)`));
  check('分类筛选 6 项', await evalInPage(`() => [...document.querySelectorAll('#ipaFlt button')].map(b=>b.textContent).join(',') === '全部,长元音,短元音,双元音,清辅音,浊辅音'`));

  /* ③ 分类筛选 */
  await evalInPage(`() => { [...document.querySelectorAll('#ipaFlt button')].find(b => b.textContent === '浊辅音').click(); return true; }`);
  await sleep(300);
  check('浊辅音 17 张卡', await evalInPage(`() => document.querySelectorAll('#ipaPanel .ipa-card').length === 17`));
  await evalInPage(`() => { [...document.querySelectorAll('#ipaFlt button')].find(b => b.textContent === '长元音').click(); return true; }`);
  await sleep(300);
  check('长元音 5 张卡且含 /iː/', await evalInPage(`() => { const n = document.querySelectorAll('#ipaPanel .ipa-card').length; const t = [...document.querySelectorAll('.ipa-sym')].map(e=>e.textContent).join(''); return n === 5 && t.includes('/iː/'); }`));
  await evalInPage(`() => { [...document.querySelectorAll('#ipaFlt button')][0].click(); return true; }`);
  await sleep(300);

  /* ④ 点卡片：真人音频请求 200、卡片高亮、无 JS 错误 */
  const reqOk = await evalInPage(`async () => {
    const r = await fetch(ipaAudio(IPA_GROUPS[0].items[0][1]));
    return r.status === 200 && (r.headers.get('content-type') || '').includes('audio');
  }`);
  check('音素 mp3 资源 200 且为音频类型', reqOk);
  await evalInPage(`() => { document.querySelector('#ipaPanel .ipa-card').click(); return true; }`);
  await sleep(400);
  const played = await evalInPage(`() => ({ highlighted: !!document.querySelector('.ipa-card.playing') || !!(window.ipaAudioEl), errs: window.__errs })`);
  check('点卡后进入播放态（高亮或播放器存在）', played.highlighted);

  /* ⑤ 点例词按钮：不报 JS 错 */
  await evalInPage(`() => { document.querySelector('#ipaPanel .ipa-word').click(); return true; }`);
  await sleep(300);

  /* ⑥ 切回「A-Z 字母」：面板隐藏、列表与页签行恢复 */
  await evalInPage(`() => { document.querySelector('#viewSwitch [data-view="letters"]').click(); return true; }`);
  await sleep(300);
  check('切回字母视图恢复课时列表', await evalInPage(`() => document.getElementById('ipaPanel').hidden && !document.getElementById('lessonList').hidden && !document.getElementById('learnTabs').hidden && document.querySelectorAll('#lessonList .lesson').length === 26`));

  /* ⑦ 其他模块不出现视图切换行，页签行不含音标 */
  await evalInPage(`() => { location.hash = '#/learn/words'; return true; }`);
  await sleep(600);
  check('单词乐园无切换行且 5 页签不含音标', await evalInPage(`() => !document.getElementById('viewSwitch') && [...document.querySelectorAll('#learnTabs button')].every(b => b.dataset.tab !== 'ipa') && document.querySelectorAll('#learnTabs button').length === 5`));

  /* ⑦b 成语接龙也不应出现音标页签与切换行 */
  await evalInPage(`() => { location.hash = '#/learn/chengyu'; return true; }`);
  await sleep(600);
  check('成语接龙无切换行且不含音标', await evalInPage(`() => !document.getElementById('viewSwitch') && [...document.querySelectorAll('#learnTabs button')].every(b => b.dataset.tab !== 'ipa')`));

  /* ⑧ 截图留证（音标页） */
  await evalInPage(`() => { location.hash = '#/learn/letters'; return true; }`);
  await sleep(500);
  await evalInPage(`() => { document.querySelector('#viewSwitch [data-view="ipa"]').click(); return true; }`);
  await sleep(400);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const { writeFileSync } = await import('node:fs');
  writeFileSync('tools/selftest-ipa.png', Buffer.from(shot.data, 'base64'));
  console.log('📸 截图已保存 tools/selftest-ipa.png');

  /* ⑨ 页面 JS 错误收集 */
  const errs = await evalInPage(`() => window.__errs`);
  check('全程无页面 JS 错误', !errs || errs.length === 0, (errs || []).join(' | '));

  const bad = results.filter(r => !r.ok).length;
  console.log(bad ? `\n💥 ${bad} 项未通过` : '\n🎉 音标页签自测全部通过');
  process.exit(bad ? 1 : 0);
}
main().catch(e => { console.error('自测脚本失败:', e.message); process.exit(2); });
