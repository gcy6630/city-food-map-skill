// 生成交付物：徐州美食打卡地图.html + 徐州美食打卡清单.md
// 数据源: amap_results.json / amap_rest.json / amap_mianxian.json / amap_rest2.json
const fs = require('fs');
const path = require('path');
const dir = __dirname;

function load(file) {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return []; }
}
const all = []
  .concat(load('amap_results.json'))
  .concat(load('amap_rest.json'))
  .concat(load('amap_mianxian.json'))
  .concat(load('amap_rest2.json'))
  .concat(load('amap_rest3.json'));
const index = new Map();
for (const r of all) for (const p of (r.pois || [])) if (!index.has(p.name)) index.set(p.name, Object.assign({ keyword: r.keyword }, p));

// 人工挑选（按视频来源/品类分组）
const picks = [
  // ---- 烧烤 ----
  { name: '胡姐烧烤(庆云桥店)', cat: '烧烤', tier: 'core', src: '视频1', note: '视频里那家"巷子里的30年老店"最可能是它；招牌里就有手擀面' },
  { name: '胡姐烧烤(段庄店)', cat: '烧烤', tier: 'core', src: '视频1', note: '同品牌另一家，评分接近' },
  { name: '胡姐烧烤(龟山汉墓店)', cat: '烧烤', tier: 'alt', src: '视频1', note: '连锁第三家，离市中心远' },
  { name: '绿圆3只羊羊肉串(紫荆园店)', cat: '烧烤', tier: 'core', src: '视频1评论区', note: '评论里被点名的另一家烧烤' },
  { name: '三只羊羊肉串和信店', cat: '烧烤', tier: 'alt', src: '视频1评论区', note: '评论提到"和信广场"' },
  { name: '八戒烧烤城(响山路店)', cat: '烧烤', tier: 'core', src: '视频1评论区', note: '评论里的"八戒家"，三家里评分最高' },
  { name: '八戒烧烤城(绿地领海店)', cat: '烧烤', tier: 'alt', src: '视频1评论区', note: '招牌里也有手擀面' },
  { name: '八戒烧烤城(总店)', cat: '烧烤', tier: 'alt', src: '视频1评论区', note: '总店，招牌是小龙虾' },
  { name: '贾青羊肉串(户部山店)', cat: '烧烤', tier: 'core', src: '视频2评论区', note: '全场评价数最高（1438条/4.7分），评论区点名的徐州烧烤' },
  { name: '贾青羊肉串(圆梦店)', cat: '烧烤', tier: 'alt', src: '视频2评论区', note: '同品牌，4.8分' },
  { name: '老广烧烤(康馨园总店)', cat: '烧烤', tier: 'core', src: '视频2评论区', note: '招牌里写着"非遗白串、油包肝"——正好对上视频里夸的白串' },
  { name: '老广烧烤(户部山店)', cat: '烧烤', tier: 'alt', src: '视频2评论区', note: '同品牌，靠近户部山' },
  { name: '西祠老徐州鲜货·海鲜烧烤', cat: '烧烤', tier: 'core', src: '视频2评论区', note: '评论清单里的"西祠烧烤"；高德上叫"西祠老徐州鲜货"，4.7分/104评/人均69' },
  { name: '西祠头牌·老徐州鲜货烧烤', cat: '烧烤', tier: 'alt', src: '视频2评论区', note: '同品牌另一家，4.5分；靠近徐医附院地铁站' },
  { name: '唐老二羊肉串手擀面', cat: '烧烤', tier: 'core', src: '视频2评论区', note: '评论清单里的"唐老二烧烤"；4.7分/302评，招牌里也有手擀面' },
  { name: '唐老二羊肉串手擀面(工农路店)', cat: '烧烤', tier: 'alt', src: '视频2评论区', note: '同品牌，4.6分/63评' },
  // ---- 米线（视频 00:20 品类）----
  { name: '壹家米线(建国小区店)', cat: '米线', tier: 'core', src: '视频2评论区', note: '评论原话"丰储街壹家米线也好吃"；4.7分/344评/人均17' },
  { name: '一品飘香健康米线(一中店)', cat: '米线', tier: 'core', src: '视频2评论区', note: '评论点名的"一品飘香米线"；946条评价（醒狮小区对面）' },
  { name: '一品飘香健康米线(丰储街店)', cat: '米线', tier: 'alt', src: '视频2评论区', note: '同品牌，离壹家米线很近' },
  { name: '云龙湖阿喆米线(总店)', cat: '米线', tier: 'core', src: '视频2评论区', note: '评论写"云龙湖阿哲米线"（高德记作"阿喆"）；1104条评价' },
  { name: '云龙湖阿喆米线(鑫苑景城店)', cat: '米线', tier: 'alt', src: '视频2评论区', note: '同品牌，4.8分' },
  { name: '建国刘记米线(兴隆街店)', cat: '米线', tier: 'alt', src: '我按高德评分补的', note: '评论没点名——但5.0分/679评/人均13，徐州米线天花板；不看可忽略' },
  { name: '老奎山米线(总店)', cat: '米线', tier: 'alt', src: '我按高德评分补的', note: '同上，4.8分/514评' },
  // ---- 把子肉（视频 00:42 品类）----
  { name: '段庄老六把子肉', cat: '把子肉', tier: 'core', src: '视频2评论区', note: '评论原话"把子肉我觉得段老六的也好吃"；4.7分/125评' },
  { name: '玉梅周记把子肉(徐州总店)', cat: '把子肉', tier: 'core', src: '视频2评论区', note: '评论点名的"玉梅把子肉"（有争议，3.9分/205评）' },
  { name: '周记把子肉(第一分店)', cat: '把子肉', tier: 'alt', src: '视频2评论区', note: '同品牌分店，评分更高' },
  // ---- 早餐·汤饼（视频 00:20 早餐）----
  { name: '恒香包子店(黄河新村店)', cat: '早餐·汤饼', tier: 'core', src: '视频2评论区', note: '评论原话：黄河新村菜市场边上，开了20多年；285条评价很能说明问题' },
  { name: '黄河恒香包子店(湖滨店)', cat: '早餐·汤饼', tier: 'alt', src: '视频2评论区', note: '同品牌分店' },
  { name: '马市街饣它汤(解放路店)', cat: '早餐·汤饼', tier: 'core', src: '视频2评论区', note: '评论原话"早上去马市街喝碗饣它汤配八股油条"；4.6分/822评，就是那家老字号' },
  { name: '马市街食它汤(黄山新村店)', cat: '早餐·汤饼', tier: 'alt', src: '视频2评论区', note: '同品牌分店（高德把"饣它"记作"食它"）' },
  // ---- 馍·面食（视频 01:46 品类）----
  { name: '徐州郭记辣馍恩施烧饼总店', cat: '馍·面食', tier: 'core', src: '视频2评论区', note: '评论原话"辣馍还是吃郭记（老店）"；高德上全名带"恩施烧饼总店"，富国街，4.5分/62评' },
  { name: '郭际辣饼铺', cat: '馍·面食', tier: 'alt', src: '视频2评论区', note: '同音异写（郭记/郭际），4.7分/336评——评论说的"老店"也可能指这家' },
  // ---- 卤味·熟食 ----
  { name: '鹿记油烫鸭(大坝头店)', cat: '卤味·熟食', tier: 'core', src: '视频2评论区', note: '评论区反复问的"油烫鸭"；4.5分/53评/人均35，大坝头老店，招牌还有板面、鸭头鸭腿' },
  { name: '鹿记油烫鸭(绿地店)', cat: '卤味·熟食', tier: 'alt', src: '视频2评论区', note: '同品牌分店，4.4分' },
  // ---- 本地菜 ----
  { name: '祥海砂锅居(铜牛店)', cat: '本地菜', tier: 'core', src: '视频2评论区', note: '评论推荐地锅鸡/蒜爆鱼/干煸菜' },
  { name: '祥海砂锅居(环球港店)', cat: '本地菜', tier: 'alt', src: '视频2评论区', note: '同品牌分店' },
  { name: '廉厨干煸鸡(滨湖店)', cat: '本地菜', tier: 'core', src: '视频2评论区', note: '评论提到的"廉厨"，主打干煸鸡' },
  { name: '廉厨干煸鸡', cat: '本地菜', tier: 'alt', src: '视频2评论区', note: '同品牌（汉景大道）' },
  { name: '什一餐厅(苏宁广场店)', cat: '本地菜', tier: 'core', src: '视频2评论区', note: '评论说排队严重；625条评价/4.7分，招牌地锅鸡' },
  { name: '徐州老味菜(新世纪商业广场店)', cat: '本地菜', tier: 'core', src: '视频2评论区', note: '人均只要27，330条评价' },
  // ---- 夜市 ----
  { name: '本朝夜市城(西苑总店)', cat: '夜市', tier: 'core', src: '视频1评论区', note: '评论说被这条视频带火，去要排队两小时' },
];

const catColor = {
  '烧烤': '#e74c3c', '米线': '#16a085', '把子肉': '#a0522d', '早餐·汤饼': '#f39c12',
  '本地菜': '#2980b9', '馍·面食': '#7f8c8d', '卤味·熟食': '#d35400', '夜市': '#8e44ad',
};
const catShort = { '烧烤': '烤', '米线': '线', '把子肉': '肉', '早餐·汤饼': '早', '本地菜': '菜', '馍·面食': '馍', '卤味·熟食': '卤', '夜市': '夜' };
const catOrder = ['烧烤', '米线', '把子肉', '早餐·汤饼', '馍·面食', '卤味·熟食', '本地菜', '夜市'];

const items = [];
const missing = [];
picks.forEach((p) => {
  const d = index.get(p.name);
  if (!d) { missing.push(p.name); return; }
  items.push(Object.assign({}, p, {
    lng: parseFloat(d.lng), lat: parseFloat(d.lat),
    address: String(d.address || '').replace(/[（(][^）)]*[）)]/g, (m) => (/步行|号口|[0-9]米/.test(m) ? '' : m)).trim(),
    rating: d.rating, reviews: d.reviews,
    price: String(d.avgPrice || '').replace(/^人均[:：]?/, '').replace(/^人均/, ''),
    signature: d.signature || '', poiid: d.poiid,
  }));
});
// 按品类排序编号
items.sort((a, b) => (catOrder.indexOf(a.cat) - catOrder.indexOf(b.cat)) || ((b.tier === 'core' ? 1 : 0) - (a.tier === 'core' ? 1 : 0)));

const amapMarker = (i) => 'https://uri.amap.com/marker?position=' + i.lng + ',' + i.lat + '&name=' + encodeURIComponent(i.name) + '&coordinate=gaode&callnative=1';
const amapNav = (i) => 'https://uri.amap.com/navigation?to=' + i.lng + ',' + i.lat + ',' + encodeURIComponent(i.name) + '&mode=car&coordinate=gaode&callnative=1';

// ---------- HTML ----------
const data = items.map((i, n) => Object.assign({}, i, { idx: n + 1, amapMarker: amapMarker(i), amapNav: amapNav(i) }));
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>徐州美食打卡地图</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="./leaflet.css">
<script src="./leaflet.js"></script>
<style>
  html,body{margin:0;height:100%;font-family:"Microsoft YaHei","PingFang SC",sans-serif}
  #wrap{display:flex;height:100%}
  #side{width:360px;overflow:auto;border-right:1px solid #ddd;background:#fafafa;flex:none}
  #map{flex:1}
  h1{font-size:17px;margin:14px 14px 4px}
  .sub{font-size:12px;color:#888;margin:0 14px 10px;line-height:1.5}
  .item{padding:9px 14px;border-top:1px solid #eee;cursor:pointer}
  .item:hover{background:#fff8e1}
  .nm{font-size:14px;font-weight:600}
  .badge{display:inline-block;min-width:19px;height:19px;line-height:19px;border-radius:50%;color:#fff;font-size:12px;text-align:center;margin-right:6px}
  .meta{font-size:12px;color:#777;margin:3px 0 0 25px;line-height:1.5}
  .note{font-size:12px;color:#b06a00;margin:3px 0 0 25px}
  .pin{display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);color:#fff;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)}
  .pin span{transform:rotate(45deg)}
  .pop b{font-size:14px}
  .pop div{font-size:12px;margin-top:4px;line-height:1.6}
  .pop a{display:inline-block;margin-top:6px;margin-right:8px;font-size:12px;color:#0a7d32}
  .leaflet-control-layers-toggle{background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26'><rect x='5' y='6' width='16' height='3.5' fill='%23555'/><rect x='5' y='11.5' width='16' height='3.5' fill='%23888'/><rect x='5' y='17' width='16' height='3.5' fill='%23bbb'/></svg>");background-size:26px 26px}
</style>
</head>
<body>
<div id="wrap">
  <div id="side">
    <h1>徐州美食打卡地图</h1>
    <p class="sub">数据来源：两条抖音视频（林甫烟火圈 · Renyi毅哥）+ 评论区推荐；坐标与评分取自高德地图。<br>覆盖视频里出现的全部品类：烧烤、米线、把子肉、早餐汤饼、馍、本地菜、夜市。共 ${data.length} 个点，点条目可定位。地址为高德原始文本，个别字有字形错位，导航请以坐标为准。</p>
    <div id="list"></div>
  </div>
  <div id="map"></div>
</div>
<script>
const items = ${JSON.stringify(data)};
const colors = ${JSON.stringify(catColor)};
const map = L.map('map').setView([34.262, 117.20], 12);
const gaode = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {subdomains:['1','2','3','4'], maxZoom:18, attribution:'高德地图'});
const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'© OpenStreetMap'});
gaode.addTo(map); L.control.layers({'高德':gaode,'OSM':osm}).addTo(map);
const markers = {};
items.forEach(function(it){
  const c = colors[it.cat] || '#555';
  const icon = L.divIcon({className:'', html:'<div class="pin" style="background:'+c+'"><span>'+it.idx+'</span></div>', iconSize:[26,26], iconAnchor:[13,26], popupAnchor:[0,-24]});
  const m = L.marker([it.lat, it.lng], {icon:icon}).addTo(map);
  m.bindPopup('<div class="pop"><b>'+it.name+'</b><div>'+it.cat+' ｜ 评分 '+(it.rating||'-')+' ｜ '+(it.reviews||'-')+' 条评价'+(it.price?' ｜ 人均 '+it.price:'')+'</div>'
    + '<div>'+(it.address||'')+'</div>'
    + (it.signature?'<div>招牌：'+it.signature+'</div>':'')
    + '<div style="color:#b06a00">'+it.note+'（来源：'+it.src+'）</div>'
    + '<a href="'+it.amapMarker+'" target="_blank">在高德打开</a><a href="'+it.amapNav+'" target="_blank">导航过去</a></div>');
  markers[it.idx] = m;
});
const list = document.getElementById('list');
let lastCat = null;
items.forEach(function(it){
  const c = colors[it.cat] || '#555';
  if (it.cat !== lastCat) {
    lastCat = it.cat;
    const h = document.createElement('div');
    h.style.cssText = 'padding:8px 14px 4px;font-size:12px;font-weight:700;color:'+c+';background:#f0f0f0;border-top:1px solid #ddd';
    h.textContent = it.cat + '（' + items.filter(function(x){return x.cat===it.cat;}).length + '）';
    list.appendChild(h);
  }
  const d = document.createElement('div');
  d.className = 'item';
  d.innerHTML = '<div class="nm"><span class="badge" style="background:'+c+'">'+it.idx+'</span>'+it.name+(it.tier==='alt'?' <span style="font-size:11px;color:#999">备选</span>':'')+'</div>'
    + '<div class="meta">'+(it.rating||'-')+'分 ｜ '+(it.reviews||'-')+'评'+(it.price?' ｜ 人均'+it.price:'')+'</div>'
    + '<div class="meta">'+(it.address||'')+'</div>'
    + '<div class="note">'+it.note+'</div>';
  d.onclick = function(){ map.setView([it.lat, it.lng], 15); markers[it.idx].openPopup(); };
  list.appendChild(d);
});
</script>
</body>
</html>`;
fs.writeFileSync(path.join(dir, '徐州美食打卡地图.html'), html, 'utf8');

// ---------- Markdown ----------
const md = [];
md.push('# 徐州美食打卡清单');
md.push('');
md.push('来源：抖音「林甫烟火圈」徐州烧烤视频 + 抖音「Renyi毅哥」全国美食重镇·徐州（含两条视频的评论区推荐）。');
md.push('坐标/评分/人均取自高德地图。共 ' + items.length + ' 个点。');
md.push('');
for (const c of catOrder) {
  const list = items.filter((x) => x.cat === c);
  if (!list.length) continue;
  md.push('## ' + c + '（' + list.length + '）');
  md.push('');
  for (const i of list) {
    md.push('### ' + i.idx + '. ' + i.name + (i.tier === 'alt' ? '（备选）' : ''));
    md.push('- 评分：' + (i.rating || '-') + ' ｜ 评价数：' + (i.reviews || '-') + (i.price ? ' ｜ 人均：' + i.price : ''));
    md.push('- 地址：' + (i.address || '-'));
    if (i.signature) md.push('- 招牌：' + i.signature);
    md.push('- 坐标（GCJ-02）：' + i.lng + ',' + i.lat);
    md.push('- 来源/说明：' + i.src + ' —— ' + i.note);
    md.push('- 高德打开：' + amapMarker(i));
    md.push('- 高德导航：' + amapNav(i));
    md.push('');
  }
}
fs.writeFileSync(path.join(dir, '徐州美食打卡清单.md'), md.join('\n'), 'utf8');
fs.writeFileSync(path.join(dir, 'items.json'), JSON.stringify(data, null, 2), 'utf8');

console.log('items=' + items.length + ' missing=' + JSON.stringify(missing));
