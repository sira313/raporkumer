@echo off
setlocal enabledelayedexpansion

set "APP_HOME=%~dp0"
if "%APP_HOME:~-1%"=="\" set "APP_HOME=%APP_HOME:~0,-1%"
if not defined PORT set "PORT=3000"
set "NODE_ENV=production"

set "USER_STATE_ROOT=%LOCALAPPDATA%\Rapkumer"
if not exist "%USER_STATE_ROOT%" mkdir "%USER_STATE_ROOT%" >nul 2>&1

set "LOG_DIR=%USER_STATE_ROOT%\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1
set "LOG_FILE=%LOG_DIR%\rapkumer.log"

set "DATA_DIR=%USER_STATE_ROOT%\data"
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%" >nul 2>&1

set "DB_FILE=%DATA_DIR%\database.sqlite3"
if not exist "%DB_FILE%" (
    echo [%date% %time%] Menyalin basis data awal ke direktori pengguna...>>"%LOG_FILE%"
    if exist "%APP_HOME%\data\database.sqlite3" (
        copy /y "%APP_HOME%\data\database.sqlite3" "%DB_FILE%" >nul 2>&1
    ) else (
        echo [%date% %time%] Peringatan: file database sumber tidak ditemukan di "%APP_HOME%\data\database.sqlite3".>>"%LOG_FILE%"
    )
)

set "DB_URL=file:%DB_FILE:\=/%"
set "DATABASE_URL=%DB_URL%"

for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%APP_HOME%\tools\detect-csrf-origins.ps1" -Port %PORT%`) do (
    set "RAPKUMER_CSRF_TRUSTED_ORIGINS=%%i"
)
if not defined RAPKUMER_CSRF_TRUSTED_ORIGINS (
    set "RAPKUMER_CSRF_TRUSTED_ORIGINS=http://localhost:%PORT%,http://127.0.0.1:%PORT%"
)
for /f "tokens=* delims= " %%a in ("!RAPKUMER_CSRF_TRUSTED_ORIGINS!") do set "RAPKUMER_CSRF_TRUSTED_ORIGINS=%%a"
if "!RAPKUMER_CSRF_TRUSTED_ORIGINS!"=="" set "RAPKUMER_CSRF_TRUSTED_ORIGINS=http://localhost:%PORT%,http://127.0.0.1:%PORT%"
echo Mengizinkan origin: !RAPKUMER_CSRF_TRUSTED_ORIGINS!

set "NODE_BINARY="

for /f "delims=" %%i in ('node --version 2^>nul') do (
    set "NODE_BINARY=node.exe"
    goto node_found
)

for /f "usebackq delims=" %%i in (
    `powershell -NoProfile -ExecutionPolicy Bypass -File "%APP_HOME%\tools\resolve-node.ps1"`
) do (
    set "NODE_BINARY=%%i"
    goto node_found
)

echo Node.js belum terpasang di komputer ini. Mencoba menginstal Node.js LTS melalui winget...
echo [%date% %time%] Node.js tidak ditemukan pada PATH. Menjalankan winget install OpenJS.NodeJS.LTS.>>"%LOG_FILE%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "winget install --id OpenJS.NodeJS.LTS --source winget --accept-package-agreements --accept-source-agreements" >>"%LOG_FILE%" 2>&1

for /f "delims=" %%i in ('node --version 2^>nul') do (
    set "NODE_BINARY=node.exe"
    goto node_found
)

for /f "usebackq delims=" %%i in (
    `powershell -NoProfile -ExecutionPolicy Bypass -File "%APP_HOME%\tools\resolve-node.ps1"`
) do (
    set "NODE_BINARY=%%i"
    goto node_found
)

echo Node.js belum terpasang. Unduh secara manual dari https://nodejs.org/en/download, lalu jalankan ulang Rapkumer.
echo [%date% %time%] Node.js tetap tidak ditemukan setelah mencoba instalasi otomatis.>>"%LOG_FILE%"
start "" "https://nodejs.org/en/download"
exit /b 1

:node_found

cd /d "%APP_HOME%"

echo Menjalankan Rapkumer pada http://localhost:%PORT%
echo [%date% %time%] Starting Rapkumer using "%NODE_BINARY%" on port %PORT% dengan DB_URL=%DB_URL% dan origins !RAPKUMER_CSRF_TRUSTED_ORIGINS!>>"%LOG_FILE%"
set "RUNNER_SCRIPT=%TEMP%\rapkumer-run-%RANDOM%.cmd"
(
    echo @echo off
    echo set PORT=%PORT%
    echo set NODE_ENV=%NODE_ENV%
    echo set BODY_SIZE_LIMIT=5242880
    echo set DB_URL=%DB_URL%
    echo set DATABASE_URL=%DB_URL%
    echo set RAPKUMER_CSRF_TRUSTED_ORIGINS=!RAPKUMER_CSRF_TRUSTED_ORIGINS!
    echo call "%APP_HOME%\tools\run-server.cmd" "%NODE_BINARY%" "%APP_HOME%" %PORT% %NODE_ENV% "%DB_URL%" "!RAPKUMER_CSRF_TRUSTED_ORIGINS!" "%LOG_FILE%"
) >"%RUNNER_SCRIPT%"
echo [%date% %time%] Runner script created at %RUNNER_SCRIPT%>>"%LOG_FILE%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath cmd.exe -ArgumentList '/c', '""%RUNNER_SCRIPT%""' -WindowStyle Hidden" >>"%LOG_FILE%" 2>&1
ping 127.0.0.1 -n 2 >nul
del "%RUNNER_SCRIPT%" >nul 2>&1
ping 127.0.0.1 -n 4 >nul
echo [%date% %time%] Opening browser window...>>"%LOG_FILE%"
start "" "http://localhost:%PORT%"

endlocal
exit /b 0
