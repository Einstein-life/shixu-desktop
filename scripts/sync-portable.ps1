# 同步 electron/renderer 到 portable，供 NSIS 打包
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$portable = Join-Path $root "release\时序调度-portable"
if (-not (Test-Path $portable)) {
  Write-Error "缺少 $portable"
  exit 1
}
$app = Join-Path $portable "resources\app"
New-Item -ItemType Directory -Force -Path $app | Out-Null
Copy-Item (Join-Path $root "electron") (Join-Path $app "electron") -Recurse -Force
Copy-Item (Join-Path $root "renderer") (Join-Path $app "renderer") -Recurse -Force
Copy-Item (Join-Path $root "assets") (Join-Path $app "assets") -Recurse -Force
Copy-Item (Join-Path $root "package.json") (Join-Path $app "package.json") -Force
Copy-Item (Join-Path $root "README.md") (Join-Path $portable "README.md") -Force
Write-Host "SYNC_OK -> $app"
