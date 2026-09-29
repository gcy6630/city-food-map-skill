---
name: city-food-map
description: 做「城市美食打卡地图」——从抖音视频+评论区挖本地人爱去的店，用高德定位，生成手机版可点选地图、永久托管到 GitHub Pages 并生成二维码。当用户说"帮我做一份XX(城市)的美食地图/打卡地图"、"查一下抖音上本地人推荐"、"把这些店标到高德地图上发给我"、"再做一份XX的"、或提到徐州/连云港美食地图要增改时使用。
---

# 城市美食打卡地图

**一句话流程**：抖音挖店 → 高德定位 → 手机版地图 → 永久链接 + 二维码 → 把文件发给用户。

已交付过的城市：**徐州**（41 家）、**连云港**（46 家）。做新城市照抄这套即可，**唯一会出错的环节是"城市字段替换不干净"，所以最后有两道强制闸门，跳过 = 一定会被用户当场抓包。**

---

## 0. 环境准备（装完检查一遍）

| 事项 | 说明 |
|---|---|
| **工具目录** | 一个放着 `node_modules`（playwright / qrcode / jsqr / pngjs）的文件夹。脚本会**自动找**：环境变量 `FOODMAP_TOOLS` → 当前目录往上 4 层 → 技能目录上两级。找不到就报错并告诉你怎么办。 |
| **高德 key** | `amap_key.txt` 放工具目录里，或设环境变量 `AMAP_KEY`。免费申请：https://lbs.amap.com/ → 控制台 → 应用管理 → 创建应用 → 添加 Key → **服务平台必须选「Web服务」**（选成「Web端(JS API)」用不了） |
| **GitHub token** | `github_token.txt` 放工具目录里，或设环境变量 `GITHUB_TOKEN`。https://github.com/settings/tokens → 勾 `repo` 权限 |
| 依赖 | `npm i playwright qrcode jsqr pngjs` + `npx playwright install chromium` |

> ⚠️ **密钥文件绝不要放进技能目录或提交到仓库**。`gh_deploy_repo.js` 会自动跳过 `amap_key.txt` / `github_token.txt` / `.env` / `*.pem` / `*.key` 并打印跳过清单。

**中文编码坑**：PowerShell 里先 `[Console]::OutputEncoding=[Text.Encoding]::UTF8`；写文件一律 `New-Object System.Text.UTF8Encoding($false)`（**带 BOM 会让 JSON.parse 直接 FATAL**）；读大文件用 `[IO.File]::ReadAllText($p,[Text.Encoding]::UTF8)`。
**PowerShell 数组坑**：`@(@("a","b"))` 会被展平成 `@("a","b")`，用 `.Replace($pair[0],$pair[1])` 时会变成"把字符 'a' 替换成字符 'b'"，**把整个文件写烂**。多组替换一律写成 Node 脚本，别用 PowerShell。

---

## 1. 抖音挖店

评论区的价值 >> 视频本身——**店名几乎都是从评论里刨出来的**。

1. 搜 5~6 个关键词（参考：`XX美食 / XX本地人推荐 / XX必吃 / XX苍蝇馆子 / XX<当地特产>`），拦截 `aweme/v1/web/general/search` 的 JSON，存 `search_<kw>.json`。
2. 挑 10~16 条评论多的视频，抓评论（拦截 `comment/list|comment/reply`）。
3. 从评论里用正则 + `[位置]` 标记挖店名 → `_mined.txt`。
4. 用 `cand.json` 里挖出来的名字当高德查询关键词。

抖音细节与已知限制见 memory：`douyin-pipeline` / `douyin-content-access`。

---

## 2. 高德定位

### 首选：官方 API（有 key，不受限流）
```powershell
node scripts\amap_api.js <queries.json> <out.json> [cityCode]
# 徐州 320300 / 连云港 320700
```
- 实测 46 个关键词 **72 秒全成功**。
- ⚠️ **这个 key 的 QPS 极低**：连发 4 个就 `CUQPS_HAS_EXCEEDED_THE_LIMIT`。脚本里 `GAP=1400ms`，**别调小**。
- v3 返回 `biz_ext.rating`（评分）+ `biz_ext.cost`（人均），**但不返回"评价条数"**。

### 兜底：没 key 时蹭网页版接口
```powershell
node scripts\amap_scrape.js <queries.json> <out.json> <warm秒> [cityCode]
```
- **会被 IP 级 419 封禁**，约 10~23 个关键词就中招，冷却要 **25~40 分钟**。
- 跳过冷却没有意义：被封后所有请求返回空，等于白跑。
- 好处：能拿到**评价条数**（用来选同品牌里最火的那家分店）。
- 每个关键词跑完立刻写盘，**被 kill 也不丢进度**。

### ★ 模糊匹配必须过滤（否则一定会标错店）
```js
function lcsStr(a,b){let best='';for(let i=0;i<a.length;i++)for(let l=1;i+l<=a.length;l++){const s=a.substr(i,l);if(s.length>best.length&&b.includes(s))best=s;}return best;}
const GENERIC = ['凉皮','凉面','海鲜','烧烤','米线','煎饼','饭店','菜馆','火锅','鱼火锅','大酒店','酒楼','面馆','炒面','面食','小吃','美食','餐厅','酒店','私房菜','家常菜','大排档','特色','川菜','酸辣粉','麻辣烫','香肠','烧鸡','风鹅','熏鸡','豆腐卷','千层饼','凉粉','鸡蛋饼','菜煎饼','里脊肉','焖锅'];
function relevant(kw,name){const s=lcsStr(kw,name);const need=kw.length>=4?3:2;
  if(s.length<need)return false; if(GENERIC.includes(s))return false; return true;}
```
- **同一个 keyword 可能在数据文件里有多条记录**（先 419 空结果、后 200 成功）：建 `byKw` 时必须 `if(!pois.length) continue;`，让成功那条覆盖失败那条。
- 救不回来的就**老老实实丢掉**，别硬塞：跨市的（"王子大酒店"→绵阳）、0 评论的、"XX厂"这种不是店的。
- **评论里的店名 ≠ 高德店名**，用 `name:` 覆盖。已踩过的：
  | 评论里的叫法 | 高德上的名字 |
  |---|---|
  | 潘德鹏麻辣烫 | 潘德**朋**麻辣烫 |
  | 朝阳小周川菜馆 | 小周四川饭店(朝阳店) |
  | 猴嘴凉粉 | 小黄凉粉(融盛猴嘴生活广场店) |
  | 伟志凉皮凉面 | 伟志凉皮(大庆路小学店) |

---

## 3. 生成地图

`assets/build_map.js`（桌面版）和 `assets/build_mobile.js`（手机版）是**模板**，每个城市用一个 `make_<city>.js` 做字符串替换生成对应的 builder；`reference/` 里放着连云港那套（`_lyg_head.js` / `make_lyg.js` / `make_lyg_mobile.js` / `build_txt_lyg.js`）**直接抄改最快**。

生成物：
- `<城>美食打卡地图.html`（电脑版，带侧栏分组列表 + 点条目定位）
- `<城>美食手机版.html`（手机版，底部抽屉清单 + 筛选 chip + 点卡片飞过去）
- `<城>美食打卡清单.md`
- `items_<city>.json` ← **`idx` 必须从 1 开始**（`items.forEach((it,i)=>{it.idx=i+1})`），模板里 `markers[it.idx]` / 徽标数字都靠它
- `<城>美食-手机速查.txt`（`build_txt_lyg.js` 改，带高德导航深链）

### ★★ 换城市必查的 4 处（连云港就是漏了这些被用户骂）
用户原话：**"怎么点进去不直接在标点位置 还要我移过去 还没有给我分类 之前徐州的明明做挺好"**

| # | 位置 | 症状 | 现在怎么做的 |
|---|---|---|---|
| 1 | 手机版初始视野 | 打开停在**上一个城市**，一个标记都看不见 | 已改成 `fitBounds` 自动框住全部标记，**不再写死坐标** |
| 2 | 分类配色 | 配色表还是上个城市的 → `background:undefined` → **标记透明、筛选按钮白底白字**（用户会说"没有分类"） | 抽成公共文件 **`assets/cat_colors.json`**，`build_mobile.js` 读它并在缺色时 `console.error` 报出分类名 |
| 3 | 点列表飞地图 | 手机版 `.card` 原本**没有 click 事件** | 已加：飞过去 + 弹窗 + 清单收起 + **收尾校正保证标记落在安全区**（弹窗 autoPan 会把标记顶到屏幕外） |
| 4 | 页面文案 | 副标题/标题还写着上个城市的数据来源和品类 | `make_lyg.js` 里加了 `'sub'` 替换项；手机版还有 `.topbar` |

**加新分类时**：往 `assets/cat_colors.json` 加一行，并且桌面版的 `catColor`/`catShort`/`catOrder` 三处都要加，否则该分类没颜色或没短标签。

---

## 4. 两道强制闸门（跳过必出事）

### 闸门 A：`city_lint.js` —— 城市串味自检
```powershell
node scripts\city_lint.js <生成的html...> --city 连云港 --forbid "徐州,把子肉,夜市,林甫烟火圈" --items items_lyg.json
```
检查：城市名出现 / 禁用词不出现 / **没有 `background:undefined`** / `setView` 落在 items 包围盒内 / 每个分类都有配色。
> 写这个脚本的时候它当场就抓到一处残留的写死坐标——**它值这个钱**。

### 闸门 B：`verify_mobile.js` —— 真交互验收
```powershell
node scripts\verify_mobile.js <手机版html> <期望条数>
```
只数 DOM 数量是**抓不出**上面的 bug 的。这个脚本会真的点清单里的卡片，断言：标记落在视野里、弹窗弹出、清单收起、0 报错、分类配色齐全、瓦片全加载、初始 zoom 合理。

---

## 5. 永久托管 + 二维码

```powershell
# 1) 待发布目录：index.html（手机版改名）+ 清单.md。密钥文件会被自动跳过
node scripts\gh_deploy_repo.js "<repo名>" "<待发布目录>" "<描述>"            # 建仓 + 递归上传 + 开 Pages
node scripts\gh_deploy_repo.js "<repo名>" "<技能目录>" "<描述>" --no-pages    # 只想传个仓库、不开网页时
node scripts\wait_pages.js "https://<user>.github.io/<repo>/" "<页面标题关键字>"   # 轮询上线 + 微信三 UA 可达
node scripts\verify_url.js "https://<user>.github.io/<repo>/"                # iPhone 视口实测线上版
node scripts\qr_poster.js "<url>" "<N 家店>" "扫码打开<城>美食地图_永久.png"
node scripts\decode_qr.js "扫码打开<城>美食地图_永久.png" "<url>"              # 解回来核对确实是这个 URL
```
- **`*.github.io` 在微信内置浏览器是 200**（litterbox 之类会被 WAF 403），这是选它的核心理由。
- `gh_deploy_repo.js` **偶发静默漏传**（网络抖动时 `index.html` 没更新，线上还是旧版）→ **必须**用 `verify_url.js` 数 markers 确认，不能只看 "LIVE"。
- 工作目录里的脚本是 `QRCode`+`Playwright` 生成的；技能里的 `scripts/` 通过 `_env.js` 复用工具目录的 `node_modules`（见 `INSTALL.md`），不用另装依赖。

---

## 6. 交付给用户

用 `weixin-file-send` 的协议，**追加在回复最末尾**：
```
[AIONUI_CHANNEL_SEND]
{"type":"image","path":"./扫码打开连云港美食地图_永久.png","caption":"扫码打开连云港美食地图"}
[/AIONUI_CHANNEL_SEND]

[AIONUI_CHANNEL_SEND]
{"type":"file","path":"./连云港美食-手机速查.txt","fileName":"连云港美食-手机速查.txt","caption":"..."}
[/AIONUI_CHANNEL_SEND]
```
- `path` 用**工作区相对路径**（先把文件拷进会话工作目录）。
- 同时把成品拷一份到用户桌面（Windows 上是 `%USERPROFILE%\Desktop`）。
- 回复里给永久链接时附一个 **`?v=2`** 变体：微信缓存很凶，用户刷新不了时会以为没改。

---

## 7. 其他踩过的坑

- **微信缓存**：改完线上，用户手机上多半还是旧页面。务必提醒刷新，并给带参数的链接。
- **`idx` 1-based**：`markers[it.idx]`、徽标、`md.push(i.idx)` 全都依赖它。
- **分类短标签**：地图 pin 上显示的是 `catShort`（1 个字），漏配会显示 undefined。
- **文案里的数字要真实**："781 条视频 / 约 7900 条评论"这种，一开始写的是"两条抖音视频"（徐州的残留），差点又翻车。
- **别编店名**：高德查不到的店（巷中鱼火锅、小孙凉皮凉面、啤酒烧烤局…）**不要**标到地图上，放进速查 TXT 的"评论里点名但高德搜不到"清单里，让用户自己去确认。
