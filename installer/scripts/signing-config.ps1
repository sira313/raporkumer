# Code Signing Configuration for Rapkumer
# This script manages signtool paths and certificate configuration

# Detect the appropriate signtool.exe path
function Get-SignToolPath {
    # Known working path based on system check
    $knownPath = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe"
    if (Test-Path $knownPath) {
        return $knownPath
    }
    
    # Fallback to other known paths
    $fallbackPaths = @(
        "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe",
        "C:\Program Files (x86)\Windows Kits\10\App Certification Kit\signtool.exe"
    )
    
    foreach ($path in $fallbackPaths) {
        if (Test-Path $path) {
            return $path
        }
    }
    
    throw "SignTool.exe not found. Please install Windows SDK."
}

# Certificate configuration
$CertConfig = @{
    # Certificate store options (if using certificate store)
    StoreName = "My"  # Personal certificate store
    UseUserStore = $false  # Use machine store by default
    
    # PFX file options (if using PFX file)
    PfxPath = "$PSScriptRoot\..\cert\codesign.pfx"
    PasswordFile = "$PSScriptRoot\..\cert\password.txt"
    
    # Subject name search (if using certificate store)
    SubjectName = "Rapkumer"  # Adjust this to match your certificate
    
    # Timestamping
    TimestampUrl = "http://timestamp.digicert.com"
    TimestampAlgorithm = "SHA256"
    
    # File digest algorithm
    DigestAlgorithm = "SHA256"
    
    # Description for signed files
    Description = "Rapor Kurikulum Merdeka"
    DescriptionUrl = "https://github.com/sira313/raporkumer"
}

# Get the signing command based on available certificate
function Get-SignCommand {
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,
        
        [string]$SignToolPath = (Get-SignToolPath)
    )
    
    $baseArgs = @(
        "sign"
        "/fd", $CertConfig.DigestAlgorithm
        "/tr", $CertConfig.TimestampUrl
        "/td", $CertConfig.TimestampAlgorithm
        "/d", "`"$($CertConfig.Description)`""
        "/du", $CertConfig.DescriptionUrl
        "/v"  # Verbose output
    )
    
    # Check if PFX file exists and has password
    if ((Test-Path $CertConfig.PfxPath) -and (Test-Path $CertConfig.PasswordFile)) {
        Write-Host "Using PFX certificate: $($CertConfig.PfxPath)" -ForegroundColor Green
        $password = Get-Content $CertConfig.PasswordFile -Raw
        $baseArgs += @("/f", "`"$($CertConfig.PfxPath)`"", "/p", $password.Trim())
    }
    # Check if certificate is in store
    elseif ($CertConfig.SubjectName) {
        Write-Host "Using certificate store with subject: $($CertConfig.SubjectName)" -ForegroundColor Green
        $baseArgs += @("/n", $CertConfig.SubjectName)
        if (-not $CertConfig.UseUserStore) {
            $baseArgs += "/sm"  # Use machine store
        }
        $baseArgs += "/a"  # Automatically select best certificate
    }
    else {
        throw "No certificate configuration found. Please setup either PFX file or certificate store."
    }
    
    $baseArgs += "`"$FilePath`""
    
    return @{
        Tool = $SignToolPath
        Arguments = $baseArgs
    }
}

# Verify if certificate is available
function Test-CertificateAvailable {
    try {
        if ((Test-Path $CertConfig.PfxPath) -and (Test-Path $CertConfig.PasswordFile)) {
            Write-Host "[OK] PFX certificate file found" -ForegroundColor Green
            return $true
        }
        
        # Check certificate store
        $store = if ($CertConfig.UseUserStore) { "CurrentUser" } else { "LocalMachine" }
        $certs = Get-ChildItem -Path "Cert:\$store\$($CertConfig.StoreName)" | 
                Where-Object { $_.Subject -like "*$($CertConfig.SubjectName)*" -and $_.HasPrivateKey }
        
        if ($certs) {
            Write-Host "[OK] Certificate found in store: $($certs[0].Subject)" -ForegroundColor Green
            return $true
        }
        
        Write-Warning "No suitable certificate found"
        return $false
    }
    catch {
        Write-Warning "Error checking certificate availability: $($_.Exception.Message)"
        return $false
    }
}

# Functions are automatically available when dot-sourced