# Setup dan Validasi Environment untuk Code Signing
# Script ini membantu mengecek apakah environment siap untuk code signing

param(
    [Parameter(Mandatory = $false)]
    [switch]$Setup,
    
    [Parameter(Mandatory = $false)]
    [switch]$CreateSelfSigned,
    
    [Parameter(Mandatory = $false)]
    [switch]$Force
)

# Import configuration
. "$PSScriptRoot\signing-config.ps1"

function Write-StatusMessage {
    param([string]$Message, [string]$Status, [string]$Color = "White")
    $statusIcon = switch ($Status) {
        "OK" { "[OK]" }
        "WARNING" { "[WARN]" }
        "ERROR" { "[ERROR]" }
        "INFO" { "[INFO]" }
        default { "*" }
    }
    Write-Host "$statusIcon $Message" -ForegroundColor $Color
}

function Test-SigningEnvironment {
    Write-Host "[CHECKING] Code Signing Environment" -ForegroundColor Cyan
    Write-Host "====================================" -ForegroundColor Cyan
    Write-Host ""
    
    $issues = 0
    
    # Check SignTool availability
    try {
        $signToolPath = Get-SignToolPath
        Write-StatusMessage "SignTool found: $signToolPath" "OK" "Green"
    }
    catch {
        Write-StatusMessage "SignTool not found: $($_.Exception.Message)" "ERROR" "Red"
        $issues++
    }
    
    # Check certificate availability
    if (Test-CertificateAvailable) {
        Write-StatusMessage "Certificate available for signing" "OK" "Green"
    } else {
        Write-StatusMessage "No certificate available for signing" "WARNING" "Yellow"
        Write-StatusMessage "  • Check if PFX file exists: $($CertConfig.PfxPath)" "INFO" "Gray"
        Write-StatusMessage "  • Check if password file exists: $($CertConfig.PasswordFile)" "INFO" "Gray"
        Write-StatusMessage "  • Or configure certificate store settings" "INFO" "Gray"
        $issues++
    }
    
    # Check directories
    $projectRoot = Resolve-Path "$PSScriptRoot\..\.."
    $certDir = "$projectRoot\installer\cert"
    $distDir = "$projectRoot\dist\windows"
    
    if (Test-Path $certDir) {
        Write-StatusMessage "Certificate directory exists: $certDir" "OK" "Green"
    } else {
        Write-StatusMessage "Certificate directory missing: $certDir" "WARNING" "Yellow"
        if ($Setup) {
            New-Item -ItemType Directory -Path $certDir -Force | Out-Null
            Write-StatusMessage "Created certificate directory" "OK" "Green"
        }
    }
    
    # Check for existing signed files
    if (Test-Path $distDir) {
        Write-StatusMessage "Distribution directory exists: $distDir" "OK" "Green"
        
        $signedFiles = Get-ChildItem $distDir -Recurse -Include "*.exe", "*.dll" -ErrorAction SilentlyContinue
        if ($signedFiles.Count -gt 0) {
            Write-StatusMessage "Found $($signedFiles.Count) executable file(s) to potentially sign" "INFO" "Cyan"
        }
    } else {
        Write-StatusMessage "Distribution directory not found (run build first): $distDir" "INFO" "Gray"
    }
    
    Write-Host ""
    if ($issues -eq 0) {
        Write-StatusMessage "Environment is ready for code signing!" "OK" "Green"
        return $true
    } else {
        Write-StatusMessage "Found $issues issue(s) that need attention" "WARNING" "Yellow"
        return $false
    }
}

function New-SelfSignedCodeSigningCert {
    Write-Host "[CERT] Creating Self-Signed Code Signing Certificate" -ForegroundColor Cyan
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-StatusMessage "WARNING: Self-signed certificates are for TESTING only!" "WARNING" "Yellow"
    Write-StatusMessage "Production should use certificates from trusted CA" "WARNING" "Yellow"
    Write-Host ""
    
    if (-not $Force) {
        $confirmation = Read-Host "Continue with self-signed certificate creation? (y/N)"
        if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
            Write-StatusMessage "Cancelled by user" "INFO" "Gray"
            return
        }
    } else {
        Write-StatusMessage "Force mode: Creating certificate automatically" "INFO" "Cyan"
    }
    
    try {
        # Generate self-signed certificate
        $cert = New-SelfSignedCertificate `
            -Type CodeSigningCert `
            -Subject "CN=Apoxicam, E=me@apoxi.cam, O=Rapkumer, C=ID" `
            -KeyAlgorithm RSA `
            -KeyLength 2048 `
            -Provider "Microsoft Enhanced RSA and AES Cryptographic Provider" `
            -KeyExportPolicy Exportable `
            -KeyUsage DigitalSignature `
            -NotAfter (Get-Date).AddYears(5) `
            -CertStoreLocation "Cert:\CurrentUser\My"
        
        Write-StatusMessage "Certificate created: $($cert.Subject)" "OK" "Green"
        Write-StatusMessage "Thumbprint: $($cert.Thumbprint)" "INFO" "Gray"
        
        # Export to PFX
        $password = "rapkumer-dev-2024"
        $securePassword = ConvertTo-SecureString -String $password -Force -AsPlainText
        $pfxPath = $CertConfig.PfxPath
        
        # Ensure directory exists
        $certDir = Split-Path $pfxPath -Parent
        if (-not (Test-Path $certDir)) {
            New-Item -ItemType Directory -Path $certDir -Force | Out-Null
        }
        
        Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePassword | Out-Null
        Write-StatusMessage "Certificate exported to: $pfxPath" "OK" "Green"
        
        # Save password
        $password | Out-File -FilePath $CertConfig.PasswordFile -Encoding UTF8 -NoNewline
        Write-StatusMessage "Password saved to: $($CertConfig.PasswordFile)" "OK" "Green"
        
        Write-Host ""
        Write-StatusMessage "Self-signed certificate setup complete!" "OK" "Green"
        Write-StatusMessage "You can now use 'pnpm prod:signed' for testing" "INFO" "Cyan"
        
        # Add to trusted root (optional)
        $addToRoot = Read-Host "Add certificate to Trusted Root store? (y/N)"
        if ($addToRoot -eq 'y' -or $addToRoot -eq 'Y') {
            $rootStore = Get-Item "Cert:\CurrentUser\Root"
            $rootStore.Open("ReadWrite")
            $rootStore.Add($cert)
            $rootStore.Close()
            Write-StatusMessage "Certificate added to Trusted Root store" "OK" "Green"
        }
    }
    catch {
        Write-StatusMessage "Error creating certificate: $($_.Exception.Message)" "ERROR" "Red"
    }
}

# Main execution
if ($CreateSelfSigned) {
    New-SelfSignedCodeSigningCert
} else {
    $isReady = Test-SigningEnvironment
    
    if (-not $isReady -and $Setup) {
        Write-Host ""
        Write-Host "[SETUP] Setup Suggestions:" -ForegroundColor Yellow
        Write-Host "• Run with -CreateSelfSigned to create a test certificate" -ForegroundColor Gray
        Write-Host "• Or place your production certificate at: $($CertConfig.PfxPath)" -ForegroundColor Gray
        Write-Host "• And create password file at: $($CertConfig.PasswordFile)" -ForegroundColor Gray
    }
}