# Refactoring Komponen Keasramaan - Tujuan Pembelajaran

## Ringkasan Perubahan

Halaman Tujuan Pembelajaran Keasramaan (`src/routes/(mata-pelajaran)/keasramaan/tp/+page.svelte`) telah direfaktor dari satu file besar yang nested menjadi komponen-komponen modular yang lebih kecil dan mudah dirawat.

## Struktur Komponen Baru

### 1. **TujuanPembelajaranToolbar.svelte**

- **Tujuan**: Menampilkan toolbar dengan tombol aksi (Kembali, Tambah TP, Hapus TP)
- **Props**:
  - `isCreateMode`: Boolean untuk menunjukkan apakah form create sedang terbuka
  - `isEditMode`: Boolean untuk menunjukkan apakah form edit sedang terbuka
  - `anySelected`: Boolean apakah ada row yang terseleksi
  - `canManage`: Boolean izin manajemen data
  - `onToggleCreateForm`: Callback untuk toggle form create
  - `onOpenBulkDelete`: Callback untuk membuka modal delete bulk

### 2. **TujuanPembelajaranCreateRow.svelte**

- **Tujuan**: Menampilkan row form input untuk membuat tujuan pembelajaran baru
- **Props**:
  - `indikatorId`: ID indikator
  - `canManage`: Boolean izin manajemen
  - `onSuccess`: Callback saat form berhasil di-submit

### 3. **TujuanPembelajaranEditRow.svelte**

- **Tujuan**: Menampilkan row form input untuk mengedit tujuan pembelajaran
- **Props**:
  - `item`: Object item yang akan diedit `{ id, deskripsi }`
  - `indikatorId`: ID indikator
  - `deskripsiInput`: String nilai deskripsi saat ini
  - `canManage`: Boolean izin manajemen
  - `onSuccess`: Callback saat form berhasil di-submit
  - `onCancel`: Callback untuk membatalkan edit

### 4. **TujuanPembelajaranDeleteModal.svelte**

- **Tujuan**: Modal konfirmasi untuk menghapus satu atau lebih tujuan pembelajaran
- **Props**:
  - `deleteModalTitle`: Judul modal
  - `deleteModalItem`: Item yang akan dihapus (untuk single delete)
  - `deleteModalIds`: Array ID yang akan dihapus
  - `deleteModalDisabled`: Boolean untuk disable tombol hapus
  - `isDeleteModalOpen`: Boolean status modal
  - `onClose`: Callback saat modal ditutup

## Manfaat Refactoring

✅ **Separation of Concerns**: Setiap komponen memiliki tanggung jawab tunggal
✅ **Reusability**: Komponen dapat digunakan kembali atau di-copy ke halaman serupa
✅ **Maintainability**: Kode lebih mudah dibaca dan dirawat
✅ **Testability**: Setiap komponen dapat ditest secara independen
✅ **Scalability**: Mudah untuk menambah fitur baru

## File yang Diubah

- `src/routes/(mata-pelajaran)/keasramaan/tp/+page.svelte` - Halaman utama yang sudah disederhanakan
- `src/lib/components/keasramaan/index.ts` - Export baru untuk komponen

## File Baru Dibuat

- `src/lib/components/keasramaan/TujuanPembelajaranToolbar.svelte`
- `src/lib/components/keasramaan/TujuanPembelajaranCreateRow.svelte`
- `src/lib/components/keasramaan/TujuanPembelajaranEditRow.svelte`
- `src/lib/components/keasramaan/TujuanPembelajaranDeleteModal.svelte`

## Penggunaan

Komponen dapat diimport dari `$lib/components/keasramaan`:

```typescript
import {
	TujuanPembelajaranToolbar,
	TujuanPembelajaranCreateRow,
	TujuanPembelajaranEditRow,
	TujuanPembelajaranDeleteModal
} from '$lib/components/keasramaan';
```

Atau import secara langsung dari file masing-masing jika diperlukan.
