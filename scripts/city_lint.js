// 城市串味自检 —— 防止"徐州模板直接改个城市名就发出去"这类事故
//
// 用法:
//   node city_lint.js <生成的html...> --city 连云港 --forbid "徐州,把子肉,夜市,林甫烟火圈" [--items items_lyg.json]
//
// 检查项（任一不过 → 退出码 1）:
//   1. 文件必须出现 --city
//   2. 文件不得出现 --forbid 里任何一个词（上次城市的残留文案/分类）
//   3. 不得有 style="background:undefined"（分类配色缺失 → 标记透明、筛选按钮白底白字）
//   4. 每一个 setView([lat,lng] 必须落在 items 的包围盒里（±margin 度）
//      这一条专治"手机版打开停在上一个城市"
//   5. items 里出现的每个分类，都必须在 const colors 里有配色
const fs = require('fs');
const path = require('path');
const { readJSON } = require('./_env.js');

const args = process.argv.slice(2);
const flags = {};
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) { flags[args[i].slice(2)] = args[i + 1]; i++; }
  else files.push(args[i]);
}
const CITY = flags.city;
const FORBID = (flags.forbid || '').split(',').map((s) => s.trim()).filter(Boolean);
const MARGIN = Number(flags.margin || 0.6);

if (!CITY || !files.length) {
  console.error('用法: node city_lint.js <html...> --city <城市名> --forbid "词1,词2" [--items items.json] [--margin 0.6]');
  process.exit(2);
}

let items = null;
if (flags.items) {
  try { items = readJSON(flags.items); }
  catch (e) { console.error('读不到 --items: ' + e.message); process.exit(2); }
}
let bbox = null;
if (items && items.length) {
  const la = items.map((i) => i.lat), lo = items.map((i) => i.lng);
  bbox = [Math.min(...la) - MARGIN, Math.min(...lo) - MARGIN, Math.max(...la) + MARGIN, Math.max(...lo) + MARGIN];
}

let bad = 0;
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const problems = [];

  if (!t.includes(CITY)) problems.push(`没有出现城市名「${CITY}」`);
  for (const w of FORBID) {
    const n = t.split(w).length - 1;
    if (n) problems.push(`出现禁用词「${w}」×${n}`);
  }

  const undef = t.split('background:undefined').length - 1;
  if (undef) problems.push(`background:undefined ×${undef}（分类没配色）`);

  for (const m of t.matchAll(/setView\(\[([-\d.]+),\s*([-\d.]+)\]/g)) {
    const lat = Number(m[1]), lng = Number(m[2]);
    if (bbox && (lat < bbox[0] || lat > bbox[2] || lng < bbox[1] || lng > bbox[3])) {
      problems.push(`setView([${lat}, ${lng}]) 不在本城范围内（items 范围 ${bbox.map((x) => x.toFixed(2)).join('~')}）`);
    } else {
      console.log(`   · setView([${lat}, ${lng}]) OK`);
    }
  }
  const nSet = (t.match(/setView\(/g) || []).length;
  const nFit = (t.match(/fitBounds\(/g) || []).length;
  if (!nSet && !nFit) problems.push('既没有 setView 也没有 fitBounds，地图没有初始视野');
  if (nFit) console.log(`   · 有 fitBounds，打开自动框住全部标记`);

  // 分类配色齐全性
  const cm = t.match(/const colors\s*=\s*(\{[^}]*\})/);
  if (cm) {
    let colors = {};
    try { colors = JSON.parse(cm[1]); } catch (e) {}
    const cats = items
      ? [...new Set(items.map((i) => i.cat))]
      : [...new Set([...t.matchAll(/"cat"\s*:\s*"([^"]+)"/g)].map((m) => m[1]))];
    const miss = cats.filter((c) => !colors[c]);
    if (miss.length) problems.push(`分类缺配色: ${miss.join(' / ')}`);
    else console.log(`   · ${cats.length} 个分类配色齐全`);
  } else {
    const cm2 = t.match(/const catColor[^=]*=\s*\{[\s\S]{0,2000}?\n\}/);
    if (!cm2) console.log('   · （没找到颜色表，跳过配色检查）');
  }

  if (problems.length) {
    bad++;
    console.log(`\n✗ ${path.basename(f)}`);
    problems.forEach((p) => console.log('    - ' + p));
  } else {
    console.log(`\n✓ ${path.basename(f)} 干净`);
  }
}
console.log(bad ? `\n❌ ${bad}/${files.length} 个文件有问题，别发。` : `\n✅ 全部通过（${files.length} 个文件）`);
process.exit(bad ? 1 : 0);
