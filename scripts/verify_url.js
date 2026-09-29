// 用真浏览器访问公网地址做校验（手机视口）
const { chromium, devices } = require('./_env.js').load('playwright');

const url = process.argv[2];
if (!url) { console.error('usage: node verify_url.js <url>'); process.exit(1); }

(async () => {
  const errors = [];
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext(Object.assign({}, devices['iPhone 13'], { locale: 'zh-CN' }));
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 160)));
  page.on('requestfailed', (r) => errors.push('REQFAIL: ' + r.url().slice(0, 90) + ' :: ' + (r.failure() && r.failure().errorText)));

  const resp = await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(9000);

  const info = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img.leaflet-tile')];
    return {
      title: document.title,
      markers: document.querySelectorAll('.leaflet-marker-icon').length,
      chips: document.querySelectorAll('.chip').length,
      cards: document.querySelectorAll('.card').length,
      tiles: imgs.length,
      tilesLoaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
      hasLeaflet: typeof L !== 'undefined',
    };
  });

  await page.click('#handle');
  await page.waitForTimeout(1000);
  const sheetOpen = await page.evaluate(() => document.getElementById('sheet').classList.contains('open'));
  const nav = await page.evaluate(() => { const a = document.querySelector('.card .btns a.nav'); return a ? a.getAttribute('href') : null; });

  console.log(JSON.stringify({ httpStatus: resp.status(), info, sheetOpen, navSample: nav && nav.slice(0, 70) }, null, 2));
  console.log('ERRORS: ' + (errors.length ? JSON.stringify(errors, null, 1) : 'none'));
  await browser.close();
})().catch((e) => { console.error('FATAL: ' + e.message); process.exit(1); });
