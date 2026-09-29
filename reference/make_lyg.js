// 把 build_map.js 的后半段模板 + 连云港的数据头拼成 build_lyg.js
const fs = require('fs');
const path = require('path');
const dir = __dirname;

const head = fs.readFileSync(path.join(dir, '_lyg_head.js'), 'utf8');
const src = fs.readFileSync(path.join(dir, 'build_map.js'), 'utf8').split(/\r?\n/);
const tail = src.slice(73, 211).join('\n'); // 第74行起到结尾

let t = tail;
const rep = (a, b, tag) => { if (!t.includes(a)) { console.log('!! MISS: ' + tag); return; } t = t.replace(a, b); console.log('ok: ' + tag); };

rep(`const catColor = {
  '烧烤': '#e74c3c', '米线': '#16a085', '把子肉': '#a0522d', '早餐·汤饼': '#f39c12',
  '本地菜': '#2980b9', '馍·面食': '#7f8c8d', '卤味·熟食': '#d35400', '夜市': '#8e44ad',
};`, `const catColor = {
  '豆丹·特色': '#27ae60', '凉皮凉面': '#e67e22', '米线·面食': '#16a085', '海鲜': '#2980b9',
  '烧烤': '#e74c3c', '本地菜馆': '#8e44ad', '小吃·早点': '#f39c12', '烧鸡·卤味': '#a0522d',
};`, 'catColor');

rep(`const catShort = { '烧烤': '烤', '米线': '线', '把子肉': '肉', '早餐·汤饼': '早', '本地菜': '菜', '馍·面食': '馍', '卤味·熟食': '卤', '夜市': '夜' };
const catOrder = ['烧烤', '米线', '把子肉', '早餐·汤饼', '馍·面食', '卤味·熟食', '本地菜', '夜市'];`,
  `const catShort = { '豆丹·特色': '丹', '凉皮凉面': '粉', '米线·面食': '线', '海鲜': '鲜', '烧烤': '烤', '本地菜馆': '菜', '小吃·早点': '点', '烧鸡·卤味': '鸡' };
const catOrder = ['豆丹·特色', '凉皮凉面', '米线·面食', '海鲜', '烧烤', '本地菜馆', '小吃·早点', '烧鸡·卤味'];`, 'catShort/Order');

rep(`const items = [];
const missing = [];
picks.forEach((p) => {
  const d = index.get(p.name);
  if (!d) { missing.push(p.name); return; }
  items.push(Object.assign({}, p, {
    lng: parseFloat(d.lng), lat: parseFloat(d.lat),`,
  `const items = [];
const missing = [];
picks.forEach((p) => {
  const all0 = byKw.get(p.kw) || [];
  const d = p.name ? all0.find((x) => x.name.includes(p.name)) : all0.filter((x) => relevant(p.kw, x.name))[p.idx || 0];
  if (!d) { missing.push(p.kw); return; }
  items.push({
    idx: items.length + 1,
    name: d.name, cat: p.cat, tier: p.tier, src: p.src, note: p.note, kw: p.kw,
    lng: parseFloat(d.lng), lat: parseFloat(d.lat),`, 'items resolve');

rep(`<title>徐州美食打卡地图</title>`, `<title>连云港美食打卡地图</title>`, 'title');
rep(`<h1>徐州美食打卡地图</h1>`, `<h1>连云港美食打卡地图</h1>`, 'h1');
rep(`<p class="sub">数据来源：两条抖音视频（林甫烟火圈 · Renyi毅哥）+ 评论区推荐；坐标与评分取自高德地图。<br>覆盖视频里出现的全部品类：烧烤、米线、把子肉、早餐汤饼、馍、本地菜、夜市。共 \${data.length} 个点，点条目可定位。地址为高德原始文本，个别字有字形错位，导航请以坐标为准。</p>`,
  `<p class="sub">数据来源：抖音「连云港美食 / 本地人推荐 / 必吃 / 苍蝇馆子 / 豆丹」共 781 条视频 + 16 条视频的约 7900 条评论，挑出本地人反复提到的店；坐标与评分取自高德地图。<br>共 \${data.length} 个点，点左边条目可定位。当地特色：豆丹、沙光鱼、凉皮凉面（糖醋口）、花果山风鹅、桃林烧鸡、赣榆煎饼。</p>`, 'sub');
rep(`setView([34.262, 117.20], 12)`, `setView([34.62, 119.22], 10)`, 'center');
rep(`'徐州美食打卡地图.html'`, `'连云港美食打卡地图.html'`, 'out html');
rep(`md.push('# 徐州美食打卡清单');`, `md.push('# 连云港美食打卡清单');`, 'md title');
rep(`md.push('来源：抖音「林甫烟火圈」徐州烧烤视频 + 抖音「Renyi毅哥」全国美食重镇·徐州（含两条视频的评论区推荐）。');`,
  `md.push('来源：抖音搜索「连云港美食 / 连云港本地人推荐 / 连云港必吃 / 连云港苍蝇馆子 / 连云港豆丹」共 781 条视频的标题与评论区（其中 16 条视频抓了约 7900 条评论）里，本地人反复提到的店。');`, 'md source');
rep(`'徐州美食打卡清单.md'`, `'连云港美食打卡清单.md'`, 'out md');
rep(`'items.json'`, `'items_lyg.json'`, 'out json');

// items.push({ ... }) 的收尾比 Object.assign 版本少一层括号
rep(`    signature: d.signature || '', poiid: d.poiid,
  }));
});`, `    signature: d.signature || '', poiid: d.poiid,
  });
});
// idx 从 1 开始：模板里 markers[it.idx] / 列表徽标都用它，桌面版与手机版一致
items.forEach((it, i) => { it.idx = i + 1; });`, 'items closer');

const out = head + '\n' + t;
fs.writeFileSync(path.join(dir, 'build_lyg.js'), out, 'utf8');

const left = out.split(/\r?\n/).map((l, i) => [i + 1, l]).filter(([, l]) => /徐州/.test(l));
console.log('build_lyg.js written, lines=' + out.split('\n').length);
console.log('remaining 徐州 refs: ' + left.length);
left.forEach(([n, l]) => console.log('  ' + n + ': ' + l.trim().slice(0, 150)));
