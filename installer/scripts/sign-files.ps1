# Code Signing Script for Rapkumer
# Signs executables and installer files using Windows signtool
param(
    [Parameter(Mandatory = $false)]
    [string[]]$FilesToSign,
    
    [Parameter(Mandatory = $false)]
    [switch]$SignInstaller,
    
    [Parameter(Mandatory = $false)]
    [switch]$SignExecutables,
    
    [Parameter(Mandatory = $false)]
    [switch]$VerifyOnly,
    
    [Parameter(Mandatory = $false)]
    [switch]$Force
)

# Import configuration
. "$PSScriptRoot\signing-config.ps1"

function Write-ColorMessage {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Sign-File {
    param(
        [Parameter(Mandatory)]
        [string]$FilePath
    )
    
    if (-not (Test-Path $FilePath)) {
        Write-ColorMessage "[ERROR] File not found: $FilePath" "Red"
        return $false
    }
    
    try {
        # Try each configured timestamp server (if any) until sign succeeds
        $timestampList = @()
        if ($CertConfig.ContainsKey('TimestampUrls') -and $CertConfig.TimestampUrls.Count -gt 0) {
            $timestampList = $CertConfig.TimestampUrls
        } elseif ($CertConfig.ContainsKey('TimestampUrl')) {
            $timestampList = @($CertConfig.TimestampUrl)
        }

        if ($timestampList.Count -eq 0) {
            # Ensure at least a null entry so Get-SignCommand uses defaults
            $timestampList = @($null)
        }

        foreach ($ts in $timestampList) {
            $signCmd = Get-SignCommand -FilePath $FilePath -TimestampUrl $ts
            Write-ColorMessage "[SIGNING] Signing: $(Split-Path $FilePath -Leaf)" "Yellow"
            Write-ColorMessage "   Tool: $($signCmd.Tool)" "Gray"
            if ($ts) { Write-ColorMessage "   Timestamp: $ts" "Gray" }

            # Run signtool and capture output
            $args = $signCmd.Arguments
            try {
                $output = & $signCmd.Tool @args 2>&1
            }
            catch {
                $output = $_.Exception.Message
            }
            $exit = $LASTEXITCODE

            if ($exit -eq 0) {
                Write-ColorMessage "[OK] Successfully signed: $(Split-Path $FilePath -Leaf)" "Green"
                return $true
            }

            # If timestamp server issue, try next server
            $outStr = ($output -join "`n") -as [string]
            if ($outStr -match "timestamp server|could not be reached|invalid response|time-stamp|timestamp" -or $exit -eq 1) {
                Write-ColorMessage "   [WARN] Timestamp or network issue detected, trying next timestamp server if available..." "Yellow"
                Write-ColorMessage "   signtool exit code: $exit" "Yellow"
                Write-ColorMessage "   signtool output: $outStr" "Yellow"
                continue
            }

            # Non-recoverable error, print output and fail
            Write-ColorMessage "[ERROR] Failed to sign: $(Split-Path $FilePath -Leaf)" "Red"
            Write-ColorMessage "   Exit code: $exit" "Red"
            Write-ColorMessage "   signtool output: $outStr" "Red"
            return $false
        }

        # If loop completed without returning success, final failure
        Write-ColorMessage "[ERROR] All timestamp servers failed for: $(Split-Path $FilePath -Leaf)" "Red"
        return $false
    }
    catch {
        Write-ColorMessage "[ERROR] Error signing file: $($_.Exception.Message)" "Red"
        return $false
    }
}

function Verify-Signature {
    param(
        [Parameter(Mandatory)]
        [string]$FilePath
    )
    
    if (-not (Test-Path $FilePath)) {
        Write-ColorMessage "[ERROR] File not found: $FilePath" "Red"
        return $false
    }
    
    try {
        $signTool = Get-SignToolPath
        $process = Start-Process -FilePath $signTool -ArgumentList @("verify", "/pa", "/v", $FilePath) -Wait -PassThru -NoNewWindow
        
        if ($process.ExitCode -eq 0) {
            Write-ColorMessage "[OK] Valid signature: $(Split-Path $FilePath -Leaf)" "Green"
            return $true
        } else {
            Write-ColorMessage "[ERROR] Invalid signature: $(Split-Path $FilePath -Leaf)" "Red"
            Write-ColorMessage "   Exit code: $($process.ExitCode)" "Red"
            return $false
        }
    }
    catch {
        Write-ColorMessage "[ERROR] Error verifying signature: $($_.Exception.Message)" "Red"
        return $false
    }
}

function Get-FilesToProcess {
    $files = @()
    
    # Base directory paths
    $projectRoot = Resolve-Path "$PSScriptRoot\..\.."
    $distPath = "$projectRoot\dist\windows"
    $stagePath = "$distPath\stage\Rapkumer"
    
    if ($SignExecutables -or (-not $FilesToSign -and -not $SignInstaller)) {
        # Sign executables in the staging area
        $executableExtensions = @('.exe', '.dll', '.msi')
        $stagingFiles = Get-ChildItem $stagePath -Recurse | 
                       Where-Object { $executableExtensions -contains $_.Extension }
        
        foreach ($file in $stagingFiles) {
            $files += $file.FullName
        }
        
        Write-ColorMessage "Found $($stagingFiles.Count) executable(s) in staging area" "Cyan"
    }
    
    if ($SignInstaller) {
        # Sign the installer
        $installerPath = "$distPath\RapkumerSetup.exe"
        if (Test-Path $installerPath) {
            $files += $installerPath
            Write-ColorMessage "Found installer to sign: $installerPath" "Cyan"
        } else {
            Write-ColorMessage "[WARNING] Installer not found: $installerPath" "Yellow"
        }
    }
    
    if ($FilesToSign) {
        # Add specific files
        foreach ($file in $FilesToSign) {
            $fullPath = if ([System.IO.Path]::IsPathRooted($file)) { $file } else { Join-Path $projectRoot $file }
            if (Test-Path $fullPath) {
                $files += $fullPath
            } else {
                Write-ColorMessage "[ERROR] Specified file not found: $fullPath" "Red"
            }
        }
    }
    
    return $files | Select-Object -Unique
}

# Main execution
Write-ColorMessage "[CODE SIGNING] Rapkumer Code Signing Script" "Cyan"
Write-ColorMessage "=============================================" "Cyan"

# Check if certificate is available
if (-not (Test-CertificateAvailable)) {
    if (-not $Force) {
        Write-ColorMessage "[ERROR] No certificate available for signing. Use -Force to skip this check." "Red"
        exit 1
    } else {
        Write-ColorMessage "[WARNING] Proceeding without certificate validation (Force mode)" "Yellow"
    }
}

# Get files to process
$filesToProcess = Get-FilesToProcess

if ($filesToProcess.Count -eq 0) {
    if ($SignExecutables -and -not $SignInstaller) {
        Write-ColorMessage "[INFO] No executable files found to sign in staging area (Node.js app)" "Cyan"
        exit 0
    } else {
        Write-ColorMessage "[ERROR] No files found to process" "Red"
        exit 1
    }
}

Write-ColorMessage "[FILES] Files to process:" "White"
foreach ($file in $filesToProcess) {
    Write-ColorMessage "   * $(Split-Path $file -Leaf)" "Gray"
}
Write-ColorMessage ""

$successCount = 0
$failCount = 0

foreach ($file in $filesToProcess) {
    if ($VerifyOnly) {
        if (Verify-Signature -FilePath $file) {
            $successCount++
        } else {
            $failCount++
        }
    } else {
        if (Sign-File -FilePath $file) {
            $successCount++
            # Verify the signature after signing
            Start-Sleep -Milliseconds 500  # Brief pause before verification
            Verify-Signature -FilePath $file | Out-Null
        } else {
            $failCount++
        }
    }
    Write-ColorMessage ""
}

# Summary
Write-ColorMessage "[SUMMARY]:" "Cyan"
Write-ColorMessage "   [OK] Success: $successCount files" "Green"
if ($failCount -gt 0) {
    Write-ColorMessage "   [ERROR] Failed: $failCount files" "Red"
    exit 1
} else {
    Write-ColorMessage "   [SUCCESS] All files processed successfully!" "Green"
    exit 0
}

# Summary
Write-ColorMessage "[Summary]:" "Cyan"
Write-ColorMessage "   [OK] Success: $successCount files" "Green"
if ($failCount -gt 0) {
    Write-ColorMessage "   [ERROR] Failed: $failCount files" "Red"
    exit 1
} else {
    Write-ColorMessage "   [SUCCESS] All files processed successfully!" "Green"
    exit 0
}