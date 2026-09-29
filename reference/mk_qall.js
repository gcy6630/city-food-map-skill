const fs = require('fs');
const t = fs.readFileSync('_lyg_head.js', 'utf8');
const kws = [...t.matchAll(/kw:\s*'([^']+)'/g)].map((m) => m[1]);
const uniq = [...new Set(kws)];
fs.writeFileSync('queries_lyg_all.json', JSON.stringify(uniq, null, 1), 'utf8');
console.log('picks =', kws.length, ' unique keywords =', uniq.length);
console.log(uniq.join(' / '));
