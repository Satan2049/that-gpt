#Requires -Version 5.1
<#
.SYNOPSIS
  Stage Windows release artifacts into the release/ folder and create ZIP archives.

.DESCRIPTION
  Copies portable EXE and NSIS installer from the Tauri build output, then creates
  ZIP archives suitable for GitHub Releases.

  Run after: npm run build
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$TauriConf = Join-Path $Root "src-tauri\tauri.conf.json"
$ReleaseOut = Join-Path $Root "release"
$BundleDir = Join-Path $Root "src-tauri\target\release\bundle"
$PortableDir = Join-Path $BundleDir "portable"
$NsisDir = Join-Path $BundleDir "nsis"

if (-not (Test-Path $TauriConf)) {
  throw "Missing tauri.conf.json at $TauriConf"
}

$conf = Get-Content $TauriConf -Raw | ConvertFrom-Json
$Product = $conf.productName
$Version = $conf.version
$Tag = "$Product-$Version-windows-x64"

$portableExe = Join-Path $PortableDir "ThatGPT.exe"
if (-not (Test-Path $portableExe)) {
  $portableExe = Join-Path $PortableDir "that-gpt.exe"
}
if (-not (Test-Path $portableExe)) {
  throw "Portable executable not found. Run 'npm run build' first."
}

$installer = Get-ChildItem -Path $NsisDir -Filter "*-setup.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $installer) {
  Write-Warning "NSIS installer not found in $NsisDir (portable-only build?)."
}

if (Test-Path $ReleaseOut) {
  Remove-Item $ReleaseOut -Recurse -Force
}
New-Item -ItemType Directory -Path $ReleaseOut | Out-Null

$portableDest = Join-Path $ReleaseOut "$Tag-portable.exe"
Copy-Item $portableExe $portableDest

$portableZip = Join-Path $ReleaseOut "$Tag-portable.zip"
Compress-Archive -Path $portableDest -DestinationPath $portableZip -Force

if ($installer) {
  $installerDest = Join-Path $ReleaseOut $installer.Name
  Copy-Item $installer.FullName $installerDest

  $installerZip = Join-Path $ReleaseOut "$Tag-setup.zip"
  Compress-Archive -Path $installerDest -DestinationPath $installerZip -Force
}

Write-Host ""
Write-Host "Release assets staged in: release/"
Get-ChildItem $ReleaseOut | ForEach-Object {
  Write-Host "  $($_.Name) ($([math]::Round($_.Length / 1MB, 2)) MB)"
}
Write-Host ""
Write-Host "Next: .\scripts\generate-sha256.ps1"
