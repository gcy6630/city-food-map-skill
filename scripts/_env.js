// 技能脚本不自己装依赖，统一复用「工具目录」里的 node_modules
//
// 工具目录 = 一个有 node_modules（含 playwright / qrcode / jsqr / pngjs）的文件夹。
// 查找顺序：环境变量 FOODMAP_TOOLS → 当前目录及向上 4 层 → 技能目录的上两级 → 老路径
//
// 用法: const { load, readSecret, findFile, TOOLS } = require('./_env.js');
//       const { chromium } = load('playwright');
const fs = require('fs');
const path = require('path');

function hasDeps(d) {
  try { return !!d && fs.existsSync(path.join(d, 'node_modules')); } catch (e) { return false; }
}

const CANDIDATES = [process.env.FOODMAP_TOOLS, process.cwd()];
let up = process.cwd();
for (let i = 0; i < 4; i++) { up = path.dirname(up); CANDIDATES.push(up); }
CANDIDATES.push(path.join(__dirname, '..', '..'));
CANDIDATES.push('C:\\Users\\30909\\tools\\dy');

const ROOTS = [...new Set(CANDIDATES.filter(hasDeps))];
const TOOLS = ROOTS[0] || null;

function load(name) {
  for (const r of ROOTS) {
    try { return require(path.join(r, 'node_modules', name)); } catch (e) { /* 下一个 */ }
  }
  try { return require(name); } catch (e) { }
  console.error('[city-food-map] 找不到模块：' + name);
  console.error('  找一个装了依赖的目录，然后二选一：');
  console.error('    a) 设环境变量 FOODMAP_TOOLS=<那个目录>     （里面要有 node_modules）');
  console.error('    b) 直接在项目目录里 npm i playwright qrcode jsqr pngjs');
  console.error('  已找过的目录：' + (CANDIDATES.join(' , ') || '（无）'));
  process.exit(3);
}

function findFile(name) {
  const dirs = [process.env.FOODMAP_HOME, ...ROOTS, __dirname, path.join(__dirname, '..'), process.cwd()];
  for (const d of dirs) {
    if (!d) continue;
    const p = path.join(d, name);
    try { if (fs.existsSync(p)) return p; } catch (e) { }
  }
  return null;
}

// 取密钥：优先环境变量，其次工具目录/技能目录里的文件（这样文件不会被提交到仓库）
function readSecret(envName, fileName, hint) {
  if (process.env[envName]) return process.env[envName].trim();
  const p = findFile(fileName);
  if (!p) {
    console.error('[city-food-map] 找不到 ' + fileName);
    console.error('  两种给法：');
    console.error('    a) 把密钥写进 ' + (TOOLS || '<工具目录>') + '\\' + fileName);
    console.error('    b) 设环境变量 ' + envName + '=<密钥>');
    if (hint) console.error('  ' + hint);
    process.exit(3);
  }
  return fs.readFileSync(p, 'utf8').trim();
}

// 读 JSON 时自动去掉 UTF-8 BOM
// —— Windows 上 PowerShell 的 Set-Content -Encoding UTF8 / Out-File 默认都会写 BOM，
//    带 BOM 的文件 JSON.parse 直接 FATAL，这个坑踩过不止一次
function readJSON(p) {
  let t = fs.readFileSync(p, 'utf8');
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  t = t.replace(/^\uFEFF/, '');
  return JSON.parse(t);
}

module.exports = { load, readSecret, findFile, readJSON, ROOTS, TOOLS, CANDIDATES };
