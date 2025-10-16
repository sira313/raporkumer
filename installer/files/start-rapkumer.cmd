@echo off
setlocal enabledelayedexpansion

:: === KONFIGURASI DASAR ===
set "APP_HOME=%~dp0"
if "%APP_HOME:~-1%"=="\" set "APP_HOME=%APP_HOME:~0,-1%"
if not defined PORT set "PORT=3000"
set "NODE_ENV=production"

:: === DIREKTORI DATA DAN LOG ===
set "USER_STATE_ROOT=%LOCALAPPDATA%\Rapkumer-data"
if not exist "%USER_STATE_ROOT%" mkdir "%USER_STATE_ROOT%" >nul 2>&1

set "LOG_DIR=%USER_STATE_ROOT%\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1
set "LOG_FILE=%LOG_DIR%\rapkumer.log"

set "DATA_DIR=%USER_STATE_ROOT%"
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

:: === DETEKSI ORIGIN UNTUK CSRF ===
echo [%date% %time%] Mendeteksi origin CSRF (port %PORT%)...>>"%LOG_FILE%"
set "RAPKUMER_CSRF_TRUSTED_ORIGINS="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%APP_HOME%\tools\detect-csrf-origins.ps1" -Port %PORT% -LogPath "%LOG_FILE%"`) do (
    set "RAPKUMER_CSRF_TRUSTED_ORIGINS=%%i"
)

if not defined RAPKUMER_CSRF_TRUSTED_ORIGINS (
    set "RAPKUMER_CSRF_TRUSTED_ORIGINS=http://localhost:%PORT%,http://127.0.0.1:%PORT%"
)

for /f "tokens=* delims= " %%a in ("!RAPKUMER_CSRF_TRUSTED_ORIGINS!") do set "RAPKUMER_CSRF_TRUSTED_ORIGINS=%%a"
if "!RAPKUMER_CSRF_TRUSTED_ORIGINS!"=="" set "RAPKUMER_CSRF_TRUSTED_ORIGINS=http://localhost:%PORT%,http://127.0.0.1:%PORT%"
set "DEFAULT_CSRF_ORIGINS=http://localhost:%PORT%,http://127.0.0.1:%PORT%"

if /I "!RAPKUMER_CSRF_TRUSTED_ORIGINS!"=="!DEFAULT_CSRF_ORIGINS!" (
    echo [%date% %time%] Deteksi IPv4 tambahan tidak ditemukan; memakai origin bawaan.>>"%LOG_FILE%"
) else (
    echo [%date% %time%] Deteksi IPv4 tambahan berhasil; origin non-default ikut ditambahkan.>>"%LOG_FILE%"
)

for %%O in (!RAPKUMER_CSRF_TRUSTED_ORIGINS:,= !) do (
    if /I not "%%O"=="RAPKUMER_CSRF_TRUSTED_ORIGINS:" (
        echo [%date% %time%] Origin diizinkan: %%O>>"%LOG_FILE%"
    )
)

echo Mengizinkan origin: !RAPKUMER_CSRF_TRUSTED_ORIGINS!

:: === DETEKSI NODE.JS ===
set "NODE_BINARY="

:: Coba deteksi Node.js di PATH
for /f "delims=" %%i in ('where node 2^>nul') do (
    set "NODE_BINARY=%%~fi"
    goto node_found
)

:: Coba di lokasi umum
if exist "%ProgramFiles%\nodejs\node.exe" (
    set "NODE_BINARY=%ProgramFiles%\nodejs\node.exe"
    goto node_found
)
if defined ProgramFiles(x86) (
    if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
        set "NODE_BINARY=%ProgramFiles(x86)%\nodejs\node.exe"
        goto node_found
    )
)

:: === JIKA NODE TIDAK DITEMUKAN: UNDUH & INSTALL ===
echo Node.js tidak ditemukan. Mengunduh dan menginstal Node.js LTS...
echo [%date% %time%] Node.js tidak ditemukan. Mempersiapkan unduhan otomatis...>>"%LOG_FILE%"

:: Deteksi arsitektur
set "ARCH=x64"
if /i "%PROCESSOR_ARCHITECTURE%"=="ARM64" set "ARCH=arm64"

:: Ambil versi LTS terbaru dari Node.js API
for /f "usebackq tokens=* delims=" %%v in (`powershell -NoProfile -Command "(Invoke-RestMethod 'https://nodejs.org/dist/index.json' | Where-Object { $_.lts } | Select-Object -First 1).version"`) do set "NODE_LTS_VERSION=%%v"
if not defined NODE_LTS_VERSION set "NODE_LTS_VERSION=v22.11.0"

set "NODE_INSTALLER_URL=https://nodejs.org/dist/%NODE_LTS_VERSION%/node-%NODE_LTS_VERSION%-%ARCH%.msi"
set "NODE_INSTALLER_PATH=%TEMP%\node-%NODE_LTS_VERSION%-%ARCH%.msi"

echo [%date% %time%] Mengunduh Node.js %NODE_LTS_VERSION% (%ARCH%) dari %NODE_INSTALLER_URL%...>>"%LOG_FILE%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '%NODE_INSTALLER_URL%' -OutFile '%NODE_INSTALLER_PATH%' -UseBasicParsing" >>"%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo Gagal mengunduh Node.js. Silakan instal manual dari https://nodejs.org/en/download/.
    echo [%date% %time%] Unduhan gagal.>>"%LOG_FILE%"
    start "" "https://nodejs.org/en/download/"
    exit /b 1
)

echo [%date% %time%] Menginstal Node.js secara senyap...>>"%LOG_FILE%"
msiexec /i "%NODE_INSTALLER_PATH%" /qn /norestart >>"%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo Instalasi Node.js gagal. Silakan instal manual.
    echo [%date% %time%] Instalasi gagal.>>"%LOG_FILE%"
    goto manual_install
)

if exist "%NODE_INSTALLER_PATH%" del "%NODE_INSTALLER_PATH%" >nul 2>&1
echo [%date% %time%] Node.js %NODE_LTS_VERSION% (%ARCH%) terpasang dengan sukses.>>"%LOG_FILE%"

:: Tambahkan ke PATH
set "NODE_DEFAULT_PATH=%ProgramFiles%\nodejs\node.exe"
if exist "%NODE_DEFAULT_PATH%" (
    set "NODE_BINARY=%NODE_DEFAULT_PATH%"
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
    goto node_found
)

if defined ProgramFiles(x86) (
    set "NODE_DEFAULT_PATH_X86=%ProgramFiles(x86)%\nodejs\node.exe"
    if exist "%NODE_DEFAULT_PATH_X86%" (
        set "NODE_BINARY=%NODE_DEFAULT_PATH_X86%"
        set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
        goto node_found
    )
)

:manual_install
echo Node.js belum dapat dipasang otomatis.
echo [%date% %time%] Node.js tetap tidak ditemukan. Membuka laman unduhan manual...>>"%LOG_FILE%"
start "" "https://nodejs.org/en/download/"
exit /b 1

:node_found
echo [%date% %time%] Node.js ditemukan di: %NODE_BINARY%>>"%LOG_FILE%"

:: === JALANKAN RAPKUMER ===
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
:: Try to resolve node via bundled resolver if NODE_BINARY wasn't set earlier
if not defined NODE_BINARY (
    for /f "usebackq delims=" %%N in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%APP_HOME%\tools\resolve-node.ps1" -BundledNodePath "%ProgramFiles%\nodejs\node.exe"`) do (
        set "NODE_BINARY=%%N"
    )
    if not defined NODE_BINARY (
        echo [%date% %time%] start-rapkumer.cmd: NODE_BINARY masih belum ditemukan setelah resolve-node.ps1>>"%LOG_FILE%"
    ) else (
        echo [%date% %time%] start-rapkumer.cmd: NODE_BINARY resolved via script: %NODE_BINARY%>>"%LOG_FILE%"
    )
)

:: Launch runner script in a detached hidden cmd process and wait for server to listen
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath cmd.exe -ArgumentList '/c', '""%RUNNER_SCRIPT%""' -WindowStyle Hidden -WorkingDirectory '%APP_HOME%'" >>"%LOG_FILE%" 2>&1

:: Wait for the server to start listening on the port (up to ~10 seconds)
set "WAIT_COUNT=0"
:wait_server
powershell -NoProfile -Command "try{ $c = New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1', %PORT%); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 (
    echo [%date% %time%] Server is listening on port %PORT% >> "%LOG_FILE%"
    set "LAUNCHED=1"
) else (
    set /a WAIT_COUNT+=1
    if %WAIT_COUNT% GEQ 10 (
        echo [%date% %time%] Warning: server did not respond after %WAIT_COUNT% attempts >> "%LOG_FILE%"
    ) else (
        ping 127.0.0.1 -n 2 >nul
        goto wait_server
    )
)

del "%RUNNER_SCRIPT%" >nul 2>&1
ping 127.0.0.1 -n 1 >nul
start "" "http://localhost:%PORT%"
endlocal
exit /b 0
