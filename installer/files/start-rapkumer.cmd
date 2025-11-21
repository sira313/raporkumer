@echo off
setlocal

:: Simple universal start script for Rapkumer
:: - Changes to user app dir under %LOCALAPPDATA% and starts Node in background
:: - Opens default browser to http://localhost:%PORT% (can disable with OPEN_BROWSER=0)

if not defined PORT set "PORT=3000"
set "APP_HOME=%LOCALAPPDATA%\Rapkumer"

if not exist "%APP_HOME%" (
    echo App folder not found: "%APP_HOME%"
    exit /b 1
)

:: Ensure log directory exists
set "LOG_DIR=%LOCALAPPDATA%\Rapkumer-data\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1
set "LOG_FILE=%LOG_DIR%\rapkumer.log"

:: Prefer system Node if installed, otherwise fall back to `node` on PATH
set "NODE_BINARY=node"
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_BINARY=%ProgramFiles%\nodejs\node.exe"

cd /d "%APP_HOME%"
echo [%date% %time%] Simple start: launching Rapkumer with %NODE_BINARY% >> "%LOG_FILE%"

:: Launch the Node-based launcher script (start-rapkumer.mjs) in background.
:: The JS launcher handles logging, polling for server readiness and opening the browser.
set "LAUNCHER=%APP_HOME%\start-rapkumer.mjs"
if not exist "%LAUNCHER%" (
    echo Launcher script not found: "%LAUNCHER%"
    exit /b 1
)

:: Launch the launcher using the best available Node binary
start "" /B cmd /c ""%NODE_BINARY%" "%LAUNCHER%" >> "%LOG_FILE%" 2>&1"

endlocal
exit /b 0
