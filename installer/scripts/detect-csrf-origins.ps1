param(
    [int]$Port = 3000,
    [string]$LogPath
)

$ErrorActionPreference = 'SilentlyContinue'

$portString = if ($Port -gt 0) { $Port } else { 3000 }
$origins = @("http://localhost:$portString", "http://127.0.0.1:$portString")
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
    $ipv4.Add($Value)
    Write-DebugLog "Captured IPv4 candidate $Value"
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
    $preferredIpv4 = $uniqueIpv4 | Where-Object { $_ -match '^(192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)' }
    Write-DebugLog "Unique IPv4 collected: $($uniqueIpv4 -join ', ')"
    if ($preferredIpv4.Count -gt 0) {
        $validIpv4 = $preferredIpv4
        Write-DebugLog "Preferred IPv4 selected: $($validIpv4 -join ', ')"
    } else {
        $validIpv4 = $uniqueIpv4 | Where-Object { $_ -notmatch '^10\.' }
        Write-DebugLog "Validated IPv4 (fallback) selected: $($validIpv4 -join ', ')"
    }
}

if ($validIpv4.Count -gt 0) {
    $validOrigins = $validIpv4 | ForEach-Object { 'http://' + $_ + ':' + $portString }
    $origins += $validOrigins
    Write-DebugLog "Final origin list: $($origins -join ', ')"
} else {
    Write-DebugLog 'No additional IPv4 detected; using default origins only'
}

$uniqueOrigins = $origins | Where-Object { $_ } | Sort-Object -Unique
Write-Output ($uniqueOrigins -join ',')
