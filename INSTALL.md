# 安装 city-food-map

一个"城市美食打卡地图"技能：**抖音挖店 → 高德定位 → 手机版地图 → GitHub Pages 永久托管 → 二维码**。

---

## 1. 环境要求

| | |
|---|---|
| Node.js | 18 以上（脚本用了全局 `fetch`） |
| 依赖 | `npm i playwright qrcode jsqr pngjs` 然后 `npx playwright install chromium` |
| 可选 | 高德 key（批量定位用）、GitHub token（部署到 Pages 用） |

## 2. 装到 AionUi（推荐）

AionUi 的技能目录：
```
<AionUi 数据目录>\skills\users\<你的用户ID>\<技能名>\
```
Windows 上一般是
`C:\Users\<你>\AppData\Roaming\AionUi\aionui\skills\users\<用户ID>\`

把整个 `city-food-map` 文件夹丢进去，然后**必须注册**（只放文件是不会出现在列表里的）：

```powershell
$AIONUI_HELPER_BIN = "C:\...\resources\bundled-aioncore\win32-x64\aioncore.exe"
'{"skill_path":"C:\\Users\\<你>\\...\\skills\\users\\<用户ID>\\city-food-map"}' | & $AIONUI_HELPER_BIN config skills import
```

> stdin 里的 JSON，Windows 反斜杠要**转义成 `\\`**。
> 注册成功后 `config skills list` 里会出现 `city-food-map [custom]`。
> **新导入的技能不会热注入当前对话**——开一个新对话才用得上。

## 3. 装到别的 agent / 纯手工用

这个技能**不依赖 AionUi**，就是一堆普通脚本 + 一份说明：

```powershell
cd <放技能的地方>
node scripts\amap_api.js queries.json out.json 320700      # 高德批量查店
node scripts\city_lint.js xxx.html --city 杭州 --forbid "徐州,把子肉" --items items.json
node scripts\verify_mobile.js xxx.html 46
node scripts\gh_deploy_repo.js "hangzhou-food-map" .\dist "杭州美食打卡地图"
node scripts\qr_poster.js "https://<user>.github.io/hangzhou-food-map/" "46 家店" "二维码.png"
```

任何支持"读 SKILL.md 当提示词"的 agent（Claude Code / Cursor / ChatGPT 之类）都可以直接把 `SKILL.md` 喂进去。

## 4. 配密钥（都支持文件或环境变量，二选一）

| 密钥 | 文件 | 环境变量 | 怎么拿 |
|---|---|---|---|
| 高德 | `amap_key.txt` | `AMAP_KEY` | https://lbs.amap.com/ → 控制台 → 应用管理 → 创建应用 → 添加 Key → **服务平台选「Web服务」** |
| GitHub | `github_token.txt` | `GITHUB_TOKEN` | https://github.com/settings/tokens → classic token，勾 `repo` |

**文件放哪**：脚本会自动在「环境变量 → 当前目录往上 4 层 → 技能目录上两级」里找。
推荐统一放一个**工具目录**（一个含 `node_modules` 的文件夹），然后：

```powershell
$env:FOODMAP_TOOLS = "D:\my-tools"     # 脚本就知道去哪找 node_modules 和密钥了
```

> ⚠️ **别把密钥文件提交到仓库**。`gh_deploy_repo.js` 会自动跳过 `amap_key.txt` / `github_token.txt` / `.env` / `*.pem` / `*.key` 并打印跳过清单。

## 5. 装完自测

```powershell
node scripts\_env.js          # 应该报出找到的工具目录；报错就按提示设 FOODMAP_TOOLS
echo ["测试"] > q.json
node scripts\amap_api.js q.json t.json 320700    # 通了会打印 "1 成功 / 0 失败"
```

## 6. 目录结构

```
city-food-map/
├── SKILL.md            ← 完整流程 + 踩坑清单（先读这个）
├── INSTALL.md          ← 本文件
├── scripts/
│   ├── _env.js             依赖/密钥定位
│   ├── amap_api.js         高德官方 API 批量查 POI（推荐）
│   ├── amap_scrape.js      没 key 时的兜底（会被限流）
│   ├── city_lint.js        ★ 城市串味自检
│   ├── verify_mobile.js    ★ 真交互验收
│   ├── gh_deploy_repo.js   建仓 + 递归上传 + 开 Pages
│   ├── wait_pages.js       轮询上线 + 微信 UA 可达性
│   ├── verify_url.js       线上版本真浏览器校验
│   ├── qr_poster.js        生成二维码海报
│   └── decode_qr.js        解码核对二维码
├── assets/
│   ├── build_map.js        桌面版地图模板
│   ├── build_mobile.js     手机版地图模板
│   └── cat_colors.json     分类配色总表
└── reference/              连云港整套（抄改新城市最快）
    ├── _lyg_head.js           选店表 + 相关性过滤
    ├── make_lyg.js            生成桌面版 builder
    ├── make_lyg_mobile.js     生成手机版 builder
    ├── build_txt_lyg.js       生成手机速查 TXT
    └── mk_qall.js             从选店表抽出关键词清单
```

## 7. 直接用模板做一个新城市

```powershell
# 1) 抄 reference 里连云港那套，把 "lyg" 换成你的城市缩写
# 2) 改 SKILL.md「换城市必查的 4 处」：初始视野 / cat_colors.json / 点卡片飞地图 / 副标题文案
# 3) 两道闸门必须过
node scripts\city_lint.js <生成的html...> --city <城市> --forbid "<上个城市的词>" --items items_x.json
node scripts\verify_mobile.js <手机版html> <家数>
```

## License

MIT
