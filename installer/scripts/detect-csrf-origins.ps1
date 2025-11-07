param(
    [int]$Port = 3000,
    [string]$LogPath
)

$ErrorActionPreference = 'SilentlyContinue'

# port string to use in constructed origins
$portString = if ($Port -gt 0) { $Port } else { 3000 }

# default origins (always present)
$origins = @("http://localhost:$portString", "http://127.0.0.1:$portString")

# collect IPv4 candidates
$ipv4 = New-Object System.Collections.Generic.List[string]

function Write-DebugLog {
    param([string]$Message)
    if (-not $LogPath) { return }
    try {
        $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff'
        Add-Content -Path $LogPath -Value "[$timestamp] detect-csrf-origins.ps1: $Message"
    } catch {
        # ignore logging issues
    }
}

function Add-Ipv4Candidate {
    param([string]$Value)
    if (-not $Value) { return }
    if ($Value -notmatch '^\d+\.\d+\.\d+\.\d+$') { return }
    if ($Value -match '^(0\.0\.0\.0|127\.|169\.254\.)') { return }
    if (-not ($ipv4 -contains $Value)) {
        $ipv4.Add($Value)
        Write-DebugLog "Captured IPv4 candidate $Value"
    }
}

try {
    Write-DebugLog 'Enumerating network interfaces via .NET API'
    $interfaces = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() | Where-Object {
        $_.OperationalStatus -eq 'Up'
    }
    foreach ($iface in $interfaces) {
        $properties = $iface.GetIPProperties()
        foreach ($address in $properties.UnicastAddresses) {
            if ($address.Address.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) { continue }
            if ($address.IsTransient) { continue }
            if ($address.DuplicateAddressDetectionState -eq 'Duplicate') { continue }
            Add-Ipv4Candidate -Value $address.Address.IPAddressToString
        }
    }
} catch {
    # ignore .NET lookup failure and fall back to PowerShell cmdlets
}

try {
    Write-DebugLog 'Enumerating IPv4 via Get-NetIPAddress'
    Get-NetIPAddress -AddressFamily IPv4 | ForEach-Object { Add-Ipv4Candidate -Value $_.IPAddress }
} catch {
    # ignore Get-NetIPAddress failures
}

if ($ipv4.Count -eq 0) {
    try {
        Write-DebugLog 'Enumerating IPv4 via Get-NetIPAddress with preferred aliases'
        Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
            $_.InterfaceAlias -match '^(Ethernet|Wi-?Fi|LAN|WLAN)'
        } | ForEach-Object { Add-Ipv4Candidate -Value $_.IPAddress }
    } catch {
        # ignore alias-based fallback failures
    }
}

try {
    Write-DebugLog 'Enumerating IPv4 via CIM'
    Get-CimInstance -ClassName Win32_NetworkAdapterConfiguration -Filter "IPEnabled = True" | ForEach-Object {
        foreach ($address in $_.IPAddress) {
            Add-Ipv4Candidate -Value $address
        }
    }
} catch {
    # ignore CIM failures
}

try {
    Write-DebugLog 'Enumerating IPv4 via ipconfig parsing'
    $pattern = '(?:IPv4 Address|Alamat IPv4)[^:]*:\s*(?<ip>\d+\.\d+\.\d+\.\d+)'
    $matches = ipconfig | Select-String -Pattern $pattern
    foreach ($match in $matches) {
        Add-Ipv4Candidate -Value $match.Matches[0].Groups['ip'].Value
    }
} catch {
    # ignore ipconfig parsing failure
}

$uniqueIpv4 = $ipv4 | Select-Object -Unique
$validIpv4 = @()

if ($uniqueIpv4.Count -gt 0) {
    # Use all discovered IPv4 (loopback/APIPA filtered earlier)
    $validIpv4 = $uniqueIpv4
    Write-DebugLog "All detected IPv4 selected: $($validIpv4 -join ', ')"
}

if ($validIpv4.Count -gt 0) {
    # For each discovered IPv4, allow both http and https variants (with explicit port)
    $validOrigins = @()
    foreach ($ip in $validIpv4) {
        $validOrigins += 'http://' + $ip + ':' + $portString
        $validOrigins += 'https://' + $ip + ':' + $portString
    }
    $origins += $validOrigins
    Write-DebugLog "Final origin list (including IPv4 http/https): $($origins -join ', ')"
} else {
    Write-DebugLog 'No additional IPv4 detected; using default origins only'
}

# Normalize and dedupe origins
$uniqueOrigins = $origins | Where-Object { $_ } | Sort-Object -Unique

# Attempt to write merged origins to data csrf-origins.txt so custom entries are preserved
try {
    # Determine data directory in the same order as server code: RAPKUMER_DATA_DIR, LOCALAPPDATA\Rapkumer-data, then ./data
    $dataDir = $env:RAPKUMER_DATA_DIR
    if (-not $dataDir) {
        if ($env:LOCALAPPDATA) {
            $dataDir = Join-Path $env:LOCALAPPDATA 'Rapkumer-data'
        } else {
            $dataDir = Join-Path (Get-Location).Path 'data'
        }
    }

    $originsFile = Join-Path $dataDir 'csrf-origins.txt'
    Write-DebugLog "Resolved dataDir: $dataDir, originsFile: $originsFile"

    # Read existing file entries (if any) and merge
    $existing = @()
    if (Test-Path $originsFile) {
        try {
            $rawExisting = Get-Content -Path $originsFile -ErrorAction Stop -Raw
            $existing = $rawExisting -split '[,\n\r]+' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
        } catch {
            Write-DebugLog "Failed to read existing origins file: $_"
            $existing = @()
        }
    }

    $merged = @($existing + $uniqueOrigins) | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' } | Sort-Object -Unique

    # Ensure both http and https scheme variants exist for host:port entries so
    # runtime requests over either scheme are accepted. For example, if file had
    # http://10.0.0.1:3000, also create https://10.0.0.1:3000 (and vice versa).
    $schemeVariants = New-Object System.Collections.Generic.List[string]
    foreach ($o in $merged) {
        if ($o -match '^http://([^/:]+):(\d+)$') {
            $host = $Matches[1]
            $port = $Matches[2]
            $v = "https://${host}:${port}"
            if (-not ($merged -contains $v) -and -not ($schemeVariants -contains $v)) { $schemeVariants.Add($v) }
        } elseif ($o -match '^https://([^/:]+):(\d+)$') {
            $host = $Matches[1]
            $port = $Matches[2]
            $v = "http://${host}:${port}"
            if (-not ($merged -contains $v) -and -not ($schemeVariants -contains $v)) { $schemeVariants.Add($v) }
        }
    }
    if ($schemeVariants.Count -gt 0) {
        $merged = @($merged + $schemeVariants) | Sort-Object -Unique
    }

    # Only write if there are IPv4-derived origins to add or file missing
    if ($merged.Count -gt 0) {
        try {
            New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
            $tmp = "$originsFile.tmp"
            ($merged -join ',') | Out-File -FilePath $tmp -Encoding utf8
            Move-Item -Path $tmp -Destination $originsFile -Force
            Write-DebugLog "Wrote merged origins to ${originsFile}: $($merged -join ',')"
        } catch {
            Write-DebugLog "Failed to write origins file: $_"
        }
    }
} catch {
    Write-DebugLog "Failed to merge/write csrf-origins file: $_"
}

# Output comma-separated list for caller (start-rapkumer.cmd will capture this and set env)
Write-Output ($uniqueOrigins -join ',')
