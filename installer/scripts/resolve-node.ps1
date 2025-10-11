param(
    [string]$BundledNodePath = "",
    [switch]$PreferSystem
)

$ErrorActionPreference = 'Stop'

# Helper to test if a path points to a Node executable we can actually run.
function Test-NodeExecutable {
    param([string]$Candidate)
    if (-not $Candidate) { return $false }
    if (-not (Test-Path $Candidate)) { return $false }
    try {
        $output = & $Candidate --version 2>$null
        if ($LASTEXITCODE -ne 0) { return $false }
        return $true
    } catch {
        return $false
    }
}

$resolved = $null

if ($PreferSystem) {
    try {
        $systemNode = (Get-Command node.exe -ErrorAction Stop).Source
        if (Test-NodeExecutable $systemNode) {
            $resolved = $systemNode
        }
    } catch {
        # ignore
    }
}

if (-not $resolved -and $BundledNodePath) {
    if (Test-NodeExecutable $BundledNodePath) {
        $resolved = $BundledNodePath
    }
}

if (-not $resolved -and -not $PreferSystem) {
    try {
        $systemNode = (Get-Command node.exe -ErrorAction Stop).Source
        if (Test-NodeExecutable $systemNode) {
            $resolved = $systemNode
        }
    } catch {
        # ignore
    }
}

if (-not $resolved) {
    Write-Error "Tidak menemukan Node.js yang valid di PATH maupun jalur bundel." -ErrorAction Stop
}

$resolved
