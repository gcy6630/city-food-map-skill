// 高德 POI 搜索 v7：冷却后再跑剩余关键词；poiInfo 失败时退化到 autocomplete 联想接口
const { load, readJSON, TOOLS } = require('./_env.js');
const { chromium } = load('playwright');
const fs = require('fs');
const path = require('path');

// 浏览器 profile（登录态）放工具目录，不要放技能目录
const dir = TOOLS || process.cwd();
// 城市 adcode：徐州 320300 / 连云港 320700 / … （也可用第 4 个参数传）
const CITY = process.argv[4] || '320700';
const profile = path.join(dir, 'amap_profile');

const stripTags = (s) => String(s || '').replace(/<[^>]*>/g, '').trim();
const dval = (p, n) => { const d = (p.domain_list || []).find((x) => x.name === n); return d ? stripTags(d.value) : ''; };
const normalize = (p) => ({
  name: p.name || '', poiid: p.id || '', address: p.address || p.address_name || '', tel: p.tel || '',
  lng: String(p.longitude || p.lng || (p.location ? String(p.location).split(',')[0] : '')),
  lat: String(p.latitude || p.lat || (p.location ? String(p.location).split(',')[1] : '')),
  rating: p.rating || '', reviews: p.review_total || '', avgPrice: dval(p, 'price'),
  signature: dval(p, 'deepinfo'), category: dval(p, 'tag'),
});

function poiUrl(kw) {
  const p = new URLSearchParams({
    query_type: 'TQUERY', pagesize: '25', pagenum: '1', qii: 'true', cluster_state: '5', need_utd: 'true',
    utd_sceneid: '1000', div: 'PC1000', addr_poi_merge: 'true', is_classify: 'true', zoom: '11', city: CITY, keywords: kw,
  });
  return '/service/poiInfo?' + p.toString();
}
function autoUrl(kw) {
  const p = new URLSearchParams({
    query: kw, city: CITY, datatype: 'all', utd_sceneid: '1000', div: 'PC1000', cityId: CITY, need_utd: 'true',
  });
  return '/service/autocomplete?' + p.toString();
}

(async () => {
  const queries = readJSON(path.resolve(process.argv[2] || path.join(dir, 'queries_rest.json')));
  const outFile = path.resolve(process.argv[3] || path.join(dir, 'amap_rest.json'));
  const warm = parseInt(process.argv[4] || '150', 10);

  const ctx = await chromium.launchPersistentContext(profile, {
    headless: false, viewport: null, locale: 'zh-CN',
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto('https://www.amap.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });

  const probe = async (u) => page.evaluate(async (x) => {
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 25000);
      const r = await fetch(x, { credentials: 'include', signal: c.signal });
      const text = (await r.text()).slice(0, 400000);
      clearTimeout(t);
      return { status: r.status, text };
    }
    catch (e) { return { status: 0, text: '' }; }
  }, u);

  console.log('冷却 ' + warm + ' 秒...');
  await page.waitForTimeout(warm * 1000);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(4000);

  const report = [];
  for (const kw of queries) {
    let pois = []; let status = 0; let via = '';
    for (let a = 1; a <= 3 && !pois.length; a++) {
      let res = await probe(poiUrl(kw));
      if (res.status === 200) {
        via = 'poiInfo';
        try { const j = JSON.parse(res.text); pois = ((j.data && (j.data.poi_list || j.data.pois)) || []).map(normalize).filter((p) => p.name && p.lng && p.lat); } catch (e) {}
        status = 200;
        break;
      }
      status = res.status;
      console.log('  ' + kw + ' poiInfo -> ' + res.status + ' (attempt ' + a + ')');
      // 退化到联想接口
      const res2 = await probe(autoUrl(kw));
      if (res2.status === 200) {
        try {
          const j2 = JSON.parse(res2.text);
          const list = (j2.data && (j2.data.tips || j2.data.list || j2.data.poi_list)) || [];
          const cand = list.map(normalize).filter((p) => p.name && p.lng && p.lat);
          if (cand.length) { pois = cand; via = 'autocomplete'; status = 200; break; }
        } catch (e) {}
      }
      await page.waitForTimeout(12000);
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(3000);
    }
    report.push({ keyword: kw, status, via, count: pois.length, pois: pois.slice(0, 8) });
    console.log('[' + kw + '] status=' + status + ' via=' + via + ' pois=' + pois.length);
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');
    await page.waitForTimeout(2500);
  }
  console.log('-> ' + outFile);
  await ctx.close();
})().catch((e) => { console.error('FATAL: ' + e.message); process.exit(1); });
