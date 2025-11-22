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
Source:"{#StagePath}\\scripts\\start-with-dotenv.mjs"; DestDir:"{app}\\scripts"; Flags: ignoreversion
Source:"{#StagePath}\\tools\\create-desktop-shortcut.ps1"; DestDir:"{app}\\tools"; Flags: ignoreversion

[Run]
Filename:"{sys}\\WindowsPowerShell\\v1.0\\powershell.exe"; Parameters:"-ExecutionPolicy Bypass -File ""{app}\\tools\\ensure-node.ps1"" -InstallDir ""{app}"""; StatusMsg:"Memastikan Node.js tersedia..."; Flags: runhidden waituntilterminated
Filename:"{sys}\\WindowsPowerShell\\v1.0\\powershell.exe"; Parameters:"-ExecutionPolicy Bypass -File ""{app}\\tools\\run-migrations.ps1"" -InstallDir ""{app}"""; StatusMsg:"Menjalankan migrasi database (drizzle-kit) pada mesin ini..."; Flags: runhidden waituntilterminated
Filename:"{sys}\\WindowsPowerShell\\v1.0\\powershell.exe"; Parameters:"-ExecutionPolicy Bypass -File ""{app}\\tools\\create-desktop-shortcut.ps1"" -InstallDir ""{app}"""; StatusMsg:"Membuat shortcut desktop Rapkumer..."; Flags: runhidden waituntilterminated

[Icons]
; Start Menu and Desktop shortcuts are created post-install by create-desktop-shortcut.ps1
; (This ensures the bundled Node runtime exists before creating shortcuts.)

[Code]
procedure CreateDotEnv();
var
	EnvPath, DBPath, S: String;
	Lines: TStringList;
begin
	EnvPath := ExpandConstant('{app}\.env');
	DBPath := 'file:' + ExpandConstant('{localappdata}\Rapkumer-data\database.sqlite3');

	{ If file does not exist, create a new .env with quoted DB_URL and BODY_SIZE_LIMIT }
	if not FileExists(EnvPath) then
	begin
		S := 'DB_URL="' + DBPath + '"' + #13#10 + 'BODY_SIZE_LIMIT=5M' + #13#10;
		if not SaveStringToFile(EnvPath, S, False) then
			MsgBox('Gagal membuat file .env di ' + EnvPath, mbError, MB_OK);
		exit;
	end;

	{ File exists: load and ensure required keys are present (append if missing).
	  We keep this simple: if a key is missing we append a correct version.
	  This avoids overwriting user customizations while ensuring required vars exist. }
	Lines := TStringList.Create;
	try
		Lines.LoadFromFile(EnvPath);
		S := Lines.Text;
	finally
		Lines.Free;
	end;

	{ Ensure DB_URL exists and is quoted. If there is no DB_URL at all, append one.
	  If DB_URL exists but is not quoted, append a quoted DB_URL (user can remove the unquoted one). }
	if Pos('DB_URL=', S) = 0 then
		S := S + 'DB_URL="' + DBPath + '"' + #13#10
	else if Pos('DB_URL="', S) = 0 then
		S := S + 'DB_URL="' + DBPath + '"' + #13#10;

	{ Ensure BODY_SIZE_LIMIT exists }
	if Pos('BODY_SIZE_LIMIT=', S) = 0 then
		S := S + 'BODY_SIZE_LIMIT=5M' + #13#10;

	if not SaveStringToFile(EnvPath, S, False) then
		MsgBox('Gagal memperbarui file .env di ' + EnvPath, mbError, MB_OK);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
	if CurStep = ssPostInstall then
		CreateDotEnv();
end;