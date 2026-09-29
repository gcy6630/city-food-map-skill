const fs = require('fs');
const { load } = require('./_env.js');
const jsQR = load('jsqr');
const { PNG } = load('pngjs');

const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
const res = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
console.log('decoded:', res ? res.data : 'FAILED');
console.log('expected:', process.argv[3]);
if (res) console.log(res.data === process.argv[3] ? 'MATCH ✓' : 'MISMATCH ✗');
