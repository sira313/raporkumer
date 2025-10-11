# Code Signing Setup dan Workflow - Rapkumer

Dokumentasi ini menjelaskan cara mengatur dan menggunakan code signing untuk proyek Rapkumer menggunakan Windows SignTool.

## 🔧 Prerequisites

1. **Windows SDK** - SignTool tersedia sebagai bagian dari Windows SDK
   - Download dari: https://developer.microsoft.com/windows/downloads/windows-sdk
   - Atau install melalui Visual Studio Installer

2. **Code Signing Certificate** - Anda memerlukan certificate yang valid untuk code signing
   - Bisa dari Certificate Authority (CA) seperti DigiCert, Sectigo, dll
   - Atau self-signed certificate untuk testing (tidak direkomendasikan untuk produksi)

## 📁 Struktur File Certificate

```
installer/
├── cert/
│   ├── .gitignore              # File certificate tidak di-commit
│   ├── codesign.pfx           # Certificate dalam format PFX
│   └── password.txt           # Password untuk PFX file
└── scripts/
    ├── signing-config.ps1     # Konfigurasi signing
    └── sign-files.ps1         # Script utama signing
```

## 🔐 Setup Certificate

### Opsi 1: Menggunakan PFX File (Recommended)

1. Letakkan certificate PFX di `installer/cert/codesign.pfx`
2. Buat file `installer/cert/password.txt` yang berisi password PFX
3. Pastikan file-file ini tidak ter-commit ke git (sudah ada di .gitignore)

### Opsi 2: Menggunakan Certificate Store

1. Install certificate ke Windows Certificate Store
2. Edit `installer/scripts/signing-config.ps1`:
   ```powershell
   $CertConfig = @{
       SubjectName = "Nama Subject Certificate Anda"
       UseUserStore = $false  # false = machine store, true = user store
       # ... konfigurasi lainnya
   }
   ```

## 🚀 Cara Penggunaan

### Build dengan Code Signing

```bash
# Build dan sign semua file (executables + installer)
pnpm prod:signed

# Atau step by step:
pnpm build
pnpm package:win
pnpm sign:executables    # Sign executable files di staging area
pnpm package:win:installer
pnpm sign:installer      # Sign installer final
```

### Verifikasi Signature

```bash
# Verifikasi semua signed files
pnpm sign:verify
```

### Manual Signing

```bash
# Sign executables saja
pnpm sign:executables

# Sign installer saja
pnpm sign:installer

# Sign file tertentu
powershell -NoProfile -ExecutionPolicy Bypass -File installer/scripts/sign-files.ps1 -FilesToSign "path/to/file.exe"
```

## ⚙️ Konfigurasi Signing

Edit `installer/scripts/signing-config.ps1` untuk mengatur:

- **Certificate Path**: Lokasi file PFX atau nama subject di certificate store
- **Timestamp Server**: Server untuk timestamping (default: DigiCert)
- **Digest Algorithm**: Algorithm untuk signature (default: SHA256)
- **Description**: Deskripsi yang tampil di properties file

## 🔍 Troubleshooting

### Error: "SignTool.exe not found"

1. Pastikan Windows SDK terinstall
2. Check path SignTool dengan command:
   ```powershell
   Get-ChildItem "C:\Program Files (x86)\Windows Kits\" -Recurse -Filter signtool.exe
   ```
3. Update path di `signing-config.ps1` jika perlu

### Error: "No certificate available"

1. **Untuk PFX file**:
   - Pastikan file `installer/cert/codesign.pfx` ada
   - Pastikan file `installer/cert/password.txt` ada dan berisi password yang benar

2. **Untuk Certificate Store**:
   - Buka `certmgr.msc` dan pastikan certificate ada di store yang benar
   - Pastikan certificate memiliki private key
   - Update `SubjectName` di config sesuai dengan subject certificate

### Error: "Timestamping failed"

1. Check koneksi internet
2. Coba server timestamp lain:
   ```powershell
   # Di signing-config.ps1
   TimestampUrl = "http://time.certum.pl"
   # atau
   TimestampUrl = "http://timestamp.comodoca.com"
   ```

### Error: "Access denied" atau "The file is being used by another process"

1. Pastikan tidak ada proses lain yang menggunakan file
2. Run PowerShell sebagai Administrator
3. Restart dan coba lagi

## 🔒 Security Best Practices

1. **Jangan commit certificate ke git**
   - File `.gitignore` sudah dikonfigurasi untuk mengabaikan certificate files
   - Backup certificate di tempat yang aman

2. **Gunakan strong password** untuk PFX file

3. **Limit access** ke certificate dan password file

4. **Monitor certificate expiration** dan renew sebelum expired

5. **Untuk CI/CD**: Gunakan secure environment variables untuk password

## 📊 Apa yang Di-Sign

Script akan otomatis sign:
- **Executables**: Semua `.exe` files di staging area
- **DLLs**: Semua `.dll` files di staging area  
- **Installer**: File `RapkumerSetup.exe` final

## 🔄 Workflow Production

Workflow yang direkomendasikan:

1. **Development**: Gunakan `pnpm prod` (tanpa signing) untuk testing
2. **Release**: Gunakan `pnpm prod:signed` untuk build final yang akan didistribusi
3. **Verification**: Selalu run `pnpm sign:verify` setelah signing
4. **Distribution**: Distribute signed installer ke end users

## 📞 Support

Jika mengalami masalah dengan code signing:

1. Check log output yang detail dari script
2. Verify certificate validity dengan Windows Certificate Manager
3. Test signing dengan file dummy untuk isolate masalah
4. Konsultasi dengan team security atau IT infrastructure

---

**⚠️ Important**: Code signing certificate adalah asset security yang penting. Jaga kerahasiaannya dan gunakan sesuai dengan security policy organisasi.