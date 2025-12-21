# Fix: Duplikasi Mata Pelajaran

## Masalah

Ditemukan bug yang memungkinkan duplikasi mata pelajaran dengan nama sama dalam satu kelas. Hal ini menyebabkan:

- Rapor menampilkan "Belum ada penilaian sumatif" meskipun nilai sudah diinput
- Data tidak konsisten karena sistem bisa mengambil salah satu dari mapel duplikat secara acak
- Tujuan pembelajaran dan nilai terpecah di beberapa mapel

## Root Cause

1. **Tidak ada constraint unique** di database untuk `(kelas_id, nama)`
2. **Tidak ada validasi duplikat** di form tambah mata pelajaran
3. **Logika import yang lemah** - jika ada duplikat, Map hanya menyimpan ID terakhir

## Solusi yang Diterapkan

### 1. Database Schema

- Tambah constraint UNIQUE pada `(kelas_id, nama)` di tabel `mata_pelajaran`
- Migration: `drizzle/0031_add_unique_constraint_mata_pelajaran.sql`

### 2. Validasi di Form

- Tambah pengecekan duplikat sebelum insert di `intrakurikuler/form/+page.server.ts`
- User akan mendapat error message jika mencoba menambah mapel yang sudah ada

### 3. Perbaikan Logika Import

- Import sekarang mendeteksi duplikat dan log warning ke console
- Gunakan ID yang lebih kecil (yang dibuat lebih dulu) jika ada duplikat

## Langkah Perbaikan untuk Database yang Sudah Terdampak

### 1. Backup Database

```bash
cp data/database.sqlite3 data/database-backup-$(date +%Y%m%d).sqlite3
```

### 2. Cleanup Duplikat

```bash
node scripts/cleanup-duplicate-mapel.mjs
```

Script ini akan:

- Mencari semua duplikat di setiap kelas
- Merge data (tujuan pembelajaran, asesmen) ke mapel dengan ID terendah
- Hapus mapel duplikat
- Report summary

### 3. Apply Migration

```bash
pnpm db:push
```

Ini akan menerapkan constraint UNIQUE ke database.

### 4. Verifikasi

```bash
node scripts/debug-agama-filter.mjs <murid_id>
```

## Script Utilitas

### `cleanup-duplicate-mapel.mjs`

Otomatis membersihkan semua duplikat di database.

### `fix-duplicate-mapel.mjs`

Analisis duplikat tanpa mengubah data (hanya report).

### `merge-duplicate-mapel.mjs`

Manual merge 2 mapel spesifik: `node scripts/merge-duplicate-mapel.mjs <id_lama> <id_baru>`

### `debug-agama-filter.mjs`

Debug mengapa mapel agama tidak muncul di rapor untuk murid tertentu.

## Testing

Setelah fix, test:

1. ✅ Tidak bisa menambah mapel dengan nama duplikat via form
2. ✅ Import Excel skip mapel yang sudah ada (tidak create duplikat)
3. ✅ Constraint database mencegah insert duplikat via SQL
4. ✅ Rapor menampilkan nilai dengan benar tanpa "Belum ada penilaian sumatif"

## Tanggal

21 Desember 2025
