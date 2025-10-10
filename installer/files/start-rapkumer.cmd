@echo off
setlocal enabledelayedexpansion

set "APP_HOME=%~dp0"
if "%APP_HOME:~-1%"=="\" set "APP_HOME=%APP_HOME:~0,-1%"
if not defined PORT set "PORT=3000"
set "NODE_ENV=production"

set "NODE_BINARY=%APP_HOME%\runtime\node\node.exe"
if exist "%NODE_BINARY%" (
    goto node_found
)

for /f "usebackq tokens=*" %%i in (`where node 2^>nul`) do (
    set "NODE_BINARY=%%i"
    goto node_found
)

echo Node.js tidak ditemukan. Jalankan ulang pemasang atau hubungi administrator.
exit /b 1

:node_found
cd /d "%APP_HOME%"
set "LOG_DIR=%APP_HOME%\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1
set "LOG_FILE=%LOG_DIR%\rapkumer.log"

echo Menjalankan Rapkumer pada http://localhost:%PORT%
start "Rapkumer Server" cmd /c "\"%NODE_BINARY%\" build\index.js >>\"%LOG_FILE%\" 2^>^&1"
ping 127.0.0.1 -n 4 >nul
start "" "http://localhost:%PORT%"

endlocal
exit /b 0
