# Raporkumer

Platform rapor Kurikulum Merdeka berbasis SvelteKit dengan adapter Node.js.

## 📦 Windows Installer Workflow

Gunakan alur berikut untuk membuat paket pemasang Windows (.exe) menggunakan Inno Setup dengan dependensi produksi saja.

### Prasyarat

- Node.js 20 LTS atau lebih baru (terpasang di mesin build)
- pnpm (mengikuti lockfile yang sudah ada)
- npm (ikut terpasang bersama Node.js)
- PowerShell 5.1+
- [Inno Setup 6.3+](https://jrsoftware.org/isinfo.php) (menyediakan `ISCC.exe` untuk kompilasi skrip)

### 1. Siapkan staging build

```powershell
pnpm install
pnpm run package:win
```

Perintah di atas:

- Menjalankan `pnpm build`
- Menyalin artefak produksi (`build/`, `data/database.sqlite3`, skrip runtime)
- Menghasilkan `package.json` berisi hanya dependensi produksi
- Menjalankan `npm install --omit=dev --no-package-lock` pada staging sehingga hanya dependensi produksi yang tersertakan
- Menyalin skrip `ensure-node.ps1` untuk memeriksa / memasang Node.js LTS saat instalasi

Output akhir berada di `dist/windows/stage/Rapkumer` dan siap dipaketkan.

### 2. Kompilasi installer Inno Setup

```powershell
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\raporkumer.iss
```

Ganti path `ISCC.exe` sesuai lokasi instalasi Inno Setup Anda. Berkas `.exe` akan tersimpan di `dist/windows/RapkumerSetup.exe`.

### 3. Uji pemasang

- Jalankan `RapkumerSetup.exe`
- Pemasang akan menyalin seluruh bundel ke `{autopf}\Rapkumer`
- Skrip `ensure-node.ps1` otomatis dijalankan; jika Node.js tidak ditemukan pada PATH, skrip akan mengunduh rilis Node.js LTS terbaru (arsip `win-x64.zip`) dan mengekstraknya ke `{app}\runtime\node`
- Setelah instalasi, shortcut desktop dan Start Menu `Jalankan Rapkumer` dibuat dan menjalankan `start-rapkumer.cmd`

## 🚀 Menjalankan aplikasi terpasang

1. Klik shortcut **Jalankan Rapkumer** (desktop atau Start Menu)
2. Skrip akan:
	- Memastikan port default `3000`
	- Menjalankan `node build/index.js` menggunakan Node bawaan (atau Node sistem jika tersedia)
	- Membuka browser ke `http://localhost:3000`
	- Menyimpan log ke `logs/rapkumer.log`

Database SQLite bawaan berada di `{app}\data\database.sqlite3`. Backup sebelum menghapus aplikasi bila dibutuhkan.

## 🛠️ Penyesuaian

- Ubah nama aplikasi atau metadata installer melalui `installer/raporkumer.iss`
- Sesuaikan skrip start di `installer/files/start-rapkumer.cmd` bila port atau perilaku server berubah
- Skrip pengunduh Node dapat dimodifikasi di `installer/scripts/ensure-node.ps1`

## 🔍 Quality Gates

- `pnpm build` ✅
- `installer/prepare-windows.ps1` ✅ (`npm` melaporkan 1 kerentanan severe pada paket upstream; investigasi lanjutan disarankan bila diperlukan)
