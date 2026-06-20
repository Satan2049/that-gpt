#Requires -Version 5.1
<#
.SYNOPSIS
  Remove build artifacts, caches, and other junk from the ThatGPT workspace.

.DESCRIPTION
  Safe by default: deletes compile outputs and temp files, not dependencies.
  Use -All to also remove node_modules (requires npm install afterward).

.EXAMPLE
  npm run clean
  .\scripts\clean-project.ps1

.EXAMPLE
  .\scripts\clean-project.ps1 -All -Release
#>
param(
    [switch]$All,
    [switch]$Release
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot

function Remove-IfExists {
    param([string]$Path, [string]$Label)
    if (Test-Path $Path) {
        Write-Host "Removing $Label..."
        Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Remove-Glob {
    param([string]$Pattern, [string]$Label)
    $items = Get-ChildItem -Path $Root -Recurse -Force -Filter $Pattern -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch '\\node_modules\\' }
    foreach ($item in $items) {
        Write-Host "Removing $Label: $($item.FullName)"
        Remove-Item -LiteralPath $item.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "ThatGPT workspace cleanup ($Root)"

# Rust / Tauri
Remove-IfExists (Join-Path $Root "src-tauri\target") "Rust target (src-tauri/target)"

# Frontend build output
Remove-IfExists (Join-Path $Root "client\dist") "Vite dist (client/dist)"

# Staged release folder (optional)
if ($Release) {
    Remove-IfExists (Join-Path $Root "release") "release/"
}

# Vite / tooling caches (outside node_modules root)
Remove-IfExists (Join-Path $Root "client\node_modules\.vite") "Vite cache"
Remove-IfExists (Join-Path $Root "node_modules\.cache") "npm cache folder"

# Logs and OS junk
Remove-Glob "*.log" "log file"
Remove-Glob "Thumbs.db" "Thumbs.db"
Remove-Glob ".DS_Store" "macOS metadata"

$tempPatterns = @(
    "npm-debug.log*",
    "yarn-debug.log*",
    "yarn-error.log*",
    "pnpm-debug.log*"
)
foreach ($pattern in $tempPatterns) {
    Get-ChildItem -Path $Root -Recurse -Force -Filter $pattern -ErrorAction SilentlyContinue |
        ForEach-Object {
            Write-Host "Removing log: $($_.FullName)"
            Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
        }
}

if ($All) {
    Remove-IfExists (Join-Path $Root "node_modules") "root node_modules"
    Remove-IfExists (Join-Path $Root "client\node_modules") "client node_modules"
    Write-Host "Dependencies removed. Run: npm install"
}

Write-Host "Done."
