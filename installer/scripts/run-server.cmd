@echo off
setlocal enabledelayedexpansion

set "NODE_BINARY=%~1"
set "APP_HOME=%~2"
set "PORT=%~3"
set "NODE_ENV=%~4"
set "DB_URL=%~5"
set "RAPKUMER_CSRF_TRUSTED_ORIGINS=%~6"
set "LOG_FILE=%~7"

if not defined NODE_BINARY (
    echo [%date% %time%] run-server.cmd: NODE_BINARY belum disediakan>>"%LOG_FILE%"
    exit /b 1
)

if not defined APP_HOME (
    echo [%date% %time%] run-server.cmd: APP_HOME belum disediakan>>"%LOG_FILE%"
    exit /b 1
)

if not defined LOG_FILE (
    set "LOG_FILE=%APP_HOME%\logs\rapkumer.log"
)

if not defined PORT set "PORT=3000"
if not defined NODE_ENV set "NODE_ENV=production"
if not defined RAPKUMER_CSRF_TRUSTED_ORIGINS set "RAPKUMER_CSRF_TRUSTED_ORIGINS=http://localhost:%PORT%,http://127.0.0.1:%PORT%"

set "DATABASE_URL=%DB_URL%"

cd /d "%APP_HOME%"

echo [%date% %time%] run-server.cmd: menjalankan Node dengan PORT=%PORT% NODE_ENV=%NODE_ENV% DB_URL=%DB_URL% origins=%RAPKUMER_CSRF_TRUSTED_ORIGINS%>>"%LOG_FILE%"

"%NODE_BINARY%" build\index.js >>"%LOG_FILE%" 2>&1

set "EXITCODE=%ERRORLEVEL%"
echo [%date% %time%] run-server.cmd: Node exited with code %EXITCODE%>>"%LOG_FILE%"

endlocal
exit /b %EXITCODE%
