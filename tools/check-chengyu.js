/* 校验成语接龙：每条 12 个；相邻成语首尾字衔接（同字，或标注「同音：X→Y」时 X 为前条尾字、Y 为后条首字且拼音音节一致） */
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../js/data.js', 'utf8');
const sandbox = {};
new Function('window', src + '; this.CHENGYU_CHAINS = CHENGYU_CHAINS; this.CHENGYU_GROUPS = CHENGYU_GROUPS;').call(sandbox);
const chains = sandbox.CHENGYU_CHAINS;
const groups = sandbox.CHENGYU_GROUPS;

/* 从整条成语拼音中提取指定位置字的音节 */
function syllable(py, idx) {
  const parts = py.trim().split(/\s+/);
  const p = parts[idx];
  if (!p) return '';
  return p.replace(/[āēīōūǖàéíòùǖǘǚǜáéíóú]/g, c => 'aeiouüAEIOU'.includes(c) ? c : c) // keep
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ü/g, 'v').toLowerCase();
}
let bad = 0;
const chars = groups.flatMap(g => g.chars);
console.log('字数：', chars.length, chars.join(''));
for (const ch of chars) {
  const list = chains[ch];
  if (!list) { console.log(`❌ ${ch}: 缺少链条`); bad++; continue; }
  if (list.length !== 12) { console.log(`❌ ${ch}: 长度为 ${list.length}，应为 12`); bad++; }
  if (list[0][0][0] !== ch) { console.log(`❌ ${ch}: 首条 "${list[0][0]}" 未以该字开头`); bad++; }
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i], b = list[i + 1];
    const tail = a[0][a[0].length - 1], head = b[0][0];
    if (tail === head) continue;
    const note = b[3];
    const m = note && note.match(/[：:]\s*(.)(?:→|->|>)(.)/);
    if (!m) { console.log(`❌ ${ch}[${i}→${i + 1}]: "${a[0]}"尾字「${tail}」≠ "${b[0]}"首字「${head}」，且无同音标注`); bad++; continue; }
    if (m[1] !== tail || m[2] !== head) { console.log(`❌ ${ch}[${i}→${i + 1}]: 标注「${note}」与实际 ${tail}→${head} 不符`); bad++; continue; }
    const sa = syllable(a[1], 3), sb = syllable(b[1], 0);
    if (sa !== sb) { console.log(`❌ ${ch}[${i}→${i + 1}]: 同音标注 ${tail}(${sa}) vs ${head}(${sb}) 音节不一致`); bad++; }
  }
}
/* 重复成语统计（跨链重复仅提示） */
const seen = {};
for (const ch of chars) chains[ch].forEach(x => (seen[x[0]] = seen[x[0]] || []).push(ch));
const dup = Object.entries(seen).filter(([, v]) => v.length > 1);
if (dup.length) console.log('⚠️ 跨链重复：', dup.map(([k, v]) => `${k}(${v.join(',')})`).join(' '));
console.log(bad ? `\n共 ${bad} 处问题` : '\n✅ 全部 20 条接龙校验通过');
process.exit(bad ? 1 : 0);
