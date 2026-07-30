# Pengaturan Izin Pengguna

## Lokasi

Halaman `GET /pengguna/[id]` — menampilkan daftar semua izin yang tersedia dalam bentuk toggle checkbox per pengguna.

Server load: `src/routes/pengguna/[id]/+page.server.ts:9`  
Client UI: `src/routes/pengguna/[id]/+page.svelte:33`

---

## Daftar Izin

Didefinisikan di `src/routes/pengguna/permissions.ts:1`.

| Grup      | Izin                   | Deskripsi                   |
| --------- | ---------------------- | --------------------------- |
| user      | `user_list`            | Lihat daftar pengguna       |
| user      | `user_detail`          | Lihat detail pengguna       |
| user      | `user_add`             | Tambah pengguna             |
| user      | `user_delete`          | Hapus pengguna              |
| user      | `user_suspend`         | Tangguhkan pengguna         |
| user      | `user_set_permissions` | Atur izin pengguna          |
| dashboard | `dashboard_manage`     | Kelola Tindakan Cepat       |
| sekolah   | `sekolah_manage`       | Kelola Identitas Sekolah    |
| app       | `app_check_update`     | Cek Pembaruan Aplikasi      |
| server    | `server_stop`          | Hentikan Server             |
| rapor     | `rapor_manage`         | Kelola Akademik             |
| kelas     | `kelas_manage`         | Kelola Data Kelas           |
| kelas     | `kelas_pindah`         | Pindah dan akses kelas lain |

**Total: 13 izin** dalam 7 kelompok.

---

## Cara Kerja

### Admin

- `isAuthorizedUser()` (`permissions.ts:46`) mengembalikan `true` untuk semua permission jika `user.type === 'admin'`
- Di UI, semua toggle checkbox _checked + disabled_ dengan hidden input agar tetap terkirim
- Tidak perlu diatur secara manual — admin selalu punya semua akses

### Non-Admin (Wali Kelas, Wali Asuh, User/Guru Mapel)

- Izin dicek langsung dari kolom `permissions` (JSON array of strings) di tabel `auth_user`
- Setiap izin adalah string seperti `"user_list"`, `"kelas_pindah"`, dll.
- Fungsi `isAuthorizedUser()` mengecek apakah user punya **salah satu** dari izin yang diminta (OR)
- Dua lapis penjagaan:
  - **Server side**: `authority()` di `utils.server.ts` — redirect ke `/forbidden` jika tidak punya izin
  - **Client side**: `<Authority>` component di `authority.svelte` — render conditional

---

## Dampak per Tipe Akun

### Admin

| Izin  | Dampak                                                               |
| ----- | -------------------------------------------------------------------- |
| Semua | Bisa apa saja. Manajemen user, sekolah, akademik, server, dashboard. |

Catatan: `isAuthorizedUser` selalu return `true` untuk admin, sehingga permission list di UI tidak relevan (selalu full).

### Wali Kelas (`type: 'wali_kelas'`)

| Izin                                | Dampak                                                                                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kelas_pindah` **(paling krusial)** | Bisa berpindah-pindah kelas dan mengakses data kelas lain (tidak hanya kelas yang di-wali-kan). Dicek di `hooks.server.ts:203` dan `+layout.server.ts:169`. |
| `user_list`, `user_detail`          | Bisa lihat daftar dan detail pengguna lain.                                                                                                                 |
| `user_add`                          | Bisa tambah pengguna baru.                                                                                                                                  |
| `user_delete`                       | Bisa hapus pengguna (tapi wali_kelas dan wali_asuh diblokir di `+page.server.ts:803`).                                                                      |
| `user_suspend`                      | Bisa tangguhkan pengguna.                                                                                                                                   |
| `user_set_permissions`              | Bisa mengatur izin pengguna lain.                                                                                                                           |
| `dashboard_manage`                  | Bisa kelola Tindakan Cepat di dashboard.                                                                                                                    |
| `sekolah_manage`                    | Bisa ubah identitas sekolah.                                                                                                                                |
| `app_check_update`                  | Bisa cek pembaruan aplikasi.                                                                                                                                |
| `server_stop`                       | Bisa hentikan server.                                                                                                                                       |
| `rapor_manage`                      | Bisa kelola akademik (rapor, dll).                                                                                                                          |
| `kelas_manage`                      | Bisa kelola data kelas (tambah/edit/hapus kelas).                                                                                                           |

Catatan penting:

- **Tanpa `kelas_pindah`** — Wali Kelas hanya bisa mengakses kelas yang `waliKelasId`-nya cocok dengan `pegawaiId` mereka. Request ke kelas lain akan di-redirect ke `/forbidden`.
- **Dengan `kelas_pindah`** — tetap terbatas: hanya bisa pindah ke kelas lain yang `waliKelasId`-nya adalah `pegawaiId` mereka sendiri (validasi di `+layout.server.ts:179-188`). Izin ini hanya berguna jika seorang guru menjadi wali kelas di lebih dari satu kelas.
- Bisa edit absen (`canUserEditAbsen` return `true`).
- `canManageMapel` = `true` (bisa atur mata pelajaran).
- Tidak bisa dihapus dari halaman pengguna.

### Wali Asuh (`type: 'wali_asuh'`)

| Izin                       | Dampak                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Sama dengan daftar di atas | Tergantung apa yang dicentang.                                                                       |
| `kelas_pindah`             | Di `hooks.server.ts:210-212`, wali_asuh **tidak dibatasi** oleh kelas_id — bisa akses kelas manapun. |

Catatan penting:

- **`canManageMapel = false`** (`+layout.server.ts:249`) — Wali Asuh **tidak bisa** mengelola mata pelajaran (tidak seperti wali_kelas dan user/guru mapel).
- **Tidak bisa edit absen** (`canUserEditAbsen` return `false`).
- Wali asuh bersifat per-siswa (bukan per-kelas).
- Tidak bisa dihapus dari halaman pengguna.

### User / Guru Mapel (`type: 'user'`)

| Izin                             | Dampak                                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| Sama dengan daftar di atas       | Tergantung apa yang dicentang.                                                                |
| `kelas_pindah` **(auto-assign)** | Jika user dibuat dengan >1 kelas, otomatis diberi `kelas_pindah` (`+page.server.ts:631-634`). |

Catatan penting:

- **`disableInteraction`** (`+layout.svelte:103-107`) — Ini adalah mekanisme **terpisah dari permission system** yang membuat halaman `user` menjadi **read-only** secara default. Berlaku di rute:
  - `/murid`
  - `/kokurikuler` dan `/asesmen-kokurikuler`
  - `/ekstrakurikuler` dan `/nilai-ekstrakurikuler`
  - `/keasramaan` dan `/asesmen-keasramaan`
  - `/absen` **(dikecualikan)**
  - `/jurnal-mengajar` **(dikecualikan)**
  - `/catatan-wali-kelas`
  - `/keputusan`
  - `/cetak` **(dikecualikan)**

  Pengecualian (`disableInteraction` tidak aktif):
  - `/absen` — Guru mapel bisa lihat semua mode dan menggunakan "Isi Sekaligus" per-mapel
  - `/jurnal-mengajar` — Bisa akses jurnal mengajar
  - `/cetak` — Bisa cetak dokumen

- **Edit absen individual tetap diblokir** — `canUserEditAbsen` return `false` untuk `user`. Hanya `handleIsiSekaligus` (bulk fill) yang dikecualikan di `absen/actions.ts:163-169`.
- **`canManageMapel` = `true`** — Bisa mengelola mata pelajaran (filter ketat di server).
- Membutuhkan minimal 1 mata pelajaran saat pembuatan akun.

---

## Ringkasan Perbedaan Akses Bawaan (tanpa perubahan izin)

| Kemampuan            | Admin | Wali Kelas                | Wali Asuh        | Guru Mapel                      |
| -------------------- | ----- | ------------------------- | ---------------- | ------------------------------- |
| Akses semua fitur    | ✅    | ❌                        | ❌               | ❌                              |
| Edit absen           | ✅    | ✅                        | ❌               | ❌ (kecuali Isi Sekaligus)      |
| Isi Sekaligus absen  | ✅    | ✅                        | ❌               | ✅                              |
| `canManageMapel`     | ✅    | ✅                        | ❌               | ✅                              |
| `disableInteraction` | ❌    | ❌                        | ❌               | ✅ (kecuali absen/jurnal/cetak) |
| Akses bebas kelas    | ✅    | ❌ (butuh `kelas_pindah`) | ✅ (tanpa batas) | ❌                              |
| Bisa dihapus         | ✅    | ❌                        | ❌               | ✅                              |
| Server stop          | ✅    | ❌                        | ❌               | ❌                              |

---

## Kapan Permission Dicek

1. **Hook level** (`hooks.server.ts:194-215`): Setiap request dengan `kelas_id` — guard untuk wali_kelas
2. **Layout level** (`+layout.server.ts:155-198`): Pemilihan kelas aktif — guard tambahan
3. **Page load** (`+page.server.ts` via `authority()`): Setiap halaman yang membutuhkan izin spesifik
4. **Form actions** (`+page.server.ts` actions via `authority()`): Setiap submit yang membutuhkan izin
5. **API endpoints** (via `isAuthorizedUser()` langsung): Endpoint seperti `/api/runtime/stop`, `/api/updates/*`, `/api/sekolah/*`
6. **Client-side rendering** (`<Authority>` component): Tombol dan elemen UI yang di-render conditional
7. **CSS guard** (`+layout.svelte` via `disableInteraction`): Read-only visual untuk guru mapel

---

## Catatan Teknis

- Permission disimpan sebagai `TEXT` JSON array di SQLite: `permissions TEXT NOT NULL DEFAULT '[]'`
- Tipe di TypeScript: `UserPermission` — union string dari semua kombinasi `group_value` (auto-generated dari `groupedUserPermissions`)
- Saat save via form, semua permission checkbox name (key) yang ter-submit dikumpulkan sebagai array baru, lalu `db.update(...).set({ permissions })`
- Admin **tidak perlu** permission apapun — `isAuthorizedUser` selalu return `true` untuk admin
- Saat user dibuat, permission bisa di-set langsung (default: `[]`), dengan auto-assign `kelas_pindah` untuk guru multi-kelas

---

## Filter Menu Berdasarkan Tipe Akun

Implementasi di `src/lib/components/menu.svelte:42-60`.

App drawer (sidebar) otomatis menyembunyikan item menu tertentu berdasarkan tipe akun, menggunakan dua mekanisme:

### 1. Admin-Only Routes

`adminOnlyRoutes` — item disembunyikan untuk **semua non-admin** (wali_kelas, wali_asuh, user):

| Rute         | Item Menu                |
| ------------ | ------------------------ |
| `/buku-tamu` | Administrasi » Buku Tamu |

### 2. Readonly Routes (Guru Mapel)

`readonlyRoutes` — item disembunyikan untuk **Guru Mapel** (`type: 'user'`):

| Rute                     | Item Menu                         |
| ------------------------ | --------------------------------- |
| `/sekolah`               | Informasi Umum » Sekolah          |
| `/akademik`              | Informasi Umum » Akademik         |
| `/kelas`                 | Informasi Umum » Kelas            |
| `/murid`                 | Informasi Umum » Murid            |
| `/kokurikuler`           | Mata Pelajaran » Kokurikuler      |
| `/ekstrakurikuler`       | Mata Pelajaran » Ekstrakurikuler  |
| `/keasramaan`            | Mata Pelajaran » Keasramaan       |
| `/asesmen-kokurikuler`   | Input Nilai » Kokurikuler         |
| `/nilai-ekstrakurikuler` | Input Nilai » Ekstrakurikuler     |
| `/asesmen-keasramaan`    | Input Nilai » Keasramaan          |
| `/catatan-wali-kelas`    | Administrasi » Catatan Wali Kelas |
| `/keputusan`             | Administrasi » Keputusan          |

### 3. Pengecualian

Item berikut **tetap muncul** untuk Guru Mapel yang memiliki mata pelajaran (`hasMataPelajaran = true`):

| Rute               | Item Menu                      | Alasan                               |
| ------------------ | ------------------------------ | ------------------------------------ |
| `/absen`           | Administrasi » Absen           | Guru mapel perlu isi absen per-mapel |
| `/jurnal-mengajar` | Administrasi » Jurnal Mengajar | Guru mapel perlu tulis jurnal        |
| `/cetak`           | Cetak Dokumen                  | Guru mapel perlu cetak dokumen       |

Jika Guru Mapel **tidak memiliki** mata pelajaran, ketiga item di atas juga ikut tersembunyi.

### 4. Cascading Parent Group

Filter bekerja rekursif: jika semua submenu dalam satu grup tersembunyi, grup induk juga tidak muncul. Contoh:

- Guru Mapel: grup **"Informasi Umum"** (Sekolah, Akademik, Kelas, Murid) — jika semua tersembunyi, grup tidak muncul.
- Guru Mapel: grup **"Mata Pelajaran"** — Intrakurikuler tetap muncul, Kokurikuler/Ekstrakurikuler/Keasramaan tersembunyi. Grup tetap muncul karena masih ada Intrakurikuler.

### Ringkasan Visibilitas Menu per Tipe Akun

| Item Menu             | Admin | Wali Kelas | Wali Asuh | Guru Mapel |
| --------------------- | ----- | ---------- | --------- | ---------- |
| Dashboard             | ✅    | ✅         | ✅        | ✅         |
| Sekolah               | ✅    | ✅         | ✅        | ❌         |
| Akademik              | ✅    | ✅         | ✅        | ❌         |
| Kelas                 | ✅    | ✅         | ✅        | ❌         |
| Murid                 | ✅    | ✅         | ✅        | ❌         |
| Intrakurikuler        | ✅    | ✅         | ✅        | ✅         |
| Kokurikuler           | ✅    | ✅         | ✅        | ❌         |
| Ekstrakurikuler       | ✅    | ✅         | ✅        | ❌         |
| Keasramaan            | ✅    | ✅         | ✅        | ❌         |
| Asesmen Formatif      | ✅    | ✅         | ✅        | ✅         |
| Asesmen Sumatif       | ✅    | ✅         | ✅        | ✅         |
| Asesmen Kokurikuler   | ✅    | ✅         | ✅        | ❌         |
| Nilai Ekstrakurikuler | ✅    | ✅         | ✅        | ❌         |
| Asesmen Keasramaan    | ✅    | ✅         | ✅        | ❌         |
| Absen                 | ✅    | ✅         | ✅        | ✅*        |
| Jurnal Mengajar       | ✅    | ✅         | ✅        | ✅*        |
| Catatan Wali Kelas    | ✅    | ✅         | ✅        | ❌         |
| Rekap Nilai           | ✅    | ✅         | ✅        | ✅         |
| Keputusan             | ✅    | ✅         | ✅        | ❌         |
| Buku Tamu             | ✅    | ❌         | ❌        | ❌         |
| Cetak Dokumen         | ✅    | ✅         | ✅        | ✅*        |

\* Pengecualian: hanya muncul jika Guru Mapel memiliki mata pelajaran (`hasMataPelajaran = true`).

### Catatan

- Filter menu ini **tidak menggantikan** server-side authority check. Jika user mengakses URL langsung (bukan dari menu), server-side guard (`authority()`, `if user.type`, dll.) tetap memblokir akses.
- `disableInteraction` di `+layout.svelte` tetap berlaku sebagai CSS guard tambahan untuk halaman yang mungkin masih bisa diakses via URL langsung.
- Logika filter di `menu.svelte` menggunakan `$derived` sehingga visibilitas menu reaktif terhadap perubahan data user.
