param(
    [Parameter(Mandatory = $true)]
    [string]$InstallDir
)

$ErrorActionPreference = 'Stop'

function Test-NodeBinary {
    param([string]$BinaryPath)
    try {
        $process = Start-Process -FilePath $BinaryPath -ArgumentList '--version' -WindowStyle Hidden -NoNewWindow -PassThru -Wait -ErrorAction Stop
        return $process.ExitCode -eq 0
    } catch {
        return $false
    }
}

$localNode = Join-Path $InstallDir 'runtime\node\node.exe'
if (Test-Path $localNode -PathType Leaf) {
    if (Test-NodeBinary -BinaryPath $localNode) {
        Write-Host "Node.js already bundled at $localNode"
        exit 0
    } else {
        Write-Warning 'Bundled Node.js appears to be corrupted. Re-downloading.'
    }
}

try {
    $null = Get-Command node -ErrorAction Stop
    Write-Host 'System-wide Node.js detected. No bundled runtime required.'
    exit 0
} catch {
    Write-Host 'Node.js not found on PATH; bundling latest LTS locally...'
}

$indexUrl = 'https://nodejs.org/dist/index.json'
Write-Host "Fetching Node.js release metadata from $indexUrl"
$releaseContent = Invoke-WebRequest -Uri $indexUrl -UseBasicParsing | Select-Object -ExpandProperty Content
$releases = $releaseContent | ConvertFrom-Json
$latestLts = $releases | Where-Object { $_.lts -and $_.files -contains 'win-x64-zip' } | Sort-Object {
        [version]($_.version.TrimStart('v'))
    } -Descending | Select-Object -First 1

if (-not $latestLts) {
    Write-Error 'Unable to determine Node.js LTS release for Windows x64.'
    exit 1
}

$versionTag = $latestLts.version
$zipUrl = "https://nodejs.org/dist/$versionTag/node-$($versionTag)-win-x64.zip"
Write-Host "Downloading Node.js $versionTag from $zipUrl"
$tempZip = Join-Path ([System.IO.Path]::GetTempPath()) ("node-" + [System.Guid]::NewGuid().ToString() + '.zip')
Invoke-WebRequest -Uri $zipUrl -OutFile $tempZip -UseBasicParsing

$runtimeRoot = Join-Path $InstallDir 'runtime'
$targetDir = Join-Path $runtimeRoot 'node'
if (Test-Path $targetDir) {
    Remove-Item $targetDir -Recurse -Force
}
if (-not (Test-Path $runtimeRoot)) {
    New-Item -ItemType Directory -Path $runtimeRoot | Out-Null
}

Write-Host 'Extracting Node.js archive...'
Expand-Archive -LiteralPath $tempZip -DestinationPath $runtimeRoot -Force

$expandedDir = Join-Path $runtimeRoot ("node-$($versionTag)-win-x64")
if (-not (Test-Path $expandedDir)) {
    $alternative = Join-Path $runtimeRoot ("node-$([string]$versionTag).TrimStart('v')-win-x64")
    if (Test-Path $alternative) {
        $expandedDir = $alternative
    } else {
        Write-Error "Extracted Node.js directory not found under $runtimeRoot"
        exit 1
    }
}

Rename-Item -Path $expandedDir -NewName 'node' -Force
Remove-Item $tempZip -Force

if (-not (Test-NodeBinary -BinaryPath $localNode)) {
    Write-Error 'Failed to validate the downloaded Node.js binary.'
    exit 1
}

Write-Host "Bundled Node.js runtime ready at $localNode"
exit 0
