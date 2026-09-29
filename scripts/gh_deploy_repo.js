// 通用：用 GitHub API 建仓库 + 递归提交目录里的所有文件（可以顺带开 Pages）
// 不需要 git、不需要 gh。
//
// 用法: node gh_deploy_repo.js <repo> <srcDir> "<description>" [--no-pages]
//
// 凭据：环境变量 GITHUB_TOKEN，或工具目录里的 github_token.txt（scope 只要 repo）
// 安全：自动跳过 .git / node_modules / 密钥类文件，并会打印被跳过的清单
const fs = require('fs');
const path = require('path');
const { readSecret } = require('./_env.js');

const REPO = process.argv[2];
const SRC = process.argv[3];
const DESC = process.argv[4] || '';
const NO_PAGES = process.argv.includes('--no-pages');
if (!REPO || !SRC) { console.error('用法: node gh_deploy_repo.js <repo> <srcDir> "<description>" [--no-pages]'); process.exit(2); }

const TOKEN = readSecret('GITHUB_TOKEN', 'github_token.txt',
  'GitHub token 生成：https://github.com/settings/tokens → Fine-grained 或 classic，勾 repo 权限。');
const API = 'https://api.github.com';
const H = {
  Authorization: 'Bearer ' + TOKEN,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'gh-deploy',
};

const SKIP_DIRS = new Set(['.git', 'node_modules', '__pycache__', '.idea', '.vscode']);
const SECRET_RE = /(^|[\\/])(amap_key\.txt|github_token\.txt|token\.txt|\.env[^\\/]*|.*\.(pem|key|p12))$/i;

async function req(method, url, body) {
  const r = await fetch(API + url, { method, headers: body ? { ...H, 'Content-Type': 'application/json' } : H, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch { }
  return { status: r.status, json, text };
}

function walk(dir, base = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? base + '/' + e.name : e.name;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) { console.log('  跳过目录', rel); continue; }
      out.push(...walk(abs, rel));
    } else if (SECRET_RE.test(rel)) {
      console.log('  ⚠ 跳过疑似密钥文件', rel);
    } else {
      out.push({ rel, abs });
    }
  }
  return out;
}

(async () => {
  const me = await req('GET', '/user');
  if (me.status !== 200) { console.log('AUTH FAIL', me.status, me.text.slice(0, 200)); process.exit(1); }
  const user = me.json.login;
  console.log('账号:', user);

  const c = await req('POST', '/user/repos', { name: REPO, description: DESC, private: false, auto_init: true, has_issues: false, has_wiki: false });
  console.log('repo:', c.status, c.status === 201 ? 'CREATED' : c.status === 422 ? 'EXISTS' : c.text.slice(0, 200));
  await new Promise((s) => setTimeout(s, 2500));

  const rp = `/repos/${user}/${REPO}`;
  const files = walk(SRC);
  console.log('待上传 ' + files.length + ' 个文件');
  let ok = 0, fail = 0;
  for (const f of files) {
    const b64 = fs.readFileSync(f.abs).toString('base64');
    const body = { message: 'update ' + f.rel, content: b64, branch: 'main' };
    const cur = await req('GET', `${rp}/contents/${encodeURIComponent(f.rel)}?ref=main`);
    if (cur.status === 200 && cur.json && cur.json.sha) body.sha = cur.json.sha;
    const up = await req('PUT', `${rp}/contents/${encodeURIComponent(f.rel)}`, body);
    if (up.status < 300) { ok++; console.log('  ✓', f.rel.padEnd(40), (up.json.commit && up.json.commit.sha || '').slice(0, 7)); }
    else { fail++; console.log('  ✗', f.rel.padEnd(40), up.status, up.text.slice(0, 140)); }
  }
  console.log(`上传完成：${ok} 成功 / ${fail} 失败`);

  if (!NO_PAGES) {
    const pagesBody = { source: { branch: 'main', path: '/' }, build_type: 'legacy' };
    let pg = await req('POST', `${rp}/pages`, pagesBody);
    if (pg.status === 409) pg = await req('PUT', `${rp}/pages`, pagesBody);
    console.log('pages:', pg.status, pg.status < 300 ? 'OK（约 30~60 秒后生效）' : pg.text.slice(0, 200));
    console.log('>>> https://' + user.toLowerCase() + '.github.io/' + REPO + '/');
  }
  console.log('>>> https://github.com/' + user + '/' + REPO);
  if (fail) process.exit(1);
})();
