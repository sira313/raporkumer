param(
    [Parameter(Mandatory=$true)][string]$InstallDir
)

$ErrorActionPreference = 'Stop'

function Resolve-NodeExecutable {
    param([string]$InstallDir)
    # Prefer bundled runtime under {app}\runtime\node\node.exe
    $bundled = Join-Path $InstallDir 'runtime\node\node.exe'
    if (Test-Path $bundled) { return $bundled }

    # Try Program Files
    $pf = ${env:ProgramFiles}
    if ($pf) {
        $pfNode = Join-Path $pf 'nodejs\node.exe'
        if (Test-Path $pfNode) { return $pfNode }
    }

    # Fallback to system node in PATH
    try {
        $cmd = Get-Command node -ErrorAction Stop
        return $cmd.Path
    } catch {
        return $null
    }
}

function Create-Shortcut {
    param(
        [string]$TargetPath,
        [string]$Arguments,
        [string]$WorkingDirectory,
        [string]$ShortcutPath,
        [string]$IconLocation
    )

    $shell = New-Object -ComObject WScript.Shell
    $sc = $shell.CreateShortcut($ShortcutPath)
    $sc.TargetPath = $TargetPath
    if ($Arguments) { $sc.Arguments = $Arguments }
    if ($WorkingDirectory) { $sc.WorkingDirectory = $WorkingDirectory }
    if ($IconLocation) { $sc.IconLocation = $IconLocation }
    $sc.Save()
}

Write-Host "Creating shortcuts for Rapkumer (InstallDir=$InstallDir)"

$node = Resolve-NodeExecutable -InstallDir $InstallDir
if (-not $node) {
    Write-Warning 'No Node.js runtime found to use for shortcuts; skipping.'
    exit 0
}

$target = $node
$args = '"' + (Join-Path $InstallDir 'start-rapkumer.mjs') + '"'
$working = $InstallDir
$icon = Join-Path $InstallDir 'rapkumer.ico'

# Desktop shortcut
$desktop = [Environment]::GetFolderPath('Desktop')
$desktopShortcut = Join-Path $desktop 'Rapkumer.lnk'
Create-Shortcut -TargetPath $target -Arguments $args -WorkingDirectory $working -ShortcutPath $desktopShortcut -IconLocation $icon
Write-Host "Desktop shortcut created: $desktopShortcut"

# Start Menu (Programs) shortcut
$programs = [Environment]::GetFolderPath('Programs')
$menuFolder = Join-Path $programs 'Rapkumer'
if (-not (Test-Path $menuFolder)) { New-Item -ItemType Directory -Path $menuFolder -Force | Out-Null }
$startShortcut = Join-Path $menuFolder 'Rapkumer.lnk'
Create-Shortcut -TargetPath $target -Arguments $args -WorkingDirectory $working -ShortcutPath $startShortcut -IconLocation $icon
Write-Host "Start Menu shortcut created: $startShortcut"
