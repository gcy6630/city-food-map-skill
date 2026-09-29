// 生成手机版单文件地图：徐州美食手机版.html（内联 Leaflet + 数据，无外部依赖文件）
const fs = require('fs');
const path = require('path');
const dir = __dirname;

const items = JSON.parse(fs.readFileSync(path.join(dir, 'items.json'), 'utf8'));
const leafletJs = fs.readFileSync(path.join(dir, 'leaflet.js'), 'utf8');
const leafletCss = fs.readFileSync(path.join(dir, 'leaflet.css'), 'utf8');

// 分类配色统一放 cat_colors.json（徐州、连云港共用），避免各城市各写一份漏掉新分类
let catColor = {};
try { catColor = JSON.parse(fs.readFileSync(path.join(dir, 'cat_colors.json'), 'utf8')); }
catch (e) { console.error('!! 读不到 cat_colors.json：' + e.message); }
const cats = [];
items.forEach((i) => { if (!cats.includes(i.cat)) cats.push(i.cat); });
const noColor = cats.filter((c) => !catColor[c]);
if (noColor.length) console.error('!! 这些分类没有配色（会变成白底白字/透明标记）：' + noColor.join(' / '));

const data = items.map((i) => ({
  idx: i.idx, name: i.name, cat: i.cat, tier: i.tier, src: i.src, note: i.note,
  lat: i.lat, lng: i.lng, rating: i.rating, reviews: i.reviews, price: i.price,
  address: i.address, signature: i.signature, amapMarker: i.amapMarker, amapNav: i.amapNav,
}));

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#e74c3c">
<title>徐州美食打卡地图</title>
<style>${leafletCss}</style>
<style>
  *{-webkit-tap-highlight-color:transparent}
  html,body{margin:0;height:100%;overflow:hidden;font-family:"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f5}
  #top{position:absolute;top:0;left:0;right:0;height:50px;z-index:900;background:#fff;display:flex;align-items:center;padding:0 12px;box-shadow:0 1px 6px rgba(0,0,0,.12)}
  #top b{font-size:16px}
  #top span{font-size:12px;color:#999;margin-left:8px}
  #chips{position:absolute;top:50px;left:0;right:0;height:42px;z-index:900;background:rgba(255,255,255,.96);display:flex;align-items:center;gap:7px;padding:0 10px;overflow-x:auto;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.06)}
  .chip{flex:none;font-size:13px;padding:5px 11px;border-radius:14px;border:1px solid #ccc;color:#666;background:#fff}
  .chip.on{color:#fff;border-color:transparent}
  #map{position:absolute;top:92px;left:0;right:0;bottom:0;z-index:1}
  .pin{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);color:#fff;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)}
  .pin span{transform:rotate(45deg)}
  #sheet{position:absolute;left:0;right:0;bottom:0;height:46px;z-index:950;background:#fff;border-radius:16px 16px 0 0;box-shadow:0 -2px 14px rgba(0,0,0,.18);transition:height .25s ease;overflow:hidden}
  #sheet.open{height:66%}
  #handle{height:46px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;color:#666}
  #handle::before{content:'';position:absolute;top:7px;width:38px;height:4px;border-radius:2px;background:#ddd;left:50%;margin-left:-19px}
  #cards{height:calc(100% - 46px);overflow-y:auto;padding:0 10px 18px;-webkit-overflow-scrolling:touch}
  .gtitle{font-size:12px;font-weight:700;padding:8px 2px 6px}
  .card{border:1px solid #eee;border-radius:11px;padding:10px 11px;margin-bottom:8px;background:#fff}
  .card h3{margin:0 0 5px;font-size:15px;font-weight:600;display:flex;align-items:flex-start;gap:7px;line-height:1.35}
  .badge{flex:none;min-width:20px;height:20px;line-height:20px;border-radius:50%;color:#fff;font-size:12px;text-align:center;margin-top:1px}
  .m{font-size:12.5px;color:#777;line-height:1.55}
  .note{font-size:12.5px;color:#b06a00;line-height:1.5;margin-top:4px}
  .btns{margin-top:9px;display:flex;gap:8px}
  .btns a{flex:1;text-align:center;padding:9px 0;border-radius:9px;font-size:13.5px;text-decoration:none;font-weight:600}
  .btns a.nav{background:#0a7d32;color:#fff}
  .btns a.open{background:#eef7f0;color:#0a7d32;border:1px solid #cfe6d5}
  .leaflet-popup-content{margin:12px 14px;font-size:13px;line-height:1.6}
  .leaflet-popup-content b{font-size:14.5px}
  .leaflet-popup-content .pb{margin-top:8px;display:flex;gap:8px}
  .leaflet-popup-content .pb a{flex:1;text-align:center;padding:8px 0;border-radius:8px;font-size:13px;text-decoration:none;font-weight:600;background:#0a7d32;color:#fff}
  .leaflet-popup-content .pb a.o{background:#eef7f0;color:#0a7d32;border:1px solid #cfe6d5}
</style>
</head>
<body>
<div id="top"><b>徐州美食打卡地图</b><span>${data.length} 家 · 来自 2 条抖音</span></div>
<div id="chips"></div>
<div id="map"></div>
<div id="sheet"><div id="handle">▲ 展开店铺清单（${data.length} 家）</div><div id="cards"></div></div>
<script>${leafletJs}</script>
<script>
const items = ${JSON.stringify(data)};
const colors = ${JSON.stringify(Object.fromEntries(cats.map((c) => [c, catColor[c] || '#555'])))};
const cats = ${JSON.stringify(cats)};

// 初始中心直接从数据算，绝不写死城市坐标（写死过一次→打开停在上一个城市，被用户骂）
const _la = items.map((i) => i.lat), _lo = items.map((i) => i.lng);
const _c = items.length ? [(Math.min(..._la) + Math.max(..._la)) / 2, (Math.min(..._lo) + Math.max(..._lo)) / 2] : [34.5, 118.0];
const map = L.map('map', {zoomControl:true, attributionControl:false}).setView(_c, 9);
L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {subdomains:['1','2','3','4'], maxZoom:18}).addTo(map);

const layers = {};
const markers = {};
items.forEach(function(it){
  const c = colors[it.cat] || '#555';
  if(!layers[it.cat]) layers[it.cat] = L.layerGroup().addTo(map);
  const icon = L.divIcon({className:'', html:'<div class="pin" style="background:'+c+'"><span>'+it.idx+'</span></div>', iconSize:[28,28], iconAnchor:[14,28], popupAnchor:[0,-26]});
  const m = L.marker([it.lat, it.lng], {icon:icon}).addTo(layers[it.cat]);
  m.bindPopup('<b>'+it.name+'</b><br>'+it.cat+' ｜ '+(it.rating||'-')+'分 ｜ '+(it.reviews||'-')+'评'+(it.price?' ｜ 人均'+it.price:'')
    +'<br>'+(it.address||'')
    +(it.signature?'<br>招牌：'+it.signature:'')
    +'<div style="color:#b06a00;font-size:12px">'+it.note+'</div>'
    +'<div class="pb"><a href="'+it.amapNav+'" target="_blank">导航</a><a class="o" href="'+it.amapMarker+'" target="_blank">在高德打开</a></div>');
  markers[it.idx] = m;
});

// 打开就自动框住所有店（不用自己拖过去找）
if(items.length){
  const pts = items.map(function(i){ return [i.lat, i.lng]; });
  map.fitBounds(L.latLngBounds(pts), {padding:[48, 48]});
  if(map.getZoom() > 13) map.setZoom(13);
  if(map.getZoom() < 8) map.setZoom(8);
}

// 品类筛选
const chips = document.getElementById('chips');
const active = new Set(cats);
function renderChips(){
  chips.innerHTML = '';
  const all = document.createElement('div');
  all.className = 'chip' + (active.size === cats.length ? ' on' : '');
  all.style.background = active.size === cats.length ? '#333' : '#fff';
  all.textContent = '全部';
  all.onclick = function(){ if(active.size === cats.length){ active.clear(); } else { cats.forEach(function(c){active.add(c);}); } apply(); };
  chips.appendChild(all);
  cats.forEach(function(c){
    const d = document.createElement('div');
    const on = active.has(c);
    d.className = 'chip' + (on ? ' on' : '');
    if(on) d.style.background = colors[c];
    d.textContent = c + ' ' + items.filter(function(x){return x.cat===c;}).length;
    d.onclick = function(){ if(active.has(c)) active.delete(c); else active.add(c); apply(); };
    chips.appendChild(d);
  });
}
function apply(){
  items.forEach(function(it){
    if(active.has(it.cat)){ if(!map.hasLayer(layers[it.cat])) layers[it.cat].addTo(map); }
    else if(map.hasLayer(layers[it.cat])) map.removeLayer(layers[it.cat]);
  });
  renderChips(); renderCards();
}

// 店铺清单
function renderCards(){
  const box = document.getElementById('cards');
  box.innerHTML = '';
  cats.filter(function(c){return active.has(c);}).forEach(function(c){
    const g = document.createElement('div');
    g.className = 'gtitle'; g.style.color = colors[c];
    g.textContent = c;
    box.appendChild(g);
    items.filter(function(x){return x.cat===c;}).forEach(function(it){
      const d = document.createElement('div');
      d.className = 'card';
      d.innerHTML = '<h3><span class="badge" style="background:'+colors[c]+'">'+it.idx+'</span><span>'+it.name+(it.tier==='alt'?' <span style="font-size:11px;color:#999">备选</span>':'')+'</span></h3>'
        +'<div class="m">'+(it.rating||'-')+'分 ｜ '+(it.reviews||'-')+'评'+(it.price?' ｜ 人均'+it.price:'')+'</div>'
        +'<div class="m">'+(it.address||'')+'</div>'
        +'<div class="note">'+it.note+'</div>'
        +'<div class="btns"><a class="nav" href="'+it.amapNav+'" target="_blank">导航过去</a><a class="open" href="'+it.amapMarker+'" target="_blank">在高德打开</a></div>';
      // 点卡片 → 地图飞到这家店并弹窗（点"导航过去"之类的链接则不飞）
      d.onclick = function(e){
        if(e.target.closest('a')) return;
        const m = markers[it.idx];
        if(!m) return;
        map.setView(m.getLatLng(), 16, {animate:true});
        m.openPopup();
        sheet.classList.remove('open');
        // 弹窗的 autoPan 会把标记顶出屏幕（底部被把手挡住），所以收尾再校一次，
        // 保证标记落在「顶部标题栏 ~ 底部把手」之间的安全区里
        setTimeout(function(){
          const pt = map.latLngToContainerPoint(m.getLatLng());
          const sz = map.getSize();
          const safeTop = 96, safeBottom = sz.y - 150;
          if(pt.y < safeTop || pt.y > safeBottom){
            map.panBy([0, pt.y - (safeTop + safeBottom) / 2], {animate:true});
          }
        }, 340);
      };
      box.appendChild(d);
    });
  });
  document.getElementById('handle').textContent = '▲ 收起 / 展开店铺清单（' + items.filter(function(x){return active.has(x.cat);}).length + ' 家）';
}

// 展开/收起
const sheet = document.getElementById('sheet');
document.getElementById('handle').onclick = function(){ sheet.classList.toggle('open'); };

// 点标记时把清单收起，避免挡住地图
map.on('popupopen', function(){ sheet.classList.remove('open'); });

// 允许点地图空白处收起清单
map.on('click', function(){ sheet.classList.remove('open'); });

renderChips(); renderCards();
</script>
</body>
</html>`;
fs.writeFileSync(path.join(dir, '徐州美食手机版.html'), html, 'utf8');
console.log('mobile html written, ' + Math.round(html.length / 1024) + ' KB, items=' + data.length);
