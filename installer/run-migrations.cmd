@echo off
REM Wrapper to run migrations against the installed Rapkumer-data DB
SETLOCAL
if not defined LOCALAPPDATA (
  echo LOCALAPPDATA not defined. Exiting.
  exit /b 1
)

set DBFILE=%LOCALAPPDATA%\Rapkumer-data\database.sqlite3
set DB_URL=file:%DBFILE%

echo Using DB: %DBFILE%

REM locate node.exe; assume node is in PATH
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js not found in PATH. Please install Node or run this from an environment with node available.
  pause
  exit /b 1
)

pushd %~dp0
if not exist scripts (mkdir scripts)
node scripts\migrate-installed-db.mjs
popd

echo Done.
pause
