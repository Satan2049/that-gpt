#Requires -Version 5.1
<#
.SYNOPSIS
  Generate SHA256 checksums for release artifacts.

.DESCRIPTION
  Hashes portable EXE, NSIS installer, ZIP archives, and other files in release/.
  If release/ is missing, falls back to Tauri bundle output under src-tauri/target/release/bundle/.

  Output: SHA256.txt at the repository root.

.PARAMETER Package
  Run package-release.ps1 before hashing.

.PARAMETER OutputFile
  Path to the checksum file (default: SHA256.txt in repo root).

.EXAMPLE
  .\scripts\generate-sha256.ps1 -Package
#>
[CmdletBinding()]
param(
  [switch]$Package,
  [string]$OutputFile = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($OutputFile)) {
  $OutputFile = Join-Path $Root "SHA256.txt"
}

if ($Package) {
  & (Join-Path $PSScriptRoot "package-release.ps1")
}

$TauriConf = Join-Path $Root "src-tauri\tauri.conf.json"
$conf = Get-Content $TauriConf -Raw | ConvertFrom-Json
$Version = $conf.version
$Product = $conf.productName
$GeneratedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss") + " UTC"

$ReleaseDir = Join-Path $Root "release"
$BundlePortable = Join-Path $Root "src-tauri\target\release\bundle\portable"
$BundleNsis = Join-Path $Root "src-tauri\target\release\bundle\nsis"

$candidates = [System.Collections.Generic.List[string]]::new()

function Add-IfExists([string]$Path) {
  if (Test-Path $Path) {
    $item = Get-Item $Path
    if ($item.PSIsContainer) {
      Get-ChildItem $Path -File -Recurse | ForEach-Object { $candidates.Add($_.FullName) }
    } else {
      $candidates.Add($item.FullName)
    }
  }
}

# Primary: packaged release folder (exe + zip)
Add-IfExists $ReleaseDir

# Fallback: raw Tauri bundle outputs
if ($candidates.Count -eq 0) {
  Write-Warning "release/ is empty. Hashing Tauri bundle artifacts directly."
  Add-IfExists (Join-Path $BundlePortable "ChatNest.exe")
  Add-IfExists (Join-Path $BundlePortable "chat-nest.exe")
  if (Test-Path $BundleNsis) {
    Get-ChildItem $BundleNsis -Filter "*.exe" | ForEach-Object { $candidates.Add($_.FullName) }
  }
}

# Optional branding assets shipped with releases
Add-IfExists (Join-Path $Root "assets\logo.png")
Add-IfExists (Join-Path $Root "assets\banner.png")

$files = $candidates | Select-Object -Unique | Sort-Object
if ($files.Count -eq 0) {
  throw "No release artifacts found. Run 'npm run build' then 'npm run release:package'."
}

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# ChatNest SHA256 checksums")
$lines.Add("# Product: $Product")
$lines.Add("# Version: $Version")
$lines.Add("# Generated: $GeneratedAt")
$lines.Add("#")
$lines.Add("# Verify on Windows (PowerShell):")
$lines.Add("#   Get-FileHash -Algorithm SHA256 <file>")
$lines.Add("# See docs/TRUST.md for full instructions.")
$lines.Add("")

foreach ($file in $files) {
  $hash = (Get-FileHash -Path $file -Algorithm SHA256).Hash.ToLowerInvariant()
  $relative = $file.Substring($Root.Length).TrimStart("\", "/") -replace "\\", "/"
  $lines.Add("$hash  $relative")
}

$lines | Set-Content -Path $OutputFile -Encoding utf8

Write-Host ""
Write-Host "Wrote $($files.Count) checksum(s) to $OutputFile"
Write-Host ""
Get-Content $OutputFile | Select-Object -Skip 7
