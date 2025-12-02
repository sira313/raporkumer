@echo off
REM Simple wrapper to manually run migrations against the installed Rapkumer-data DB
REM This is optional for users who want to re-run migrations after an update
REM For post-install migrations, the installer directly calls: node scripts\migrate-installed-db.mjs

SETLOCAL
setlocal enabledelayedexpansion

if not defined LOCALAPPDATA (
  echo LOCALAPPDATA not defined. Exiting.
  exit /b 1
)

set DBFILE=%LOCALAPPDATA%\Rapkumer-data\database.sqlite3
set "DB_URL=file:%DBFILE%"

echo.
echo Rapkumer Database Migration Helper
echo ===================================
echo Using DB: %DBFILE%
echo.

REM Verify database exists
if not exist "%DBFILE%" (
  echo ERROR: Database file not found at %DBFILE%
  echo Please run the Rapkumer installer first.
  pause
  exit /b 1
)

REM Locate node.exe (try PATH first, then common locations)
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js not found in PATH
  echo Please install Node.js or add it to your PATH
  pause
  exit /b 1
)

echo Running migration script...
echo.

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0

REM Try to run migrate-installed-db.mjs from scripts folder
if exist "%SCRIPT_DIR%scripts\migrate-installed-db.mjs" (
  node "%SCRIPT_DIR%scripts\migrate-installed-db.mjs"
) else (
  echo ERROR: migrate-installed-db.mjs not found in scripts folder
  echo Expected location: %SCRIPT_DIR%scripts\migrate-installed-db.mjs
  pause
  exit /b 1
)

echo.
echo Migration complete.
pause
