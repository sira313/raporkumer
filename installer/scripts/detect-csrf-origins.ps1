param(
    [int]$Port = 3000
)

$ErrorActionPreference = 'SilentlyContinue'

$portString = if ($Port -gt 0) { $Port } else { 3000 }
$origins = @("http://localhost:$portString", "http://127.0.0.1:$portString")

try {
    $ipv4 = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.IPAddress -and
        $_.IPAddress -notmatch '^(0\.0\.0\.0|127\.|169\.254\.)' -and
        ($_.PrefixOrigin -eq 'Manual' -or $_.PrefixOrigin -eq 'Dhcp' -or $_.PrefixOrigin -eq 'Other')
    } | Select-Object -ExpandProperty IPAddress -Unique

    if ($ipv4) {
        $origins += $ipv4 | ForEach-Object { "http://$_:$portString" }
    }
} catch {
    # Ignore detection failures; fall back to localhost origins only
}

$uniqueOrigins = $origins | Where-Object { $_ } | Sort-Object -Unique
Write-Output ($uniqueOrigins -join ',')
