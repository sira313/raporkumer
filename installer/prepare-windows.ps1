param(
    [string]$OutputDir = "dist/windows",
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$absOutput = Join-Path $projectRoot $OutputDir
$stageRoot = Join-Path $absOutput 'stage'
$appName = 'Rapkumer'
$appStage = Join-Path $stageRoot $appName

Write-Host "Preparing Windows staging layout for $appName" -ForegroundColor Cyan

if (-not $SkipBuild) {
    Write-Host 'Running production build (pnpm build)...'
    Push-Location $projectRoot
    pnpm build
    Pop-Location
} else {
    Write-Host 'Skipping build step as requested.'
}

if (Test-Path $stageRoot) {
    Write-Host "Cleaning previous staging directory at $stageRoot"
    Remove-Item $stageRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $appStage -Force | Out-Null

Write-Host 'Copying build artifacts...'
Copy-Item (Join-Path $projectRoot 'build') -Destination (Join-Path $appStage 'build') -Recurse -Force

Write-Host 'Copying static assets...'
$staticSource = Join-Path $projectRoot 'static'
if (Test-Path $staticSource) {
    Copy-Item $staticSource -Destination (Join-Path $appStage 'static') -Recurse -Force
} else {
    Write-Warning 'Static directory not found; skipping copy of static assets.'
}

$databasePath = Join-Path $projectRoot 'data/database.sqlite3'
if (Test-Path $databasePath) {
    Write-Host 'Bundling default SQLite database...'
    $dataDir = Join-Path $appStage 'data'
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    Copy-Item $databasePath -Destination (Join-Path $dataDir 'database.sqlite3') -Force
} else {
    Write-Warning 'Default SQLite database not found; continuing without bundling data/database.sqlite3.'
}

Write-Host 'Generating runtime package manifest...'
$packageJsonPath = Join-Path $projectRoot 'package.json'
$package = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
$runtimePackage = [ordered]@{
    name = $package.name
    version = $package.version
    private = $true
    type = 'module'
    scripts = @{ start = 'node build/index.js' }
    dependencies = $package.dependencies
}
$runtimeJson = $runtimePackage | ConvertTo-Json -Depth 5
Set-Content -Path (Join-Path $appStage 'package.json') -Value $runtimeJson -Encoding UTF8

Write-Host 'Copying runtime helper scripts...'
Copy-Item (Join-Path $projectRoot 'installer/files/start-rapkumer.cmd') (Join-Path $appStage 'start-rapkumer.cmd') -Force

$toolsDir = Join-Path $appStage 'tools'
New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
Copy-Item (Join-Path $projectRoot 'installer/scripts/detect-csrf-origins.ps1') (Join-Path $toolsDir 'detect-csrf-origins.ps1') -Force
Copy-Item (Join-Path $projectRoot 'installer/scripts/resolve-node.ps1') (Join-Path $toolsDir 'resolve-node.ps1') -Force
Copy-Item (Join-Path $projectRoot 'installer/scripts/run-server.cmd') (Join-Path $toolsDir 'run-server.cmd') -Force

$envSample = Join-Path $projectRoot '.env.example'
if (Test-Path $envSample) {
    Copy-Item $envSample (Join-Path $appStage '.env.example') -Force
}

Write-Host 'Installing production dependencies with npm (omit dev)...'
Push-Location $appStage
if (Test-Path 'node_modules') { Remove-Item 'node_modules' -Recurse -Force }
if (Test-Path 'package-lock.json') { Remove-Item 'package-lock.json' -Force }
npm install --omit=dev --no-package-lock
Pop-Location

Write-Host "Staging complete. Contents available at $appStage" -ForegroundColor Green
