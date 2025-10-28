<#
  PowerShell wrapper to run migrations against the installed Rapkumer-data DB.
  Double-clicking this (or running from Explorer) will attempt to run migrations
  using the Node runtime on PATH.
#>
try {
  $local = $env:LOCALAPPDATA
  if (-not $local) {
    Write-Error "LOCALAPPDATA is not set. Cannot locate installed Rapkumer-data folder."
    exit 1
  }

  $dbFile = Join-Path $local 'Rapkumer-data\database.sqlite3'
  $env:DB_URL = "file:$dbFile"
  Write-Host "Using DB: $dbFile"

  # Ensure node is available
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    Write-Error "Node.js not found in PATH. Please install Node or run this script from an environment with node available."
    exit 1
  }

  # Run the migration helper
  $script = Join-Path $PSScriptRoot '..\scripts\migrate-installed-db.mjs'
  Write-Host "Running migration helper: $script"
  & node $script
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "Migration finished."
} catch {
  Write-Error "Migration failed: $_"
  exit 1
}
