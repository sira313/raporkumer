# Refactoring Modular: Asesmen Keasramaan

Halaman `+page.svelte` telah direfaktor menjadi struktur modular yang lebih terorganisir di dalam folder `src/lib/components/asesmen-keasramaan/`.

## Struktur File Baru

### Components (Svelte)

- **`keasramaan-selector.svelte`** - Dropdown selector untuk memilih Matev Keasramaan
  - Props: `keasramaanList`, `selectedValue`, `disabled`, `onChange`
  - Menampilkan daftar Matev dengan opsi pilih

- **`search-form.svelte`** - Form pencarian murid
  - Props: `value`, `disabled`, `onInput`, `onSubmit`
  - Input search dengan icon

- **`action-buttons.svelte`** - Tombol aksi download & import
  - Props: `isDownloading`, `isImporting`, `disabled`, `onDownload`, `onImport`
  - Download template dan Import nilai functionality

- **`murid-table.svelte`** - Tabel daftar murid dengan nilai
  - Props: `muridList`, `search`, `disabled`, `onNilaiClick`
  - Menampilkan nama, deskripsi, dan tombol edit nilai

- **`pagination-controls.svelte`** - Kontrol navigasi halaman
  - Props: `currentPage`, `totalPages`, `onPageClick`
  - Button untuk setiap halaman

- **`empty-states.svelte`** - Alert messages untuk state kosong
  - Props: `state` (no-keasramaan | no-selection | no-tujuan | no-murid | no-results)
  - Menampilkan pesan yang sesuai dengan kondisi

### Utilities (TypeScript)

- **`types.ts`** - Type definitions untuk halaman
  - `KeasramaanOption`, `KeasramaanDetail`, `MuridRow`, `PageData`, dll.

- **`utils.ts`** (Updated) - Utility functions
  - `kategoriToRubrikValue()` - Konversi kategori ke nilai rubrik
  - `nilaiAngkaToHuruf()` - Konversi angka ke huruf
  - `hitungNilaiIndikator()` - Hitung rata-rata nilai
  - `getIndikatorCategory()` - Ambil metadata kategori
  - `formatScore()` - Format nilai dengan 2 desimal
  - `capitalizeSentence()` - Uppercase huruf pertama
  - `buildNilaiLink()` - Build link untuk form asesmen

- **`navigation.ts`** - Navigation helper factory
  - `createNavigationActions()` - Factory untuk membuat navigation object
  - Methods: `selectKeasramaan()`, `applySearch()`, `gotoPage()`

- **`api.ts`** - API client functions
  - `downloadTemplate()` - Download template Excel
  - `importNilai()` - Import nilai dari file Excel

## Refactored Page (`+page.svelte`)

Halaman sekarang jauh lebih clean dengan:
- Hanya 215 baris (vs ~450 sebelumnya)
- Logika dipindahkan ke utility files
- UI components modular dan reusable
- Event handlers yang jelas dan terorganisir

## Keuntungan Modularisasi

✅ **Maintainability** - Setiap komponen punya satu tanggung jawab
✅ **Reusability** - Komponen dapat digunakan di halaman lain
✅ **Testability** - Lebih mudah untuk unit testing
✅ **Readability** - Kode lebih rapi dan mudah dipahami
✅ **Scalability** - Mudah untuk menambah fitur baru
