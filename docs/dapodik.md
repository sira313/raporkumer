# Integrasi Rapkumer dengan WebService Dapodik Desktop

Dokumentasi teknis modul `src/lib/server/dapodik.ts` — klien GET/POST untuk WebService
aplikasi Dapodik desktop yang berjalan di jaringan lokal sekolah.

---

## 1. Gambaran Umum

Rapkumer berkomunikasi **langsung** dengan WebService Dapodik desktop (bukan server pusat PUSDATIN).
Aplikasi Dapodik desktop membuka HTTP server lokal (default port `5774`) yang menyediakan endpoint
REST untuk membaca dan menulis data pokok pendidikan.

```
┌─────────────┐    HTTP (GET/POST)      ┌──────────────────────┐
│  Rapkumer   │ ────────────────────▶  │  Dapodik Desktop     │
│  (server)   │ ◀────────────────────  │  http://ip:5774/     │
└─────────────┘    JSON response        │  WebService/         │
                                       	└──────────────────────┘
```

**Autentikasi:** Header `Authorization: Bearer {token}` — token di-generate dari
aplikasi Dapodik desktop (menu Pengaturan > WebService).

**Format respons:** JSON. Beberapa endpoint mengembalikan envelope standar:

```json
{
  "results": 10,
  "id": "...",
  "start": 0,
  "limit": 20,
  "rows": [ ... ]
}
```

Namun `getSekolah` mengembalikan `rows` sebagai objek tunggal (bukan array).

---

## 2. Endpoint GET (Membaca Data)

Semua permintaan GET menggunakan fungsi `dapodikGet()` dengan parameter wajib:

- `npsn` — Nomor Pokok Sekolah Nasional
- `semester_id` — ID semester Dapodik (format: `YYYY1` = ganjil, `YYYY2` = genap)

### 2.1 `getSekolah` — Profil Sekolah

Memvalidasi pasangan URL + token dan mengambil data profil sekolah.

**Params:** `npsn`, `semester_id`

**Contoh curl:**

```bash
curl -H "Authorization: Bearer <token>" \
  "http://192.168.8.114:5774/WebService/getSekolah?npsn=20212247&semester_id=20251"
```

**Respons (baris pertama `rows`):**

| Field                      | Tipe   | Keterangan                     |
| -------------------------- | ------ | ------------------------------ |
| `sekolah_id`               | string | UUID Dapodik                   |
| `nama`                     | string | Nama sekolah                   |
| `npsn`                     | string | NPSN                           |
| `email`                    | string | Email sekolah                  |
| `website`                  | string | Website sekolah                |
| `alamat_jalan`             | string | Alamat jalan                   |
| `desa_kelurahan`           | string | Desa/kelurahan                 |
| `kecamatan`                | string | Kecamatan                      |
| `kabupaten_kota`           | string | Kabupaten/kota                 |
| `provinsi`                 | string | Provinsi                       |
| `kode_pos`                 | string | Kode pos                       |
| `bentuk_pendidikan_id_str` | string | Jenis sekolah (SD/SMP/SMA/dll) |

**Implementasi:** Dipanggil sebagai langkah pertama (`probe`) untuk validasi koneksi.
Jika mode `tes-koneksi`, proses berhenti di sini. Lihat `runDapodikSync()` baris 330-346
dan `runDapodikKirim()` baris 2581-2599.

---

### 2.2 `getRombonganBelajar` — Kelas + Anggota + Pembelajaran

Mengambil daftar rombongan belajar (kelas) beserta anggota dan jadwal pembelajaran
secara **nested** dalam satu respons. Endpoint terpisah (`getAnggotaRombel`,
`getPembelajaran`) tidak tersedia pada banyak build Dapodik desktop (HTTP 404).

**Params:** `npsn`, `semester_id`

**Contoh curl:**

```bash
curl -H "Authorization: Bearer <token>" \
  "http://192.168.8.114:5774/WebService/getRombonganBelajar?npsn=20212247&semester_id=20251"
```

**Respons per baris `rows`:**

| Field                  | Tipe          | Keterangan                                   |
| ---------------------- | ------------- | -------------------------------------------- |
| `rombongan_belajar_id` | string        | UUID rombel (primary key Dapodik)            |
| `nama`                 | string        | Nama kelas (mis. "VII A")                    |
| `jenis_rombel`         | number        | 1 = reguler, 16 = mapel pilihan, 51 = ekskul |
| `ptk_id`               | string        | UUID wali kelas (referensi ke `getGtk`)      |
| `anggota_rombel`       | array<nested> | Daftar siswa dalam kelas                     |
| `pembelajaran`         | array<nested> | Daftar mata pelajaran + pengampu             |

**Nested `anggota_rombel[]`:**

| Field               | Tipe   | Keterangan                       |
| ------------------- | ------ | -------------------------------- |
| `peserta_didik_id`  | string | UUID siswa (primary key Dapodik) |
| `anggota_rombel_id` | string | UUID keanggotaan                 |

**Nested `pembelajaran[]`:**

| Field                 | Tipe   | Keterangan                              |
| --------------------- | ------ | --------------------------------------- |
| `pembelajaran_id`     | string | UUID pembelajaran (primary key Dapodik) |
| `mata_pelajaran_id`   | string | ID referensi mapel nasional             |
| `nama_mata_pelajaran` | string | Nama mapel                              |
| `ptk_id`              | string | UUID guru pengampu                      |
| `sub_mapel`           | array  | Sub-pembelajaran (varian agama, dll)    |

**Implementasi:** `fetchRombonganBelajar()` baris 596-608. Hasil diproses di
`upsertKelasFromRombel()` baris 1305-1419 untuk membuat/memperbarui kelas lokal,
serta mengumpulkan `anggotaMap` (penempatan siswa) dan `pembelajaranItems`
(antrean mata pelajaran).

---

### 2.3 `getGtk` — Data GTK/PTK (Guru dan Tenaga Kependidikan)

**Params:** `npsn`, `semester_id`

**Contoh curl:**

```bash
curl -H "Authorization: Bearer <token>" \
  "http://192.168.8.114:5774/WebService/getGtk?npsn=20212247&semester_id=20251"
```

**Respons per baris `rows`:**

| Field            | Tipe   | Keterangan                          |
| ---------------- | ------ | ----------------------------------- |
| `ptk_id`         | string | UUID PTK                            |
| `nama`           | string | Nama lengkap                        |
| `nip`            | string | NIP                                 |
| `nuptk`          | string | NUPTK                               |
| `jabatan_ptk_id` | string | Jabatan (termasuk "Kepala Sekolah") |

**Implementasi:** `syncPtk()` baris 860-950. Memetakan PTK Dapodik ke tabel `pegawai`
lokal. PTK yang jabatannya mengandung "kepala" diusulkan sebagai kepala sekolah jika
lokal masih placeholder (`-`).

---

### 2.4 `getPesertaDidik` — Data Siswa

**Params:** `npsn`, `semester_id`

**Contoh curl:**

```bash
curl -H "Authorization: Bearer <token>" \
  "http://192.168.8.114:5774/WebService/getPesertaDidik?npsn=20212247&semester_id=20251"
```

**Respons per baris `rows` (flat):**

| Field                           | Tipe         | Keterangan                                   |
| ------------------------------- | ------------ | -------------------------------------------- |
| `peserta_didik_id`              | string       | UUID siswa                                   |
| `nama`                          | string       | Nama lengkap                                 |
| `nisn`                          | string       | NISN                                         |
| `nipd`                          | string       | NIPD / NIS                                   |
| `jenis_kelamin`                 | string       | `L` = laki-laki, `P` = perempuan             |
| `agama_id` / `agama_id_str`     | string/label | ID agama / label agama                       |
| `tanggal_lahir`                 | string       | Format YYYY-MM-DD                            |
| `tempat_lahir`                  | string       | Tempat lahir                                 |
| `nik`                           | string       | NIK                                          |
| `anak_keberapa`                 | number       | Anak ke-                                     |
| `sekolah_asal`                  | string       | Sekolah asal                                 |
| `tanggal_masuk_sekolah`         | string       | Tanggal masuk                                |
| `rombongan_belajar_id`          | string       | UUID kelas (penempatan)                      |
| `anggota_rombel_id`             | string       | UUID keanggotaan                             |
| `alamat_jalan`                  | string       | Alamat jalan                                 |
| `desa_kelurahan`                | string       | Desa/kelurahan                               |
| `nama_ayah`                     | string       | Nama ayah                                    |
| `pekerjaan_ayah_id` / `_str`    | string/label | Pekerjaan ayah                               |
| `nomor_telepon_seluler_ayah`    | string       | Telp ayah                                    |
| `nama_ibu_kandung` / `nama_ibu` | string       | Nama ibu (nama field bervariasi antar build) |
| `pekerjaan_ibu_id` / `_str`     | string/label | Pekerjaan ibu                                |
| `nomor_telepon_seluler_ibu`     | string       | Telp ibu                                     |
| `nama_wali`                     | string       | Nama wali                                    |
| `pekerjaan_wali_id` / `_str`    | string/label | Pekerjaan wali                               |
| `nomor_telepon_seluler_wali`    | string       | Telp wali                                    |
| `alamat_jalan_wali`             | string       | Alamat wali                                  |

**Implementasi:** `syncPesertaDidik()` baris 1494-1811. Setiap baris di-upsert ke
tabel `murid` + `alamat` + `wali_murid`. Penempatan kelas diambil dari
`rombongan_belajar_id` baris PD atau fallback ke peta `anggota_rombel` dari rombel.

---

### 2.5 `getMataPelajaran` — Referensi Mata Pelajaran Nasional

**Params:** `npsn`, `semester_id`

**Contoh curl:**

```bash
curl -H "Authorization: Bearer <token>" \
  "http://192.168.8.114:5774/WebService/getMataPelajaran?npsn=20212247&semester_id=20251"
```

**Respons per baris `rows`:**

| Field                  | Tipe   | Keterangan            |
| ---------------------- | ------ | --------------------- |
| `mata_pelajaran_id`    | number | ID referensi nasional |
| `nama`                 | string | Nama mata pelajaran   |
| `jurusan_id`           | string | ID jurusan (SMK)      |
| `pilihan_sekolah`      | string | `1` = opsi sekolah    |
| `pilihan_buku`         | string | `1` = opsi buku       |
| `pilihan_kepengawasan` | string | `1` = opsi pengawasan |
| `pilihan_evaluasi`     | string | `1` = opsi evaluasi   |

**Implementasi:** `syncMapelReferensi()` baris 1980-2035. Disimpan ke tabel
`dapodik_mata_pelajaran` sebagai cache lokal. Dipakai saat posting nilai untuk
mapping nama mapel lokal ke ID Dapodik.

---

### 2.6 `getMatevNilai` — Data Mata Evaluasi Existing

**Params:** `npsn`, `semester_id`, `a_dari_template=1`

**Contoh curl:**

```bash
curl -H "Authorization: Bearer <token>" \
  "http://192.168.8.114:5774/WebService/getMatevNilai?npsn=20212247&semester_id=20251&a_dari_template=1"
```

**Respons per baris `rows`:**

| Field               | Tipe   | Keterangan         |
| ------------------- | ------ | ------------------ |
| `id_evaluasi`       | string | UUID mata evaluasi |
| `pembelajaran_id`   | string | UUID pembelajaran  |
| `mata_pelajaran_id` | string | ID referensi mapel |

**Implementasi:** `runMatev()` baris 2477-2494. Dipanggil sebelum posting matev untuk
menghindari duplikasi — `id_evaluasi` existing digunakan ulang.

---

### 2.7 `getPengguna` — Data Pengguna Dapodik

**Params:** `npsn`, `semester_id`

**Contoh curl:**

```bash
curl -H "Authorization: Bearer <token>" \
  "http://192.168.8.114:5774/WebService/getPengguna?npsn=20212247&semester_id=20251"
```

**Respons per baris `rows`:**

| Field         | Tipe   | Keterangan       |
| ------------- | ------ | ---------------- |
| `pengguna_id` | string | UUID pengguna    |
| `username`    | string | Username / email |

**Implementasi:** `resolveUpdaterId()` baris 2205-2225. Mencari `pengguna_id` yang
`username`-nya cocok dengan email sekolah atau username user aktif. Digunakan sebagai
`updater_id` saat posting matev dan nilai.

---

## 3. Endpoint POST (Mengirim Data)

Semua permintaan POST menggunakan fungsi `dapodikPost()` dengan header:

- `Authorization: Bearer {token}`
- `Content-Type: application/json`

Parameter query tetap `npsn` + `semester_id` (sama seperti GET).

### 3.1 `postMatevRapor` — Mengirim Mata Evaluasi

Membuat/memperbarui entri mata evaluasi (komponen penilaian) per kelas dan mata pelajaran.

**Params query:** `npsn`, `semester_id`

**Body JSON:**

```json
{
	"id_evaluasi": "xxxxxxxx-xxxx-5xxx-xxxx-xxxxxxxxxxxx",
	"rombongan_belajar_id": "UUID-rombel",
	"mata_pelajaran_id": "ID-referensi-mapel",
	"pembelajaran_id": "UUID-pembelajaran",
	"nm_mata_evaluasi": "Nama Mapel",
	"a_dari_template": 1,
	"no_urut": 1,
	"kkm_kognitif": 75,
	"kkm_psikomotorik": 75,
	"create_date": "2025-01-15T10:00:00.000Z",
	"last_update": "2025-01-15T16:00:00.000Z",
	"soft_delete": 0,
	"last_sync": "2025-01-21T15:30:00.000Z",
	"updater_id": "UUID-pengguna-dapodik"
}
```

**Field kunci:**

| Field                  | Tipe   | Keterangan                            |
| ---------------------- | ------ | ------------------------------------- |
| `id_evaluasi`          | string | UUID deterministik (stabil antar-run) |
| `rombongan_belajar_id` | string | UUID kelas目标                        |
| `mata_pelajaran_id`    | string | ID referensi mapel nasional           |
| `pembelajaran_id`      | string | UUID pembelajaran di rombel           |
| `nm_mata_evaluasi`     | string | Nama tampil (max 40 karakter)         |
| `a_dari_template`      | number | `1` = dari template                   |
| `no_urut`              | number | Urutan tampil                         |
| `kkm_kognitif`         | number | KKM kognitif                          |
| `kkm_psikomotorik`     | number | KKM psikomotorik                      |
| `updater_id`           | string | UUID pengguna Dapodik (boleh null)    |

**Contoh curl:**

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"id_evaluasi":"xxxx-xxxx-xxxx-xxxx-xxxx","rombongan_belajar_id":"yyyy-yyyy-...","mata_pelajaran_id":"12345","pembelajaran_id":"zzzz-...","nm_mata_evaluasi":"Matematika","a_dari_template":1,"no_urut":1,"kkm_kognitif":75,"kkm_psikomotorik":75,"create_date":"2025-01-15T10:00:00.000Z","last_update":"2025-01-15T16:00:00.000Z","soft_delete":0,"last_sync":"2025-01-21T15:30:00.000Z","updater_id":"uuid-pengguna"}' \
  "http://192.168.8.114:5774/WebService/postMatevRapor?npsn=20212247&semester_id=20251"
```

**Respons sukses:**

```json
{ "success": true }
```

**Implementasi:** `runMatev()` baris 2447-2547. Dipanggil per mapel dalam satu kelas.
`id_evaluasi` di-generate deterministik (SHA-1 UUID v5) agar stabil antar-run tanpa
menimpa milik mapel lain.

---

### 3.2 `postNilai` — Mengirim Nilai Akhir Siswa

Mengirim nilai akhir per siswa per mata evaluasi (hasil matev harus sukses dulu).

**Params query:** `npsn`, `semester_id`, `table=rapor`

**Body JSON:**

```json
{
	"nilai_id": "xxxxxxxx-xxxx-5xxx-xxxx-xxxxxxxxxxxx",
	"id_evaluasi": "xxxxxxxx-xxxx-5xxx-xxxx-xxxxxxxxxxxx",
	"anggota_rombel_id": "UUID-anggota-rombel",
	"nilai_kognitif_angka": 85.5,
	"ket_kognitif": "Deskripsi capaian kompetensi...",
	"create_date": "2025-01-15T09:00:00.000Z",
	"last_update": "2025-01-15T10:00:00.000Z",
	"soft_delete": 0,
	"last_sync": "2025-01-15T09:30:00.000Z",
	"updater_id": "UUID-pengguna-dapodik"
}
```

**Field kunci:**

| Field                  | Tipe   | Keterangan                             |
| ---------------------- | ------ | -------------------------------------- |
| `nilai_id`             | string | UUID deterministik (stabil antar-run)  |
| `id_evaluasi`          | string | UUID dari `postMatevRapor`             |
| `anggota_rombel_id`    | string | UUID keanggotaan siswa di rombel       |
| `nilai_kognitif_angka` | number | Nilai akhir (2 desimal)                |
| `ket_kognitif`         | string | Deskripsi capaian kompetensi (max 300) |
| `updater_id`           | string | UUID pengguna Dapodik (boleh null)     |

**Contoh curl:**

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"nilai_id":"aaaa-bbbb-cccc-dddd-eeee","id_evaluasi":"xxxx-xxxx-xxxx-xxxx-xxxx","anggota_rombel_id":"yyyy-yyyy-...","nilai_kognitif_angka":85.5,"ket_kognitif":"Ananda Rina menunjukkan pemahaman yang baik...","create_date":"2025-01-15T09:00:00.000Z","last_update":"2025-01-15T10:00:00.000Z","soft_delete":0,"last_sync":"2025-01-15T09:30:00.000Z","updater_id":"uuid-pengguna"}' \
  "http://192.168.8.114:5774/WebService/postNilai?npsn=20212247&semester_id=20251&table=rapor"
```

**Respons sukses:**

```json
{ "success": true }
```

**Implementasi:** `runDapodikKirim()` mode `kirim-nilai`, baris 2944-2963. Hanya siswa
yang memiliki `dapodikAnggotaRombelId` (UUID anggota rombel) dan `nilaiAkhir` yang
terisi akan dikirim. Deskripsi `ket_kognitif` dibangun otomatis dari capaian kompetensi
(`buildCapaianKompetensi`) dengan mode `compact`, dipotong max 300 karakter.

---

## 4. Alur Sinkronisasi (GET)

Fungsi `runDapodikSync()` (baris 304-458) mengeksekusi langkah-langkah berikut secara
berurutan. Setiap langkah dilaporkan ke array `sections` dengan status `ok`/`gagal`/`dilewati`.

| Langkah | Endpoint              | Aksi                                             |
| ------- | --------------------- | ------------------------------------------------ |
| 1       | `getSekolah`          | Validasi koneksi + ambil profil sekolah          |
| 2       | —                     | Buat data sekolah lokal jika belum ada           |
| 3       | `getRombonganBelajar` | Deteksi semester aktif dari data rombel          |
| 4       | —                     | Pastikan tahun ajaran + semester lokal tersedia  |
| 5       | —                     | Update profil sekolah dari payload Dapodik       |
| 6       | `getGtk`              | Sinkronisasi PTK/guru ke tabel `pegawai`         |
| 7       | —                     | Upsert kelas dari rombel + kumpulkan nested data |
| 8       | `getPesertaDidik`     | Sinkronisasi siswa + alamat + orang tua/wali     |
| 9       | —                     | Upsert mata pelajaran dari pembelajaran nested   |
| 9b      | —                     | Buat akun guru + tautkan mapel + kelas           |
| 10      | —                     | Sinkronisasi ekskul dari rombel jenis 51         |
| 11      | `getMataPelajaran`    | Simpan referensi mapel nasional lokal            |

---

## 5. Alur Pengiriman Nilai (POST)

Fungsi `runDapodikKirim()` (baris 2555-2995) mengeksekusi:

| Langkah | Endpoint              | Aksi                                                      |
| ------- | --------------------- | --------------------------------------------------------- |
| 1       | `getSekolah`          | Validasi koneksi + token                                  |
| 2       | `getPengguna`         | Resolusi `updater_id` dari username/email                 |
| 3       | —                     | Kumpulkan kandidat matev (mapel berkode Dapodik di kelas) |
| 3b      | `getRombonganBelajar` | Self-healing binding kode Dapodik ke mapel lokal          |
| 4       | `getMatevNilai`       | Ambil matev existing → `postMatevRapor` per mapel         |
| 5       | —                     | Kirim nilai: `postNilai` per siswa × per mapel            |

---

## 6. Normalisasi & Penanganan Respons

### URL

`normalizeWebServiceUrl()` (baris 91-98) menerima:

- `192.168.8.114:5774` → `http://192.168.8.114:5774/WebService`
- `http://192.168.8.114:5774` → `http://192.168.8.114:5774/WebService`
- `http://192.168.8.114:5774/WebService` → tidak diubah

### JSON Parsing

`extractJsonBody()` (baris 101-120) menangani respons yang bukan JSON murni
(misalnya halaman error HTML yang mengandung karakter `{` `}`).

### Envelope

`rowsOf()` (baris 190-200) menormalkan envelope respons menjadi array `Row[]`:

- Array langsung → dikembalikan apa adanya
- `{ rows: [...] }` → ambil `rows`
- `{ rows: {...} }` → bungkus dalam array (kasus `getSekolah`)
- `{ datas: [...] }` → ambil `datas`

### Field String

`str()` (baris 202-209) mengambil nilai string dari row: coba `key` dulu, fallback ke
`key_str` (label referensi), lalu konversi number ke string.

### Timeout

Semua permintaan HTTP menggunakan `AbortSignal.timeout(20000)` (20 detik).

### Error Flag

Respons Dapodik menggunakan `{ success: false, message: "..." }` untuk menandakan
penolakan (token salah, parameter tidak valid). Ini ditangani sebelum parsing data.

---

## 7. Penyimpanan Konfigurasi

Kredensial tersimpan di tabel `dapodik_settings`:

| Kolom                          | Keterangan                          |
| ------------------------------ | ----------------------------------- |
| `url`                          | URL lengkap WebService              |
| `token`                        | Bearer token                        |
| `npsn`                         | NPSN sekolah                        |
| `semester_id_dapodik_terakhir` | Semester terakhir yang disinkronkan |
| `last_sync_at`                 | Timestamp sinkronisasi terakhir     |

`saveDapodikSettings()` bersifat **partial update** — hanya field yang diberikan yang diubah.
Form disimpan **sebelum** probe koneksi agar user tidak perlu mengisi ulang saat mencoba lagi.

---

## 8. ID Deterministik (UUID Stabil)

Untuk data yang harus stabil antar-run tanpa mengandalkan Dapodik, Rapkumer menggunakan
UUID v5 deterministik berbasis SHA-1 (`uuidDeterministic()`, baris 2377-2383):

- **`id_evaluasi`**: seed = `rapkumer-matev:{rombelId}:{mapelId}:{pbId}:{mpId}`
- **`nilai_id`**: seed = `rapkumer-nilai:{mapelId}:{muridId}`

Format: RFC 4122 UUID v5 (versi 5, varian 10xx).

---

## 9. Referensi

- `docs/erapor.md` — Analisis lengkap protokol Dapodik dari proyek e-Rapor
- `src/lib/server/dapodik.ts` — Implementasi klien dalam Rapkumer
