@echo off

:: Jika belum masuk mode WSH, tampilkan pesan dan jalankan ulang script ke mode silent
if "%~1"=="" (
    echo Sedang membuka Rapkumer...
    wscript //nologo "%~f0?.wsf" silent
    if %errorlevel% neq 0 (
        echo Gagal menjalankan Rapkumer... Periksa log di:
        echo   %localappdata%\Rapkumer-data\log\rapkumer.log
    )
    exit /b
)

:: ==========================
:: SILENT MODE VIA WSH
:: ==========================
<job>
<script language="VBScript">

On Error Resume Next

Set shell = CreateObject("WScript.Shell")
Set fso   = CreateObject("Scripting.FileSystemObject")

logPath = shell.ExpandEnvironmentStrings("%localappdata%\Rapkumer-data\log")
appPath = shell.ExpandEnvironmentStrings("%localappdata%\Rapkumer")

' Buat folder log jika belum ada
If Not fso.FolderExists(logPath) Then
    fso.CreateFolder(logPath)
End If

' Command untuk menjalankan node build (silent + redirect log)
cmd = "cmd.exe /c cd /d """ & appPath & """ && node build >> """ & logPath & "\rapkumer.log"" 2>&1"

rc = shell.Run(cmd, 0, False)

' Kalau gagal menjalankan command (misalnya path tidak ada)
If Err.Number <> 0 Then
    WScript.Quit 1
End If

' Tunggu server hidup
WScript.Sleep 1500

' Buka browser
shell.Run "http://localhost:3000"

WScript.Quit 0

</script>
</job>
