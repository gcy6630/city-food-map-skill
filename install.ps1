# city-food-map 一键安装（Windows / AionUi）
#
# 用法（在解压后的 city-food-map 目录里）：
#   powershell -ExecutionPolicy Bypass -File .\install.ps1
#
# 干的事：把本目录复制到 AionUi 的技能目录，并调 aioncore 注册它。
# 不想用它也行，手动复制 + 注册见 INSTALL.md。

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$SKILL_NAME = 'city-food-map'
$HERE = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " 安装 city-food-map" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# ---- 1. 找 AionUi 数据目录 ----
$dataRoot = Join-Path $env:APPDATA 'AionUi\aionui'
if (-not (Test-Path $dataRoot)) {
  Write-Host "`n[×] 没找到 AionUi 数据目录：$dataRoot" -ForegroundColor Red
  Write-Host "    如果你是手动装到别的 agent，请直接看 INSTALL.md 第 3 节。" -ForegroundColor Yellow
  exit 1
}

$usersDir = Join-Path $dataRoot 'skills\users'
if (-not (Test-Path $usersDir)) { New-Item -ItemType Directory -Force -Path $usersDir | Out-Null }

$uids = @(Get-ChildItem $usersDir -Directory -ErrorAction SilentlyContinue)
if ($uids.Count -eq 0) {
  Write-Host "`n[×] 技能用户目录是空的：$usersDir" -ForegroundColor Red
  Write-Host "    先在 AionUi 里发一条消息，让它把自己的目录建出来，再跑一次。" -ForegroundColor Yellow
  exit 1
}
if ($uids.Count -gt 1) {
  Write-Host "`n发现多个用户目录，请选一个：" -ForegroundColor Yellow
  for ($i = 0; $i -lt $uids.Count; $i++) { Write-Host "  [$i] $($uids[$i].Name)" }
  $pick = Read-Host "输入编号"
  $uid = $uids[[int]$pick].Name
} else {
  $uid = $uids[0].Name
}
$target = Join-Path $usersDir "$uid\$SKILL_NAME"
Write-Host "`n目标目录：$target"

# ---- 2. 复制文件 ----
if ((Resolve-Path $HERE).Path -eq (Resolve-Path $target -ErrorAction SilentlyContinue).Path) {
  Write-Host "已经在技能目录里了，跳过复制。" -ForegroundColor Green
} else {
  if (Test-Path $target) { Remove-Item $target -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $target | Out-Null
  foreach ($item in @('SKILL.md', 'INSTALL.md', 'README.md', 'LICENSE', '.gitignore', 'scripts', 'assets', 'reference', 'install.ps1')) {
    $src = Join-Path $HERE $item
    if (Test-Path $src) { Copy-Item $src -Destination $target -Recurse -Force }
  }
  Write-Host "复制完成 ✓" -ForegroundColor Green
}

# ---- 3. 找 aioncore 并注册 ----
$aioncore = $null
foreach ($p in @(
    (Join-Path $env:LOCALAPPDATA 'Programs\AionUi\resources\bundled-aioncore\win32-x64\aioncore.exe'),
    (Join-Path $env:PROGRAMFILES 'AionUi\resources\bundled-aioncore\win32-x64\aioncore.exe')
  )) { if (Test-Path $p) { $aioncore = $p; break } }

if (-not $aioncore) {
  Write-Host "`n[!] 没自动找到 aioncore.exe，请手动注册：" -ForegroundColor Yellow
  Write-Host "    <aioncore路径> config skills import   （stdin 传 {"skill_path":"$target"}）" -ForegroundColor Yellow
  Write-Host "`n路径写两遍反斜杠，例如：{\"skill_path\":\"$($target -replace '\\','\\')\"}"
  exit 0
}

Write-Host "`n用 $aioncore 注册…"
$json = '{"skill_path":"' + ($target -replace '\\', '\\') + '"}'
$json | & $aioncore config skills import | Out-String -Width 200 | Write-Host

Write-Host "`n校验：" -ForegroundColor Cyan
$info = $json | & $aioncore config skills info | Out-String -Width 200
Write-Host $info

# ---- 4. 依赖检查 ----
Write-Host "`n检查运行依赖（playwright / qrcode / jsqr / pngjs）…" -ForegroundColor Cyan
$tools = $env:FOODMAP_TOOLS
if ($tools -and (Test-Path (Join-Path $tools 'node_modules'))) {
  Write-Host "  FOODMAP_TOOLS = $tools ✓" -ForegroundColor Green
} else {
  Write-Host "  还没设 FOODMAP_TOOLS。脚本会自动在当前目录往上的 node_modules 里找；" -ForegroundColor Yellow
  Write-Host "  如果找不到，就在你放项目的目录执行：" -ForegroundColor Yellow
  Write-Host "    npm i playwright qrcode jsqr pngjs" -ForegroundColor White
  Write-Host "    npx playwright install chromium" -ForegroundColor White
  Write-Host "  然后设：`$env:FOODMAP_TOOLS = `"<那个目录>`"" -ForegroundColor White
}
Write-Host "`n密钥（可选但推荐）：" -ForegroundColor Cyan
Write-Host "  高德   ：$tools\amap_key.txt    或环境变量 AMAP_KEY"
Write-Host "  GitHub ：$tools\github_token.txt 或环境变量 GITHUB_TOKEN"

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host " 装好了！开一个新对话，说「帮我做一份XX的美食地图」试试" -ForegroundColor Green
Write-Host " （新导入的技能不会热注入当前对话，要新开一个）" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
