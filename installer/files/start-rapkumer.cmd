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

:: Launch Node without creating a visible window and redirect output to the log
:: Use /B to run without opening a new window and cmd /c so redirection applies to the child process
start "" /B cmd /c ""%NODE_BINARY%" build\index.js >> "%LOG_FILE%" 2>&1"

:: Optional: open default browser (set OPEN_BROWSER=0 to disable)
if not defined OPEN_BROWSER set "OPEN_BROWSER=1"
if "%OPEN_BROWSER%"=="1" (
    timeout /t 2 /nobreak >nul
    start "" "http://localhost:%PORT%"
)

endlocal
exit /b 0
