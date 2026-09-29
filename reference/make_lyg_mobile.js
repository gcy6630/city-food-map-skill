const fs = require('fs');
const path = require('path');
const dir = __dirname;
let t = fs.readFileSync(path.join(dir, 'build_mobile.js'), 'utf8');

const rep = (a, b, tag) => { if (!t.includes(a)) { console.log('!! MISS ' + tag); return; } t = t.replace(a, b); console.log('ok ' + tag); };

rep('// 生成手机版单文件地图：徐州美食手机版.html（内联 Leaflet + 数据，无外部依赖文件）',
  '// 生成手机版单文件地图：连云港美食手机版.html（内联 Leaflet + 数据，无外部依赖文件）', 'comment');
rep("path.join(dir, 'items.json')", "path.join(dir, 'items_lyg.json')", 'items src');
rep('<title>徐州美食打卡地图</title>', '<title>连云港美食打卡地图</title>', 'title');
rep(`<div id="top"><b>徐州美食打卡地图</b><span>\${data.length} 家 · 来自 2 条抖音</span></div>`,
  `<div id="top"><b>连云港美食打卡地图</b><span>\${data.length} 家 · 抖音本地人评论整理</span></div>`, 'topbar');
rep("path.join(dir, '徐州美食手机版.html')", "path.join(dir, '连云港美食手机版.html')", 'out');

fs.writeFileSync(path.join(dir, 'build_mobile_lyg.js'), t, 'utf8');
const left = t.split(/\r?\n/).map((l, i) => [i + 1, l]).filter(([, l]) => /徐州/.test(l));
console.log('written. remaining 徐州: ' + left.length);
left.forEach(([n, l]) => console.log('  ' + n + ': ' + l.trim().slice(0, 140)));
