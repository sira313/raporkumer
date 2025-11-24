@echo off
REM Wrapper to run migrations against the installed Rapkumer-data DB
SETLOCAL
if not defined LOCALAPPDATA (
  echo LOCALAPPDATA not defined. Exiting.
  exit /b 1
)

set DBFILE=%LOCALAPPDATA%\Rapkumer-data\database.sqlite3
set "DB_URL=file:%DBFILE%"

echo Using DB: %DBFILE%

REM Locate node.exe. Try PATH first, then several common install locations
set "NODE_PATH="
where node >nul 2>&1
if not errorlevel 1 (
  for /f "delims=" %%i in ('where node') do set "NODE_PATH=%%i" & goto :_node_found
)

:: Check common Node.js installation locations
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_PATH=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_PATH if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_PATH=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE_PATH if exist "%USERPROFILE%\AppData\Local\Programs\nodejs\node.exe" set "NODE_PATH=%USERPROFILE%\AppData\Local\Programs\nodejs\node.exe"
if not defined NODE_PATH if defined NVM_HOME if exist "%NVM_HOME%\node.exe" set "NODE_PATH=%NVM_HOME%\node.exe"
if not defined NODE_PATH if defined NVM_SYMLINK if exist "%NVM_SYMLINK%\node.exe" set "NODE_PATH=%NVM_SYMLINK%\node.exe"

:_node_found
if defined NODE_PATH (
  echo Found Node at %NODE_PATH%
) else (
  echo Node.js not found in PATH. Please install Node or run this from an environment with node available.
  pause
  exit /b 1
)

pushd %~dp0
if not exist scripts (mkdir scripts)
:: Attempt a lightweight pre-check using sqlite3.exe (if available) to add missing columns
where sqlite3 >nul 2>&1
if not errorlevel 1 (
  echo sqlite3 found in PATH - running quick column checks...
  :: Check tasks.sekolah_id
  sqlite3 "%DBFILE%" "PRAGMA table_info('tasks');" | findstr /R /C:"sekolah_id" >nul 2>&1
  if errorlevel 1 (
    echo Adding column tasks.sekolah_id
    sqlite3 "%DBFILE%" "ALTER TABLE \"tasks\" ADD COLUMN \"sekolah_id\" INTEGER;"
  ) else (
    echo Column tasks.sekolah_id already present
  )

  :: Check kelas.sekolah_id
  sqlite3 "%DBFILE%" "PRAGMA table_info('kelas');" | findstr /R /C:"sekolah_id" >nul 2>&1
  if errorlevel 1 (
    echo Adding column kelas.sekolah_id
    sqlite3 "%DBFILE%" "ALTER TABLE \"kelas\" ADD COLUMN \"sekolah_id\" INTEGER;"
  ) else (
    echo Column kelas.sekolah_id already present
  )

  :: Check mata_pelajaran.kelas_id
  sqlite3 "%DBFILE%" "PRAGMA table_info('mata_pelajaran');" | findstr /R /C:"kelas_id" >nul 2>&1
  if errorlevel 1 (
    echo Adding column mata_pelajaran.kelas_id
    sqlite3 "%DBFILE%" "ALTER TABLE \"mata_pelajaran\" ADD COLUMN \"kelas_id\" INTEGER;"
  ) else (
    echo Column mata_pelajaran.kelas_id already present
  )
) else (
  echo sqlite3 not found in PATH - will rely on Node-side checks in migrate-installed-db.mjs
)

:: Run Node migration script (this still performs its own checks/fallbacks)
:: Ensure DB_URL is available to Node child processes and run index-fix first to avoid drizzle errors
echo Running Node maintenance scripts with DB_URL=%DB_URL%
:: Run fix-drizzle-indexes first (safer if drizzle push would otherwise fail on duplicate indexes)
if exist "%~dp0scripts\fix-drizzle-indexes.mjs" (
  "%NODE_PATH%" "%~dp0scripts\fix-drizzle-indexes.mjs"
) else (
  "%NODE_PATH%" "%~dp0..\scripts\fix-drizzle-indexes.mjs" 2>nul || "%NODE_PATH%" "scripts\fix-drizzle-indexes.mjs" 2>nul || echo fix-drizzle-indexes.mjs not found; skipping
)

:: Then run the migrate-installed-db wrapper which will run drizzle push and additional checks
if exist "%~dp0scripts\migrate-installed-db.mjs" (
  "%NODE_PATH%" "%~dp0scripts\migrate-installed-db.mjs"
) else (
  "%NODE_PATH%" "%~dp0..\scripts\migrate-installed-db.mjs" 2>nul || "%NODE_PATH%" "scripts\migrate-installed-db.mjs" 2>nul || echo migrate-installed-db.mjs not found; skipping
)
popd

echo Done.
pause
