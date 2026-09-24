/* ============ 启蒙内容数据（全部内置，离线可用） ============ */

/* ---------- 26 英文字母：本名 + 自然拼读音 + 2 个关联单词 ---------- */
const LETTERS = [
  { L:'A', ph:'æ', words:[['apple','苹果','🍎'],['ant','蚂蚁','🐜']] },
  { L:'B', ph:'b', words:[['ball','皮球','⚽'],['bear','小熊','🐻']] },
  { L:'C', ph:'k', words:[['cat','小猫','🐱'],['cup','杯子','☕']] },
  { L:'D', ph:'d', words:[['dog','小狗','🐶'],['duck','鸭子','🦆']] },
  { L:'E', ph:'e', words:[['egg','鸡蛋','🥚'],['elephant','大象','🐘']] },
  { L:'F', ph:'f', words:[['fish','小鱼','🐟'],['frog','青蛙','🐸']] },
  { L:'G', ph:'g', words:[['grape','葡萄','🍇'],['goat','山羊','🐐']] },
  { L:'H', ph:'h', words:[['hat','帽子','🎩'],['house','房子','🏠']] },
  { L:'I', ph:'i', words:[['ice cream','冰激凌','🍦'],['ink','墨水','🖋️']] },
  { L:'J', ph:'dʒ', words:[['jam','果酱','🫙'],['jar','罐子','🏺']] },
  { L:'K', ph:'k', words:[['kite','风筝','🪁'],['king','国王','🤴']] },
  { L:'L', ph:'l', words:[['lion','狮子','🦁'],['leaf','树叶','🍃']] },
  { L:'M', ph:'m', words:[['monkey','猴子','🐵'],['moon','月亮','🌙']] },
  { L:'N', ph:'n', words:[['nest','鸟巢','🪺'],['nut','坚果','🥜']] },
  { L:'O', ph:'o', words:[['orange','橙子','🍊'],['owl','猫头鹰','🦉']] },
  { L:'P', ph:'p', words:[['pig','小猪','🐷'],['panda','熊猫','🐼']] },
  { L:'Q', ph:'kw', words:[['queen','女王','👸'],['quilt','被子','🛏️']] },
  { L:'R', ph:'r', words:[['rat','老鼠','🐀'],['rain','下雨','🌧️']] },
  { L:'S', ph:'s', words:[['sun','太阳','☀️'],['snake','小蛇','🐍']] },
  { L:'T', ph:'t', words:[['tiger','老虎','🐯'],['tree','大树','🌳']] },
  { L:'U', ph:'ʌ', words:[['umbrella','雨伞','☂️'],['up','上面','⬆️']] },
  { L:'V', ph:'v', words:[['van','小货车','🚐'],['violin','小提琴','🎻']] },
  { L:'W', ph:'w', words:[['water','水','💧'],['whale','鲸鱼','🐋']] },
  { L:'X', ph:'ks', words:[['box','盒子','📦'],['fox','狐狸','🦊']] },
  { L:'Y', ph:'j', words:[['yellow','黄色','💛'],['yo-yo','悠悠球','🪀']] },
  { L:'Z', ph:'z', words:[['zebra','斑马','🦓'],['zoo','动物园','🎪']] },
];

/* ---------- 英文单词乐园：CVC 短词按主题分类 ---------- */
const WORD_THEMES = [
  { name:'小动物', color:'c-mint', words:[
    ['cat','小猫','🐱'],['dog','小狗','🐶'],['pig','小猪','🐷'],['hen','母鸡','🐔'],['duck','鸭子','🦆'],['cow','奶牛','🐮'],
    ['bird','小鸟','🐦'],['fish','小鱼','🐟'],['horse','小马','🐴'],['sheep','小羊','🐑'],['monkey','猴子','🐵'],['bear','小熊','🐻'],
    ['lion','狮子','🦁'],['rabbit','兔子','🐰'],['tiger','老虎','🐯'],['elephant','大象','🐘'],['panda','熊猫','🐼'],['frog','青蛙','🐸'],
    ['mouse','老鼠','🐭'],['fox','狐狸','🦊'],['giraffe','长颈鹿','🦒'],['zebra','斑马','🦓'],['hippo','河马','🦛'],['snake','小蛇','🐍'],
    ['turtle','乌龟','🐢'],['whale','鲸鱼','🐳'],['dolphin','海豚','🐬'],['penguin','企鹅','🐧'],['owl','猫头鹰','🦉'],['bee','小蜜蜂','🐝'] ] },
  { name:'水果', color:'c-coral', words:[
    ['apple','苹果','🍎'],['pear','梨','🍐'],['mango','芒果','🥭'],['kiwi','猕猴桃','🥝'],['grape','葡萄','🍇'],['banana','香蕉','🍌'],
    ['orange','橙子','🍊'],['peach','桃子','🍑'],['watermelon','西瓜','🍉'],['strawberry','草莓','🍓'],['cherry','樱桃','🍒'],['lemon','柠檬','🍋'],
    ['pineapple','菠萝','🍍'],['blueberry','蓝莓','🫐'],['melon','甜瓜','🍈'],['honeydew','哈密瓜','🍈'],['coconut','椰子','🥥'],['avocado','牛油果','🥑'],
    ['tomato','西红柿','🍅'],['corn','玉米','🌽'],['pepper','彩椒','🫑'],['carrot','胡萝卜','🥕'],['radish','萝卜','🥬'],['mushroom','蘑菇','🍄'],
    ['plum','李子','🟣'],['apricot','杏子','🧡'],['fig','无花果','🫒'],['date','椰枣','🌴'],['dragonfruit','火龙果','🐉'],['passion fruit','百香果','💜'] ] },
  { name:'颜色', color:'c-sky', words:[
    ['red','红色','🟥'],['blue','蓝色','🟦'],['green','绿色','🟩'],['yellow','黄色','🟨'],['purple','紫色','🟪'],['pink','粉色','🌸'],
    ['orange','橙色','🟠'],['black','黑色','⬛'],['white','白色','⬜'],['brown','棕色','🟤'],['grey','灰色','🩶'],['gold','金色','🥇'],
    ['silver','银色','🥈'],['cyan','青色','🟦'],['magenta','洋红','🟪'],['beige','米色','🧆'],['ivory','象牙白','🐘'],['navy','海军蓝','🌌'],
    ['teal','水鸭蓝','🦆'],['maroon','栗色','🌰'],['olive','橄榄绿','🫒'],['coral','珊瑚色','🪸'],['salmon','鲑鱼粉','🍣'],['mint','薄荷绿','🌿'],
    ['lavender','淡紫色','💐'],['violet','紫罗兰','💜'],['indigo','靛蓝','😨'],['turquoise','绿松石色','🐟'],['sky blue','天蓝色','☁️'],['light green','浅绿色','🍀'] ] },
  { name:'数字', color:'c-grape', words:[
    ['one','一','1️⃣'],['two','二','2️⃣'],['three','三','3️⃣'],['four','四','4️⃣'],['five','五','5️⃣'],['six','六','6️⃣'],
    ['seven','七','7️⃣'],['eight','八','8️⃣'],['nine','九','9️⃣'],['ten','十','🔟'],['eleven','十一','🕚'],['twelve','十二','🕛'],
    ['thirteen','十三','📚'],['fourteen','十四','🎋'],['fifteen','十五','🏮'],['sixteen','十六','🧧'],['seventeen','十七','🎑'],['eighteen','十八','🎆'],
    ['nineteen','十九','🎇'],['twenty','二十','🎂'],['thirty','三十','🌕'],['forty','四十','🌖'],['fifty','五十','🌗'],['sixty','六十','🌘'],
    ['seventy','七十','🌙'],['eighty','八十','⭐'],['ninety','九十','✨'],['hundred','一百','💯'],['zero','零','0️⃣'],['first','第一','🥇'] ] },
  { name:'身体', color:'c-pink', words:[
    ['eye','眼睛','👁️'],['nose','鼻子','👃'],['mouth','嘴巴','👄'],['ear','耳朵','👂'],['hand','小手','✋'],['foot','小脚','🦶'],
    ['hair','头发','💇'],['face','脸蛋','😊'],['arm','手臂','💪'],['leg','大腿','🦵'],['tooth','牙齿','🦷'],['tongue','舌头','👅'],
    ['head','脑袋','🗣️'],['body','身体','🧍'],['neck','脖子','🦒'],['shoulder','肩膀','🤷'],['chest','胸膛','🎽'],['back','后背','🔙'],
    ['belly','小肚子','🥁'],['waist','腰部','🩱'],['knee','膝盖','🩹'],['ankle','脚踝','🦶'],['toe','脚趾','🦶'],['finger','手指','👆'],
    ['thumb','大拇指','👍'],['palm','手心','🖐️'],['wrist','手腕','⌚'],['chin','下巴','🧔'],['cheek','脸颊','😊'],['forehead','额头','🧖'] ] },
  { name:'美食', color:'c-sun', words:[
    ['bread','面包','🍞'],['cake','蛋糕','🍰'],['milk','牛奶','🥛'],['rice','米饭','🍚'],['egg','鸡蛋','🥚'],['juice','果汁','🧃'],
    ['cookie','饼干','🍪'],['noodle','面条','🍜'],['candy','糖果','🍬'],['honey','蜂蜜','🍯'],['soup','汤','🥣'],['chicken','鸡肉','🍗'],
    ['pizza','披萨','🍕'],['hamburger','汉堡','🍔'],['fries','薯条','🍟'],['hot dog','热狗','🌭'],['ice cream','冰激凌','🍦'],['donut','甜甜圈','🍩'],
    ['pancake','松饼','🥞'],['dumpling','饺子','🥟'],['baozi','包子','🥠'],['cheese','奶酪','🧀'],['butter','黄油','🧈'],['yogurt','酸奶','🍶'],
    ['water','水','💧'],['tea','茶','🍵'],['coffee','咖啡','☕'],['lemonade','柠檬水','🍋'],['ham','火腿','🍖'],['sausage','香肠','🌭'] ] },
  { name:'交通', color:'c-sky', words:[
    ['car','小汽车','🚗'],['bus','公交车','🚌'],['train','火车','🚂'],['plane','飞机','✈️'],['ship','大船','🚢'],['bike','自行车','🚲'],
    ['taxi','出租车','🚕'],['truck','卡车','🚚'],['rocket','火箭','🚀'],['boat','小船','🛶'],['ambulance','救护车','🚑'],['fire truck','消防车','🚒'],
    ['police car','警车','🚓'],['motorcycle','摩托车','🏍️'],['tractor','拖拉机','🚜'],['minivan','面包车','🚐'],['van','客货车','🚐'],['sports car','跑车','🏎️'],
    ['tram','有轨电车','🚊'],['monorail','单轨列车','🚝'],['mountain railway','登山小火车','🚞'],['subway','地铁','🚇'],['helicopter','直升机','🚁'],['small plane','小飞机','🛩️'],
    ['airplane','客机','🛫'],['sailboat','帆船','⛵'],['canoe','独木舟','🛶'],['yacht','游艇','🛥️'],['ferry','渡轮','⛴️'],['cable car','缆车','🚡'] ] },
  { name:'衣物', color:'c-grape', words:[
    ['shirt','衬衫','👕'],['dress','连衣裙','👗'],['hat','帽子','🧢'],['shoes','鞋子','👟'],['socks','袜子','🧦'],['pants','裤子','👖'],
    ['coat','外套','🧥'],['gloves','手套','🧤'],['scarf','围巾','🧣'],['bag','小书包','🎒'],['cap','鸭舌帽','🧢'],['boots','雨靴','👢'],
    ['sneakers','运动鞋','👟'],['sandals','凉鞋','👡'],['slippers','拖鞋','🩴'],['heels','高跟鞋','👠'],['jacket','夹克','🧥'],['vest','背心','🦺'],
    ['sweater','毛衣','🧶'],['hoodie','连帽衫','🥷'],['jeans','牛仔裤','👖'],['shorts','短裤','🩳'],['skirt','半身裙','👗'],['pajamas','睡衣','🌙'],
    ['swimsuit','泳衣','🩱'],['trunks','泳裤','🩲'],['sunglasses','太阳镜','🕶️'],['belt','腰带','🪢'],['suspenders','背带裤','🎠'],['raincoat','雨衣','🧥'] ] },
];

/* ---------- 汉语拼音：按幼儿教学顺序 ---------- */
const PINYIN_GROUPS = [
  { name:'声母', color:'#57aeee', items:[
    ['b','波','菠萝','🍍'],['p','坡','山坡','⛰️'],['m','摸','妈妈','👩'],['f','佛','狐狸','🦊'],
    ['d','得','恐龙','🦕'],['t','特','兔子','🐰'],['n','讷','牛奶','🥛'],['l','勒','乐谱','🎵'],
    ['g','哥','哥哥','👦'],['k','科','青蛙','🐸'],['h','喝','喝水','💧'],['j','基','积木','🧱'],
    ['q','欺','气球','🎈'],['x','希','西瓜','🍉'],['zh','知','蜘蛛','🕷️'],['ch','吃','吃饭','🍚'],
    ['sh','诗','狮子','🦁'],['r','日','日出','🌞'],['z','资','紫色','🟪'],['c','雌','刺猬','🦔'],
    ['s','思','松鼠','🐿️'],['y','医','医生','🧑‍⚕️'],['w','屋','房子','🏠'] ] },
  { name:'单韵母', color:'#f3764a', items:[
    ['a','啊','阿姨','👩'],['o','喔','公鸡','🐓'],['e','鹅','白鹅','🦢'],['i','衣','衣服','👕'],['u','乌','乌鸦','🐦‍⬛'],['ü','迂','小鱼','🐟'] ] },
  { name:'复韵母', color:'#9d7bf0', items:[
    ['ai','哀','白菜','🥬'],['ei','诶','美味','😋'],['ui','威','乌龟','🐢'],['ao','袄','棉袄','🧥'],
    ['ou','欧','海鸥','🕊️'],['iu','优','优秀','🌟'],['ie','耶','叶子','🍃'],['üe','约','月亮','🌙'],['er','儿','耳朵','👂'] ] },
  { name:'鼻韵母', color:'#5cc98d', items:[
    ['an','安','山峰','⛰️'],['en','恩','森林','🌲'],['in','音','音乐','🎵'],['un','温','白云','☁️'],['ün','晕','裙子','👗'],
    ['ang','昂','小羊','🐑'],['eng','亨','台灯','💡'],['ing','英','星星','⭐'],['ong','轰','恐龙','🦖'] ] },
  { name:'整体认读音节', color:'#ff9ccb', items:[
    ['zhi','知','树枝','🪵'],['chi','吃','尺子','📏'],['shi','诗','柿子','🍅'],['ri','日','太阳','🌞'],
    ['zi','子','子弹','🔮'],['ci','刺','刺猬','🦔'],['si','丝','面条','🍜'],['yi','衣','衣服','👕'],
    ['wu','屋','大雾','🌫️'],['yu','鱼','小金鱼','🐠'],['ye','叶','爷爷','👴'],['yue','月','月亮','🌙'],
    ['yuan','圆','圆球','⚽'],['yin','音','钢琴','🎹'],['yun','云','白云','☁️'],['ying','英','老鹰','🦅'] ] },
];

/* ---------- 启蒙汉字：由简入难分组 ---------- */
const HANZI_GROUPS = [
  { name:'日月山水', items:[
    ['日','rì','日子','🌞'],['月','yuè','月亮','🌙'],['山','shā','大山','⛰️'],['水','shuǐ','喝水','💧'],['火','huǒ','火苗','🔥'],['木','mù','树木','🌳'] ] },
  { name:'身体器官', items:[
    ['人','rén','人们','🧍'],['口','kǒu','口哨','👄'],['手','shǒu','小手','✋'],['足','zú','足球','🦶'],['目','mù','目光','👁️'],['耳','ěr','耳朵','👂'] ] },
  { name:'上下大小', items:[
    ['大','dà','大象','🐘'],['小','xiǎo','小猫','🐱'],['上','shàng','上面','⬆️'],['下','xià','下面','⬇️'],['天','tiān','天空','🌌'],['地','dì','大地','🌍'] ] },
  { name:'数字朋友', items:[
    ['一','yī','一个','1️⃣'],['二','èr','二月','2️⃣'],['三','sān','三天','3️⃣'],['四','sì','四季','4️⃣'],['五','wǔ','五花','5️⃣'],['六','liù','六六','6️⃣'] ] },
  { name:'动物世界', items:[
    ['鱼','yú','金鱼','🐟'],['鸟','niǎo','小鸟','🐦'],['虫','chóng','小虫','🐛'],['马','mǎ','小马','🐴'],['牛','niú','奶牛','🐮'],['羊','yáng','小羊','🐑'] ] },
  { name:'花草风雨', items:[
    ['花','huā','花朵','🌸'],['草','cǎo','小草','🌿'],['叶','yè','叶子','🍃'],['果','guǒ','水果','🍎'],['雨','yǔ','下雨','🌧️'],['风','fēng','大风','🌬️'] ] },
  { name:'生活常用', items:[
    ['米','mǐ','大米','🍚'],['门','mén','大门','🚪'],['书','shū','书本','📚'],['车','chē','汽车','🚗'],['家','jiā','回家','🏠'],['田','tián','田地','🌾'] ] },
  { name:'更多汉字', items:[
    ['七','qī','七天','7️⃣'],['八','bā','八个','8️⃣'],['九','jiǔ','九月','9️⃣'],['十','shí','十颗','🔟'],['云','yún','白云','☁️'],['石','shí','石头','🪨'] ] },
];

/* ---------- 数学乐园：1-10 数字认知（描中文数字 + 数量配对） ---------- */
const MATH_NUMBERS = [
  ['1', '一', 'one', '🐱', '一只小猫'],
  ['2', '二', 'two', '🐰', '两只兔子'],
  ['3', '三', 'three', '🎈', '三个气球'],
  ['4', '四', 'four', '🍀', '四叶草'],
  ['5', '五', 'five', '⭐', '五颗星星'],
  ['6', '六', 'six', '🦆', '六只小鸭'],
  ['7', '七', 'seven', '🌈', '彩虹七色'],
  ['8', '八', 'eight', '🕷️', '蜘蛛八条腿'],
  ['9', '九', 'nine', '🐉', '九条小龙'],
  ['10', '十', 'ten', '🖐️', '十根手指'],
];
const countEm = (em, n) => em.repeat(n);
/* 数数题：给出 n 个 emoji，三选一 */
function countQuizOf(item) {
  const n = +item[0];
  return { prompt: `数一数，有几个 ${item[3]} ？`, visual: countEm(item[3], n), say: `数一数，这里有几个${item[3]}？`, opts: shuffleArr([n, ...[n + 1, n + 2, n - 1, n - 2].filter(v => v >= 1 && v <= 10).slice(0, 2)]), answer: n };
}

/* ---------- 数学乐园：100 以内加减法（10 个难度关，口算题由 gen 现场生成） ---------- */
const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const cnOp = op => op === '+' ? '加' : op === '×' ? '乘' : '减';
function shuffleArr(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
/* 口算题：{ prompt 题干, visual 大字, say 口播/跟读文本, opts 三个选项, answer 正解 } */
function quizOf(a, op, b, r) {
  /* 干扰项：加减法取相近数；乘法取同行邻句口词得数 */
  const near = op === '×'
    ? [a * (b + 1), (a - 1) * b, a * (b - 1), (a + 1) * b, r + 1, r - 1, r + a, r - a]
    : [r + 1, r - 1, r + 2, r - 2, r + 10, r - 10, r + 3, r - 3];
  const opts = [r];
  for (const c of near) { if (c >= 1 && !opts.includes(c) && opts.length < 3) opts.push(c); }
  let filler = 1;
  while (opts.length < 3) { if (!opts.includes(filler)) opts.push(filler); filler++; }
  return { prompt: `${a} ${op} ${b} = ?`, visual: `${a} ${op} ${b}`, say: `${a}${cnOp(op)}${b}`, opts: shuffleArr(opts), answer: r };
}
/* 示范算式：{ f 展示式, play 播报, target 跟读目标, ans 描红内容 } */
function eq(a, op, b, r) {
  const say = `${a}${cnOp(op)}${b}等于${r}`;
  return { f: `${a} ${op} ${b} = ${r}`, play: [{ text: say, lang: 'zh-CN' }], target: say, ans: String(r) };
}
function addNoCarry() { const b = rnd(2, 9), a = rnd(11, 99 - b); return (a % 10) + b > 9 ? addNoCarry() : quizOf(a, '+', b, a + b); }
function addCarry() { const b = rnd(12, 89), a = rnd(11, Math.min(89, 99 - b)); return (a % 10) + (b % 10) < 10 ? addCarry() : quizOf(a, '+', b, a + b); }
function subNoBorrow() { const b = rnd(11, 88), a = rnd(b + 10, Math.min(99, b + 88)); return a % 10 < b % 10 ? subNoBorrow() : quizOf(a, '-', b, a - b); }
function subBorrow() { const b = rnd(12, 88), a = rnd(b + 2, Math.min(99, b + 60)); return a % 10 >= b % 10 ? subBorrow() : quizOf(a, '-', b, a - b); }
function anyCalc() { return [addNoCarry, addCarry, subNoBorrow, subBorrow][rnd(0, 3)](); }
const MATH_CALC_LEVELS = [
  { id: 'a1', name: '一位数加法', sub: '从最小的数开始加', em: '🐣', tip: '3 个苹果加 2 个苹果，一共 5 个苹果', ex: eq(3, '+', 2, 5), gen: () => { const a = rnd(1, 8), b = rnd(1, 9 - a); return quizOf(a, '+', b, a + b); } },
  { id: 's1', name: '一位数减法', sub: '从总数里拿走几个', em: '🍪', tip: '7 块饼干吃掉 3 块，还剩 4 块饼干', ex: eq(7, '-', 3, 4), gen: () => { const a = rnd(3, 9), b = rnd(1, a - 1); return quizOf(a, '-', b, a - b); } },
  { id: 'a2', name: '凑十加法', sub: '9 + 4：先凑十再加', em: '🔟', tip: '9 加 1 凑成 10，再加 3，等于 13', ex: eq(9, '+', 4, 13), gen: () => { const a = rnd(2, 9), b = rnd(11 - a, Math.min(9, 18 - a)); return quizOf(a, '+', b, a + b); } },
  { id: 's2', name: '十减几', sub: '10 - 4 = 6，反过来也想一想', em: '🖐️', tip: '10 根手指弯下 4 根，还看到 6 根', ex: eq(10, '-', 4, 6), gen: () => { const b = rnd(1, 9); return quizOf(10, '-', b, 10 - b); } },
  { id: 'a3', name: '两位数不进位', sub: '23 + 45：十位加十位', em: '🚀', tip: '个位 3+5=8，十位 2+4=6，答案是 68', ex: eq(23, '+', 45, 68), gen: addNoCarry },
  { id: 'a4', name: '两位数进位', sub: '36 + 28：个位满十要进一', em: '🎯', tip: '个位 6+8=14，写 4 进 1，十位 3+2+1=6', ex: eq(36, '+', 28, 64), gen: addCarry },
  { id: 's3', name: '两位数不退位', sub: '68 - 25：慢慢减不着急', em: '🧱', tip: '个位 8-5=3，十位 6-2=4，答案是 43', ex: eq(68, '-', 25, 43), gen: subNoBorrow },
  { id: 's4', name: '两位数退位', sub: '52 - 18：个位不够向十位借', em: '🐦', tip: '个位 2 减 8 不够，借 1 当 10：12-8=4，十位 4-1=3', ex: eq(52, '-', 18, 34), gen: subBorrow },
  { id: 'm1', name: '加减混合', sub: '看清符号再动笔', em: '🔀', tip: '加号就合起来，减号就拿走', ex: eq(47, '-', 26, 21), gen: anyCalc },
  { id: 'm2', name: '百数大挑战', sub: '100 以内全部算一遍', em: '🏆', tip: '闯过这一关，你就是口算小勇士', ex: eq(57, '+', 36, 93), gen: anyCalc },
];

/* ---------- 数学乐园：九九乘法表（1 的口诀 … 9 的口诀，按行成组） ---------- */
const CN_DIGITS = ['零','一','二','三','四','五','六','七','八','九'];
const cnNum = n => {
  const t = Math.floor(n / 10), u = n % 10;
  if (!t) return CN_DIGITS[u];
  return (t > 1 ? CN_DIGITS[t] : '') + '十' + (u ? CN_DIGITS[u] : '');
};
const MULT_EM = ['', '🐣', '🐱', '🎈', '🍀', '⭐', '🦆', '🌈', '🕷️', '🐉'];
const MULT_FACTS = Array.from({ length: 9 }, (_, i) => {
  const n = i + 1;
  return {
    n, name: n + ' 的口诀', em: MULT_EM[n],
    items: Array.from({ length: 10 - n }, (_, k) => {
      const m = k + n, r = n * m;
      const ku = `${CN_DIGITS[n]}${CN_DIGITS[m]}${r < 10 ? '得' : ''}${cnNum(r)}`;   // 传统口诀：二三得六 / 三四十二
      return {
        a: n, b: m, r, kn: ku, f: `${n} × ${m} = ${r}`,
        play: [{ text: `${n}乘${m}等于${r}`, lang: 'zh-CN' }],
        target: `${n}乘${m}等于${r}`,
        ans: String(r),
      };
    }),
  };
});
function multQuizOf(row) { const f = row.items[rnd(0, row.items.length - 1)]; return quizOf(f.a, '×', f.b, f.r); }

/* ---------- 数学模块元信息（首页卡片 / 学习页 / 奖励规则共用） ---------- */
const MATH_GROUPS = [
  { name: '数字 1-10', color: '#57aeee' },
  { name: '100 以内加减', color: '#f3764a' },
  { name: '九九乘法表', color: '#9d7bf0' },
];
const MODULE_TOTAL = 5;      // 学习模块总数（首页今日进度卡分母）

/* ---------- 26 只宠物 + 专属食物（A-Z 固定顺序） ---------- */
const PETS = [
  { L:'A', name:'小蚂蚁', en:'Ant',      em:'🐜', food:['糖粒','Sugar','🍬'] },
  { L:'B', name:'小熊',   en:'Bear',     em:'🐻', food:['浆果','Berry','🫐'] },
  { L:'C', name:'小猫',   en:'Cat',      em:'🐱', food:['小鱼','Fish','🐟'] },
  { L:'D', name:'小狗',   en:'Dog',      em:'🐶', food:['骨头','Bone','🦴'] },
  { L:'E', name:'大象',   en:'Elephant', em:'🐘', food:['香蕉','Banana','🍌'] },
  { L:'F', name:'小青蛙', en:'Frog',     em:'🐸', food:['小虫','Worm','🪱'] },
  { L:'G', name:'长颈鹿', en:'Giraffe',  em:'🦒', food:['树叶','Leaf','🍃'] },
  { L:'H', name:'小马',   en:'Horse',    em:'🐴', food:['干草','Hay','🌾'] },
  { L:'I', name:'小蜥蜴', en:'Iguana',   em:'🦎', food:['菜叶','Greens','🥬'] },
  { L:'J', name:'水母',   en:'Jellyfish',em:'🪼', food:['小虾','Shrimp','🦐'] },
  { L:'K', name:'袋鼠',   en:'Kangaroo', em:'🦘', food:['青草','Grass','🌿'] },
  { L:'L', name:'小狮子', en:'Lion',     em:'🦁', food:['肉块','Meat','🍖'] },
  { L:'M', name:'小老鼠', en:'Mouse',    em:'🐭', food:['奶酪','Cheese','🧀'] },
  { L:'N', name:'小松鼠', en:'Squirrel', em:'🐿️', food:['坚果','Nut','🥜'] },
  { L:'O', name:'猫头鹰', en:'Owl',      em:'🦉', food:['小田鼠','Rat','🐁'] },
  { L:'P', name:'大熊猫', en:'Panda',    em:'🐼', food:['竹子','Bamboo','🎋'] },
  { L:'Q', name:'小蜜蜂', en:'Queen Bee',em:'🐝', food:['花蜜','Nectar','🍯'] },
  { L:'R', name:'小兔子', en:'Rabbit',   em:'🐰', food:['胡萝卜','Carrot','🥕'] },
  { L:'S', name:'小蛇',   en:'Snake',    em:'🐍', food:['鸡蛋','Egg','🥚'] },
  { L:'T', name:'小乌龟', en:'Turtle',   em:'🐢', food:['菜叶','Greens','🥬'] },
  { L:'U', name:'伞鸟',   en:'Umbrella bird', em:'🦜', food:['果子','Fruit','🍎'] },
  { L:'V', name:'秃鹫',   en:'Vulture',  em:'🦅', food:['肉块','Meat','🍖'] },
  { L:'W', name:'大鲸鱼', en:'Whale',    em:'🐋', food:['磷虾','Krill','🦐'] },
  { L:'X', name:'奇诺鸟', en:'Xenops',   em:'🐦', food:['虫子','Bug','🐛'] },
  { L:'Y', name:'牦牛',   en:'Yak',      em:'🐂', food:['青草','Grass','🌿'] },
  { L:'Z', name:'斑马',   en:'Zebra',    em:'🦓', food:['青草','Grass','🌿'] },
];

/* ---------- 宠物皮肤：demo 8 套成品图 [id, 名称, 图标, 星星价, 风格] ---------- */
const SKIN_CATALOG = [
  ['forest','自然森林','🌿',0,'原色'],
  ['party','生日派对','🎉',35,'原色'],
  ['chef','小小厨师','👨‍🍳',85,'原色'],
  ['royal','星光王冠','👑',150,'原色'],
  ['candy','彩虹糖果','🌈',50,'彩色'],
  ['hero','超级英雄','🦸',70,'彩色'],
  ['space','太空探险','🚀',120,'彩色'],
  ['dream','五彩梦境','✨',160,'彩色'],
];
/* 皮肤成品图路径（webp，加载失败回退 emoji） */
function skinImg(code, skinId) { return 'assets/pet-skins/' + code + '-' + skinId + '.webp'; }

/* 奖励规则文案（首页「奖励规则」弹层，与 demo 一致） */
const RULES = [
  ['英文字母首次通关', '⭐ +12 · 🟡 +20'],
  ['英文单词首次通关', '⭐ +8 · 🟡 +12'],
  ['汉字 / 拼音首次通关', '🟡 +20'],
  ['数学口算首次通关', '🟡 +20'],
  ['英文复习 / 答题 / 跟读', '⭐ +2 · 🟡 +3'],
  ['汉字 / 拼音 / 数学复习', '🟡 +3'],
  ['解锁宠物', '累计积分 · 不扣除'],
];

/* 经济系统常量（全照 demo） */
const ECON = {
  foodPrice: 10,          // 一份食物消耗积分（补 demo 死链，沿用 PRD）
  foodCap: 99,            // 单只宠物食物库存上限
  feedGain: 20,           // 每次投喂 +好感值（满级 Lv5 = 80 好感）
  maxLevel: 5,
  /* 解锁门槛：累计积分达标自动解锁（不扣除），A→Z 递增（demo 100+200i） */
  unlockAt: (i) => 100 + i * 200,      // A=100 ... Z=5100
  /* 每个练习独立发奖：首次 (first) / 复习 (again) 的 {p:积分, s:星星} */
  rewards: {
    letters: { first: { p: 20, s: 12 }, again: { p: 3, s: 2 } },
    words:   { first: { p: 12, s: 8  }, again: { p: 3, s: 2 } },
    hanzi:   { first: { p: 20, s: 0  }, again: { p: 3, s: 0 } },
    pinyin:  { first: { p: 20, s: 0  }, again: { p: 3, s: 0 } },
    math:    { first: { p: 20, s: 0  }, again: { p: 3, s: 0 } },
  },
};
