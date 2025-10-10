#define AppName "Rapor Kurikulum Merdeka"
#define AppVersion "0.0.1"
#define StagePath "..\\dist\\windows\\stage\\Rapkumer"

[Setup]
AppId={{06E10F9F-0AD2-4F31-A64B-7C3B36F2D0D6}}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher="Rapkumer"
AppPublisherURL="https://github.com/sira313/raporkumer"
DefaultDirName={autopf}\Rapkumer
DefaultGroupName=Rapkumer
DisableProgramGroupPage=yes
OutputDir=..\dist\windows
OutputBaseFilename=RapkumerSetup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
UninstallDisplayIcon={app}\start-rapkumer.cmd
VersionInfoVersion={#AppVersion}

[Files]
Source:"{#StagePath}\\*"; DestDir:"{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Run]
Filename:"{sys}\\WindowsPowerShell\\v1.0\\powershell.exe"; Parameters:"-ExecutionPolicy Bypass -File ""{app}\\tools\\ensure-node.ps1"" -InstallDir ""{app}"""; StatusMsg:"Memastikan Node.js tersedia..."; Flags: runhidden waituntilterminated

[Icons]
Name:"{autoprograms}\\Rapkumer\\Jalankan Rapkumer"; Filename:"{app}\\start-rapkumer.cmd"; WorkingDir:"{app}"
Name:"{autodesktop}\\Rapkumer"; Filename:"{app}\\start-rapkumer.cmd"; WorkingDir:"{app}"