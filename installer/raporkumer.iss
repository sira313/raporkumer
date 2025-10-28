#define AppName "Rapor Kurikulum Merdeka"
#define AppVersion "0.3.2"
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
UninstallDisplayIcon={app}\start-rapkumer.cmd
VersionInfoVersion={#AppVersion}
SetupIconFile={#StagePath}\rapkumer.ico
; Code signing configuration (commented out by default)
; Uncomment and configure these lines if you want Inno Setup to sign the installer
; SignTool=custom "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe" sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /d "Rapor Kurikulum Merdeka Installer" /f "installer\cert\codesign.pfx" /p "YOUR_PASSWORD" $f
; SignedUninstaller=yes

[Files]
Source:"{#StagePath}\\*"; DestDir:"{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Run]
Filename:"{sys}\\WindowsPowerShell\\v1.0\\powershell.exe"; Parameters:"-ExecutionPolicy Bypass -File ""{app}\\tools\\ensure-node.ps1"" -InstallDir ""{app}"""; StatusMsg:"Memastikan Node.js tersedia..."; Flags: runhidden waituntilterminated
Filename:"{sys}\\WindowsPowerShell\\v1.0\\powershell.exe"; Parameters:"-ExecutionPolicy Bypass -File ""{app}\\tools\\run-migrations.ps1"" -InstallDir ""{app}"""; StatusMsg:"Menjalankan migrasi database (drizzle-kit) pada mesin ini..."; Flags: runhidden waituntilterminated

[Icons]
Name:"{autoprograms}\\Rapkumer\\Rapkumer"; Filename:"{app}\\start-rapkumer.cmd"; WorkingDir:"{app}"; IconFilename:"{app}\\rapkumer.ico"
Name:"{autodesktop}\\Rapkumer"; Filename:"{app}\\start-rapkumer.cmd"; WorkingDir:"{app}"; IconFilename:"{app}\\rapkumer.ico"