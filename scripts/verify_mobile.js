const { load } = require('./_env.js');
// 手机版真交互验收（iPhone 13 视口）
// —— 只数 DOM 数量是抓不出 bug 的（连云港就是"标记/卡片数量全对、文案全错"溜过去的），必须真点
//
// 用法: node verify_mobile.js <手机版html> [期望条数]
//
// 断言：
//   · 标记数 == 卡片数 == 期望条数
//   · 分类配色齐全：没有透明标记、没有透明筛选按钮
//   · 瓦片全部加载完成
//   · 初始 zoom 合理（抓到过"打开停在上一个城市"）
//   · 点清单里的卡片 → 地图中心确实落到那家店的坐标 + 详情弹窗出现 + 清单自动收起
//   · 0 console error / 0 pageerror
const { chromium } = load('playwright');
const path = require('path');

const FILE = process.argv[2];
const EXPECT = process.argv[3] ? Number(process.argv[3]) : null;
if (!FILE) { console.error('用法: node verify_mobile.js <手机版html> [期望条数]'); process.exit(2); }

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49(0x18003133) NetType/WIFI Language/zh_CN';

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));

  await p.goto('file:///' + path.resolve(FILE).replace(/\\/g, '/'));
  await p.waitForTimeout(3500);

  const base = await p.evaluate(() => {
    const t = [...document.querySelectorAll('.leaflet-tile')];
    const pins = [...document.querySelectorAll('.pin')].map((e) => getComputedStyle(e).backgroundColor);
    const chips = [...document.querySelectorAll('.chip')].map((e) => getComputedStyle(e).backgroundColor);
    const c = map.getCenter();
    return {
      title: document.title,
      markers: document.querySelectorAll('.leaflet-marker-icon').length,
      cards: document.querySelectorAll('.card').length,
      groups: document.querySelectorAll('.gtitle').length,
      chips: document.querySelectorAll('.chip').length,
      tiles: t.length, tilesLoaded: t.filter((e) => e.complete && e.naturalWidth > 0).length,
      transparentPins: pins.filter((x) => x === 'rgba(0, 0, 0, 0)').length,
      transparentChips: chips.filter((x) => x === 'rgba(0, 0, 0, 0)').length,
      pinColors: new Set(pins).size,
      center: [+c.lat.toFixed(3), +c.lng.toFixed(3)], zoom: map.getZoom(),
    };
  });
  console.log(JSON.stringify(base, null, 1));

  const fails = [];
  if (EXPECT !== null && base.markers !== EXPECT) fails.push(`markers ${base.markers} != 期望 ${EXPECT}`);
  if (base.markers !== base.cards) fails.push(`markers ${base.markers} != cards ${base.cards}`);
  if (base.transparentPins) fails.push(`透明标记 ${base.transparentPins} 个（分类配色缺失，地图看着是空的）`);
  if (base.transparentChips) fails.push(`透明筛选按钮 ${base.transparentChips} 个（用户会说"没有分类"）`);
  if (base.tilesLoaded !== base.tiles) fails.push(`瓦片 ${base.tilesLoaded}/${base.tiles}`);
  if (base.zoom < 8 || base.zoom > 14) fails.push(`初始 zoom=${base.zoom} 不合理（可能视野没落到本城）`);

  await p.click('#handle');
  await p.waitForTimeout(600);
  let cards = await p.$$('.card');
  const picks = [...new Set([10, Math.floor(cards.length / 2), cards.length - 2])].filter((i) => i >= 0 && i < cards.length);
  for (const i of picks) {
    cards = await p.$$('.card');
    await cards[i].scrollIntoViewIfNeeded();
    await p.waitForTimeout(250);
    const want = await p.evaluate((n) => {
      const d = document.querySelectorAll('.card')[n];
      const idx = d.querySelector('.badge').textContent.trim();
      const ll = markers[idx].getLatLng();
      return { idx, name: d.querySelector('h3').innerText.trim().slice(0, 16), lat: +ll.lat.toFixed(4), lng: +ll.lng.toFixed(4) };
    }, i);
    await cards[i].click();
    await p.waitForTimeout(1500);
    const got = await p.evaluate((idx) => {
      const c = map.getCenter();
      const ll = markers[idx].getLatLng();
      const pt = map.latLngToContainerPoint(ll);
      const sz = map.getSize();
      return {
        lat: +c.lat.toFixed(4), lng: +c.lng.toFixed(4),
        popup: !!document.querySelector('.leaflet-popup'),
        sheetOpen: document.getElementById('sheet').classList.contains('open'),
        // 标记在屏幕上可见吗？弹窗 autoPan 会让中心稍微偏一点，所以看"标记有没有真的落在视野里"更准
        onScreen: pt.x >= 0 && pt.x <= sz.x && pt.y >= 0 && pt.y <= sz.y,
        offBy: Math.max(Math.abs(c.lat - ll.lat), Math.abs(c.lng - ll.lng)),
      };
    }, want.idx);
    const hit = got.onScreen && got.offBy < 0.03;
    console.log(`  点卡片[${i}] #${want.idx} ${want.name} → 中心 ${got.lat},${got.lng}（目标 ${want.lat},${want.lng} 偏差${got.offBy.toFixed(4)}°）标记可见=${got.onScreen} popup=${got.popup} sheetOpen=${got.sheetOpen} ${hit ? '✓' : '✗'}`);
    if (!hit) fails.push(`卡片[${i}] 点了没飞到那家店（用户原话："点进去不直接在标点位置 还要我移过去"）`);
    if (!got.popup) fails.push(`卡片[${i}] 没有弹出详情`);
    if (got.sheetOpen) fails.push(`卡片[${i}] 清单没自动收起（挡住地图）`);
    await p.evaluate(() => document.getElementById('sheet').classList.add('open'));
    await p.waitForTimeout(200);
  }

  const realErrs = errs.filter((e) => !/ERR_ABORTED|favicon/.test(e));
  console.log('ERRORS: ' + (realErrs.length ? realErrs.slice(0, 5).join(' | ') : 'none'));
  if (realErrs.length) fails.push(`console error ${realErrs.length} 条`);

  await b.close();
  if (fails.length) { console.log('\n❌ 不合格:\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('\n✅ 手机版验收通过');
})();
