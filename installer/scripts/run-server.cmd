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

:: If NODE_BINARY missing at this point, try to resolve using resolver script
if not defined NODE_BINARY (
    :: Use temp file to capture resolver output to avoid parsing issues
    set "RESOLVE_NODE_OUT=%TEMP%\rapkumer-resolve-node.txt"
    if exist "%RESOLVE_NODE_OUT%" del "%RESOLVE_NODE_OUT%" >nul 2>&1
    powershell -NoProfile -ExecutionPolicy Bypass -File "%APP_HOME%\tools\resolve-node.ps1" > "%RESOLVE_NODE_OUT%" 2>nul
    if errorlevel 1 (
        pwsh -NoProfile -ExecutionPolicy Bypass -File "%APP_HOME%\tools\resolve-node.ps1" > "%RESOLVE_NODE_OUT%" 2>nul
    )
    if exist "%RESOLVE_NODE_OUT%" (
        for /f "usebackq delims=" %%N in ("%RESOLVE_NODE_OUT%") do (
            if not defined NODE_BINARY set "NODE_BINARY=%%N"
        )
        del "%RESOLVE_NODE_OUT%" >nul 2>&1
    )
    if not defined NODE_BINARY (
        echo [%date% %time%] run-server.cmd: NODE_BINARY still not found after resolver >>"%LOG_FILE%"
        exit /b 1
    ) else (
        echo [%date% %time%] run-server.cmd: NODE_BINARY resolved to %NODE_BINARY% >>"%LOG_FILE%"
    )
)

:: Check for any process listening on the configured port and attempt to stop node processes only
echo [%date% %time%] run-server.cmd: checking for existing listeners on port %PORT%>>"%LOG_FILE%"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%PORT%[ \\]"') do (
    set "CAND_PID=%%P"
    call :handle_pid %%P
)

:: Start node with simple restart attempts if it exits immediately
set "ATTEMPT=0"
set "MAX_ATTEMPTS=3"
:start_node
set /a ATTEMPT+=1
echo [%date% %time%] run-server.cmd: starting Node (attempt %ATTEMPT%) >>"%LOG_FILE%"
"%NODE_BINARY%" build\index.js >>"%LOG_FILE%" 2>&1
set "EXITCODE=%ERRORLEVEL%"
echo [%date% %time%] run-server.cmd: Node exited with code %EXITCODE% (attempt %ATTEMPT%)>>"%LOG_FILE%"
if %EXITCODE% NEQ 0 (
    if %ATTEMPT% LSS %MAX_ATTEMPTS% (
        echo [%date% %time%] run-server.cmd: retrying in 2s... >>"%LOG_FILE%"
        ping 127.0.0.1 -n 2 >nul
        goto start_node
    ) else (
        echo [%date% %time%] run-server.cmd: reached max attempts (%MAX_ATTEMPTS%), exiting. >>"%LOG_FILE%"
        exit /b %EXITCODE%
    )
) else (
    :: graceful exit with code 0
    exit /b 0
)

:handle_pid
rem %1 = PID
setlocal enabledelayedexpansion
set "PID=%~1"
for /f "usebackq tokens=1*" %%A in (`tasklist /FI "PID eq %PID%" /NH 2^>nul`) do (
    set "IMAGENAME=%%A"
)
if not defined IMAGENAME (
    endlocal & goto :eof
)
set "IMAGENAME_LOWER=!IMAGENAME:~0,100!"
set "IMAGENAME_LOWER=!IMAGENAME_LOWER: =!"
echo [%date% %time%] run-server.cmd: found PID %PID% running '!IMAGENAME!' >>"%LOG_FILE%"
if /I "!IMAGENAME_LOWER!"=="node.exe" (
    echo [%date% %time%] run-server.cmd: terminating node process PID %PID% >>"%LOG_FILE%"
    taskkill /F /PID %PID% >>"%LOG_FILE%" 2>&1
    ping 127.0.0.1 -n 2 >nul
) else (
    echo [%date% %time%] run-server.cmd: PID %PID% is not node.exe, skipping kill >>"%LOG_FILE%"
)
endlocal & goto :eof

endlocal
exit /b %EXITCODE%
