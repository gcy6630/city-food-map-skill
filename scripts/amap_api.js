// 高德「官方 Web 服务 API」抓取器（需要 amap_key.txt，服务平台必须是 Web服务）
// 相比 amap_lyg.js（蹭网页版接口）的优点：不受 IP 级 419 封禁，只要控制 QPS 就能一直跑。
// 缺点：v3 接口不返回"评价条数"，只有 rating（评分）和 cost（人均）。
//
// 用法: node amap_api.js <queries.json> <out.json> [cityCode=320700]
//   CITY 城市 adcode：徐州 320300 / 连云港 320700
//   GAP  每个请求间隔毫秒（默认 1400；高德 QPS 限制很紧，调小必吃 CUQPS_HAS_EXCEEDED_THE_LIMIT）
const fs = require('fs');
const path = require('path');
const { readSecret, readJSON } = require('./_env.js');

const KEY = readSecret('AMAP_KEY', 'amap_key.txt',
  '高德 key 免费申请：https://lbs.amap.com/ → 控制台 → 应用管理 → 创建应用 → 添加 Key → 服务平台必须选「Web服务」。');
const IN = path.resolve(process.argv[2] || 'queries.json');
const OUT = path.resolve(process.argv[3] || 'amap_api.json');
const CITY = process.argv[4] || '320700';
const GAP = Number(process.env.GAP || 1400);

const kws = readJSON(IN);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const out = [];
  let ok = 0, fail = 0;
  const t0 = Date.now();
  for (let i = 0; i < kws.length; i++) {
    const kw = kws[i];
    const u = 'https://restapi.amap.com/v3/place/text?key=' + KEY
      + '&keywords=' + encodeURIComponent(kw)
      + '&city=' + CITY + '&citylimit=true&offset=25&page=1&extensions=all';
    let j = null;
    try { j = await (await fetch(u, { signal: AbortSignal.timeout(20000) })).json(); }
    catch (e) { j = { status: '0', info: 'FETCH_' + e.message, pois: [] }; }

    if (j.status !== '1') {
      fail++;
      console.log(`[${i + 1}/${kws.length}] ${kw}  ✗ ${j.info} / ${j.infocode || ''}`);
      out.push({ keyword: kw, status: '0', via: 'api', info: j.info, infocode: j.infocode || '', count: 0, pois: [] });
    } else {
      ok++;
      const pois = (j.pois || []).map((p) => {
        const [lng, lat] = String(p.location || '').split(',').map(Number);
        const be = p.biz_ext || {};
        return {
          name: p.name, lng, lat,
          address: typeof p.address === 'string' ? p.address : '',
          category: p.type || '',
          rating: be.rating || '',
          reviews: Number(p.favorite_num) || 0,   // v3 一般不返回，占位
          avgPrice: be.cost || '',
          signature: '',
          opentime: be.opentime2 || '',
          tel: typeof p.tel === 'string' ? p.tel : '',
          adname: p.adname || '',
          poiid: p.id || '',
        };
      }).filter((p) => p.lng && p.lat);
      console.log(`[${i + 1}/${kws.length}] ${kw}  ✓ ${pois.length}`);
      out.push({ keyword: kw, status: '1', via: 'api', count: j.count, pois });
    }
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');
    if (i < kws.length - 1) await sleep(GAP);
  }
  console.log(`\n完成：${ok} 成功 / ${fail} 失败，耗时 ${((Date.now() - t0) / 1000).toFixed(0)} 秒 → ${OUT}`);
})();
