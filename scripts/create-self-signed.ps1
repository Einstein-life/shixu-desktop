# Local self-signed cert for Shixu Desktop (TEST ONLY).
# Do NOT use self-signed certs for public distribution.
$ErrorActionPreference = "Stop"
$certName = "Shixu Desktop Dev"
$pwdPlain = "Shixu-Dev-2026!"
$secure = ConvertTo-SecureString -String $pwdPlain -Force -AsPlainText
$outDir = Join-Path $PSScriptRoot "..\certs"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=$certName" -CertStoreLocation "Cert:\CurrentUser\My" -KeyExportPolicy Exportable -KeySpec Signature -HashAlgorithm SHA256 -NotAfter (Get-Date).AddYears(2)
$pfx = Join-Path $outDir "shixu-dev.pfx"
Export-PfxCertificate -Cert $cert -FilePath $pfx -Password $secure | Out-Null
Write-Host "Generated: $pfx"
Write-Host "Set env SHIXU_CERT_FILE and SHIXU_CERT_PASSWORD then npm run dist"
