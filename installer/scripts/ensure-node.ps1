param(
    [Parameter(Mandatory = $true)]
    [string]$InstallDir,
    [switch]$EnsureBundled
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

function Get-PreferredReleases {
    param($AllReleases)

    $preferredMajors = @(20, 22, 18)
    $candidates = @()
    foreach ($major in $preferredMajors) {
        $release = $AllReleases |
            Where-Object { $_.lts -and $_.files -contains 'win-x64-zip' -and ([int]$_.version.TrimStart('v').Split('.')[0]) -eq $major } |
            Sort-Object { [version]($_.version.TrimStart('v')) } -Descending |
            Select-Object -First 1
        if ($release) {
            $candidates += $release
        }
    }

    if (-not $candidates) {
        $candidates = $AllReleases |
            Where-Object { $_.lts -and $_.files -contains 'win-x64-zip' } |
            Sort-Object { [version]($_.version.TrimStart('v')) } -Descending
    }

    return $candidates | Select-Object -Unique
}

function Install-NodeRelease {
    param(
        $Release,
        [string]$TargetDir
    )

    $versionTag = $Release.version
    $zipUrl = "https://nodejs.org/dist/$versionTag/node-$($versionTag)-win-x64.zip"
    Write-Host "Downloading Node.js $versionTag from $zipUrl"

    $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("rapkumer-node-" + [System.Guid]::NewGuid().ToString())
    $null = New-Item -ItemType Directory -Path $tempRoot -Force
    $tempZip = Join-Path $tempRoot 'node.zip'

    try {
        Invoke-WebRequest -Uri $zipUrl -OutFile $tempZip -UseBasicParsing

        $expandedTempRoot = Join-Path $tempRoot 'extracted'
        Expand-Archive -LiteralPath $tempZip -DestinationPath $expandedTempRoot -Force

        $expandedDir = Join-Path $expandedTempRoot ("node-$($versionTag)-win-x64")
        if (-not (Test-Path $expandedDir)) {
            $alternative = Join-Path $expandedTempRoot ("node-$([string]$versionTag).TrimStart('v')-win-x64")
            if (Test-Path $alternative) {
                $expandedDir = $alternative
            } else {
                throw "Extracted Node.js directory not found in archive."
            }
        }

        $targetParent = Split-Path $TargetDir -Parent
        if (-not (Test-Path $targetParent)) {
            New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
        }

        if (Test-Path $TargetDir) {
            Remove-Item $TargetDir -Recurse -Force
        }

        Move-Item -Path $expandedDir -Destination $TargetDir -Force

        $localNode = Join-Path $TargetDir 'node.exe'
        if (-not (Test-NodeBinary -BinaryPath $localNode)) {
            throw 'Node binary executed with non-zero exit code.'
        }

        return $true
    } catch {
        Write-Warning ("Failed to install Node.js {0}: {1}" -f $versionTag, $_)
        return $false
    } finally {
        if (Test-Path $tempRoot) {
            Remove-Item $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

function Try-CopySystemNode {
    param([string]$DestinationDir)

    try {
        $command = Get-Command node -ErrorAction Stop
        $sourceExe = $command.Source
        if (-not (Test-Path $sourceExe)) {
            return $false
        }

        $sourceDir = Split-Path $sourceExe -Parent
        if (-not (Test-Path (Join-Path $sourceDir 'node.exe'))) {
            return $false
        }

        if (Test-Path $DestinationDir) {
            Remove-Item $DestinationDir -Recurse -Force
        }

        Write-Host "Copying system Node.js from $sourceDir"
        New-Item -ItemType Directory -Path $DestinationDir -Force | Out-Null
        Copy-Item -Path (Join-Path $sourceDir '*') -Destination $DestinationDir -Recurse -Force

        $localNode = Join-Path $DestinationDir 'node.exe'
        if (Test-NodeBinary -BinaryPath $localNode) {
            return $true
        }

        Write-Warning 'Copied system Node.js failed validation, will attempt download instead.'
        Remove-Item $DestinationDir -Recurse -Force
        return $false
    } catch {
        Write-Warning ("Unable to copy system Node.js: {0}" -f $_)
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
        Remove-Item (Split-Path $localNode -Parent) -Recurse -Force
    }
}

if (-not $EnsureBundled) {
    try {
        $null = Get-Command node -ErrorAction Stop
        Write-Host 'System-wide Node.js detected. No bundled runtime required.'
        exit 0
    } catch {
        Write-Host 'Node.js not found on PATH; bundling latest LTS locally...'
    }
} else {
    Write-Host 'Forcing bundled Node.js runtime download as requested.'
}

$indexUrl = 'https://nodejs.org/dist/index.json'
Write-Host "Fetching Node.js release metadata from $indexUrl"
$releaseContent = Invoke-WebRequest -Uri $indexUrl -UseBasicParsing | Select-Object -ExpandProperty Content
$releases = $releaseContent | ConvertFrom-Json
if (-not $releases) {
    Write-Error 'Unable to retrieve Node.js release metadata.'
    exit 1
}

$runtimeRoot = Join-Path $InstallDir 'runtime'
$targetDir = Join-Path $runtimeRoot 'node'
$candidateReleases = Get-PreferredReleases -AllReleases $releases

if (Try-CopySystemNode -DestinationDir $targetDir) {
    $localNode = Join-Path $targetDir 'node.exe'
    Write-Host "Bundled Node.js runtime ready at $localNode"
    exit 0
}

foreach ($release in $candidateReleases) {
    if (Install-NodeRelease -Release $release -TargetDir $targetDir) {
        $localNode = Join-Path $targetDir 'node.exe'
        Write-Host "Bundled Node.js runtime ready at $localNode"
        exit 0
    }
}

Write-Error 'Failed to bundle any Node.js LTS runtime. Please check your network connection and retry.'
exit 1
