from pathlib import Path
import shutil
import sys

# Windows CI 默认 stdout 为 cp1252，中文路径 print 会炸
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

root = Path(__file__).resolve().parents[1]
release = root / "release"
# Prefer exact Chinese folder name; fall back to any *-portable
candidates = [
    release / "时序调度-portable",
    release / "shixu-portable",
]
portable = next((p for p in candidates if p.exists()), None)
if portable is None:
    portable = release / "时序调度-portable"
    release.mkdir(parents=True, exist_ok=True)
    dist = root / "node_modules" / "electron" / "dist"
    if not dist.exists():
        raise SystemExit("Missing node_modules/electron/dist — run npm install first")
    if portable.exists():
        shutil.rmtree(portable)
    shutil.copytree(dist, portable)
    print("Created portable from electron dist")

app = portable / "resources" / "app"
app.mkdir(parents=True, exist_ok=True)
for name in ("electron", "renderer", "assets"):
    src = root / name
    dst = app / name
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)
shutil.copy2(root / "package.json", app / "package.json")
shutil.copy2(root / "README.md", portable / "README.md")

html = (app / "renderer" / "index.html").read_text(encoding="utf-8")
print("has_export", "btnExportDesk" in html)
print("has_autostart", "btnAutoStart" in html)
print("has_import", "btnImportDesk" in html)
# 只打印 ASCII，避免 cp1252 终端崩溃
print("SYNC_OK", str(app).encode("ascii", "backslashreplace").decode("ascii"))

selfsign = """# Local self-signed cert for Shixu Desktop (TEST ONLY).
$ErrorActionPreference = "Stop"
$certName = "Shixu Desktop Dev"
$pwdPlain = "Shixu-Dev-2026!"
$secure = ConvertTo-SecureString -String $pwdPlain -Force -AsPlainText
$outDir = Join-Path $PSScriptRoot "..\\certs"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=$certName" -CertStoreLocation "Cert:\\CurrentUser\\My" -KeyExportPolicy Exportable -KeySpec Signature -HashAlgorithm SHA256 -NotAfter (Get-Date).AddYears(2)
$pfx = Join-Path $outDir "shixu-dev.pfx"
Export-PfxCertificate -Cert $cert -FilePath $pfx -Password $secure | Out-Null
Write-Host "Generated: $pfx"
"""
(root / "scripts" / "create-self-signed.ps1").write_text(selfsign, encoding="utf-8-sig")
print("PS1_OK")
