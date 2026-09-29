const fs = require('fs');
const { load } = require('./_env.js');
const QRCode = load('qrcode');
const { chromium } = load('playwright');

// 生成二维码海报 PNG
// 用法: node qr_poster.js <url> "<N 家店>" <输出.png>
if (!process.argv[2] || !process.argv[4]) { console.error('用法: node qr_poster.js <url> "<N 家店>" <输出.png>'); process.exit(2); }
const url = process.argv[2];
const count = process.argv[3] || '';
const out = process.argv[4];

(async () => {
  const dataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M', margin: 1, width: 900,
    color: { dark: '#111111', light: '#ffffff' },
  });

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:900px;font-family:"Microsoft YaHei",sans-serif;background:#fff;padding:44px 40px 40px;text-align:center}
  h1{font-size:42px;color:#1a1a1a;letter-spacing:2px}
  .sub{margin-top:12px;font-size:20px;color:#888}
  .qr{margin:28px auto 22px;width:620px;height:620px;padding:16px;border:3px solid #eee;border-radius:24px;background:#fff}
  .qr img{width:100%;height:100%;display:block;image-rendering:pixelated}
  .tip{font-size:22px;color:#c0392b;font-weight:bold;line-height:1.5}
  .url{margin-top:14px;font-size:15px;color:#999;word-break:break-all;font-family:Consolas,monospace}
  </style></head><body>
  <h1>连云港美食打卡地图</h1>
  <div class="sub">${count} 家店 · 本地人爱去的 · 来自抖音探店视频 + 评论区整理</div>
  <div class="qr"><img src="${dataUrl}"></div>
  <div class="tip">手机扫码打开<br>永久有效，微信里也能直接打开</div>
  <div class="url">${url}</div>
  </body></html>`;

  fs.writeFileSync('_qr_poster_lyg.html', html, 'utf8');
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 });
  await p.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/_qr_poster_lyg.html');
  await p.waitForTimeout(400);
  await p.screenshot({ path: out, fullPage: true });
  await b.close();
  console.log('OK ->', out, fs.statSync(out).size, 'bytes');
})();
