#define AppName "Rapor Kurikulum Merdeka"
#define AppVersion "1.1.8"
#define StagePath "..\\dist\\windows\\stage\\Rapkumer"

[Setup]
AppId={{06E10F9F-0AD2-4F31-A64B-7C3B36F2D0D6}}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher="Rapkumer"
AppPublisherURL="https://github.com/sira313/raporkumer"
AppContact="me@apoxi.cam"
; Install under the current user's Local AppData so admin privileges are not required
DefaultDirName={localappdata}\Rapkumer
DefaultGroupName=Rapkumer
DisableProgramGroupPage=yes
OutputDir=..\dist\windows
OutputBaseFilename=RapkumerSetup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; Do not require administrator privileges when installing to per-user LocalAppData
PrivilegesRequired=lowest
UninstallDisplayIcon={app}\rapkumer.ico
VersionInfoVersion={#AppVersion}
SetupIconFile={#StagePath}\rapkumer.ico
; Code signing configuration (commented out by default)
; Uncomment and configure these lines if you want Inno Setup to sign the installer
; SignTool=custom "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe" sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /d "Rapor Kurikulum Merdeka Installer" /f "installer\cert\codesign.pfx" /p "YOUR_PASSWORD" $f
; SignedUninstaller=yes

[Files]
Source:"{#StagePath}\\*"; DestDir:"{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Ensure the JS launcher and installer helper scripts are explicitly included
Source:"{#StagePath}\\start-rapkumer.mjs"; DestDir:"{app}"; Flags: ignoreversion
Source:"{#StagePath}\\tools\\create-desktop-shortcut.ps1"; DestDir:"{app}\\tools"; Flags: ignoreversion

[Run]
Filename:"{sys}\\WindowsPowerShell\\v1.0\\powershell.exe"; Parameters:"-ExecutionPolicy Bypass -File ""{app}\\tools\\ensure-node.ps1"" -InstallDir ""{app}"""; StatusMsg:"Memastikan Node.js tersedia..."; Flags: runhidden waituntilterminated
Filename:"{sys}\\WindowsPowerShell\\v1.0\\powershell.exe"; Parameters:"-ExecutionPolicy Bypass -File ""{app}\\tools\\run-migrations.ps1"" -InstallDir ""{app}"""; StatusMsg:"Menjalankan migrasi database (drizzle-kit) pada mesin ini..."; Flags: runhidden waituntilterminated
Filename:"{sys}\\WindowsPowerShell\\v1.0\\powershell.exe"; Parameters:"-ExecutionPolicy Bypass -File ""{app}\\tools\\create-desktop-shortcut.ps1"" -InstallDir ""{app}"""; StatusMsg:"Membuat shortcut desktop Rapkumer..."; Flags: runhidden waituntilterminated

[Icons]
; Start Menu and Desktop shortcuts are created post-install by create-desktop-shortcut.ps1
; (This ensures the bundled Node runtime exists before creating shortcuts.)