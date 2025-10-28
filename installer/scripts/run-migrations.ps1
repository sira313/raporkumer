param(
    [Parameter(Mandatory=$false)]
    [string]$InstallDir = $PSScriptRoot
)

# Run migrations (drizzle-kit push) using the resolved Node runtime in the installer staging/app directory.
$ErrorActionPreference = 'Stop'

function Write-Log { param($m) Write-Host $m }

# Resolve node: prefer a bundled runtime inside the app (runtime\node\node.exe), otherwise pick system node
$bundledNode = Join-Path $InstallDir 'runtime\node\node.exe'
$resolver = Join-Path $PSScriptRoot 'resolve-node.ps1'

if (-not (Test-Path $resolver)) {
    Write-Error "resolve-node.ps1 not found next to this script ($resolver). Cannot resolve Node runtime." -ErrorAction Stop
}

$node = & $resolver -BundledNodePath $bundledNode -ErrorAction Stop
if (-not $node) {
    Write-Error 'Failed to resolve a usable Node executable.' -ErrorAction Stop
}

Write-Log "Using Node at: $node"

# Ensure app dir exists and has a data folder
if (-not (Test-Path $InstallDir)) {
    Write-Error "InstallDir $InstallDir does not exist." -ErrorAction Stop
}

# Try to locate a runnable drizzle-kit CLI in the staged app
$cliCandidates = @(
    Join-Path $InstallDir 'node_modules\.bin\drizzle-kit.cmd',
    Join-Path $InstallDir 'node_modules\.bin\drizzle-kit',
    Join-Path $InstallDir 'node_modules\drizzle-kit\dist\cli.js',
    Join-Path $InstallDir 'node_modules\drizzle-kit\cli.js'
)

$found = $null
foreach ($c in $cliCandidates) {
    if (Test-Path $c) { $found = $c; break }
}

if (-not $found) {
    Write-Warning 'drizzle-kit binary not found in staged app. Skipping migrations.'
    exit 0
}

Write-Log "Found drizzle-kit candidate: $found"

# Run drizzle-kit push in the app directory so it uses the project drizzle.config.js (defaults to file:./data/database.sqlite3)
Push-Location $InstallDir
try {
    if ($found -like '*.cmd') {
        # Execute the .cmd wrapper
        Write-Log "Executing: $found push"
        $proc = Start-Process -FilePath $found -ArgumentList 'push' -NoNewWindow -Wait -PassThru
        if ($proc.ExitCode -ne 0) { throw "drizzle-kit exited with code $($proc.ExitCode)" }
    } else {
        # Assume it's a JS file; invoke with node
        Write-Log "Executing: $node $found push"
        $proc = Start-Process -FilePath $node -ArgumentList @($found,'push') -NoNewWindow -Wait -PassThru
        if ($proc.ExitCode -ne 0) { throw "drizzle-kit (node) exited with code $($proc.ExitCode)" }
    }
    Write-Log 'Migrations applied successfully.'
} catch {
    Write-Warning "Migration step failed: $_"
    # Do not fail the installer hard; record a warning. If you prefer to fail the install, change this to throw.
} finally {
    Pop-Location
}
