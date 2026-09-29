// 轮询 GitHub Pages 是否上线，并同时验证「微信 iOS / 微信安卓 / Safari」三个 UA 都能打开
// 用法: node wait_pages.js <url> [关键词]
//   ！这一步是必需的：*.github.io 在微信内置浏览器能打开（200），litterbox 之类会被 WAF 403
const URL_ = process.argv[2];
const KEY = process.argv[3] || '';
if (!URL_) { console.error('用法: node wait_pages.js <url> [必须出现的关键词]'); process.exit(2); }

const UAS = [
  ['wx-ios', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49(0x18003133) NetType/WIFI Language/zh_CN'],
  ['safari', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'],
  ['wx-android', 'Mozilla/5.0 (Linux; Android 13; SM-S918B Build/TP1A.220624.014) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 MMWEBID/1234 MicroMessenger/8.0.49.2600(0x2800313D) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64'],
];

(async () => {
  for (let i = 0; i < 40; i++) {
    let done = false;
    for (const [name, ua] of UAS) {
      try {
        const r = await fetch(URL_, { headers: { 'User-Agent': ua } });
        const t = await r.text();
        const ok = !KEY || t.includes(KEY);
        console.log(`try${i} ${name} ${r.status} len=${t.length} key=${t.includes(KEY)}`);
        if (name === 'safari' && ok) done = true;
      } catch (e) { console.log(`try${i} ${name} ERR ${(e.cause && e.cause.code) || e.message}`); }
    }
    if (done) { console.log('LIVE ✓'); process.exit(0); }
    await new Promise((s) => setTimeout(s, 15000));
  }
  console.log('超时，Pages 还没构建好或没传上去');
  process.exit(1);
})();
