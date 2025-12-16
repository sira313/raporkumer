# Migrasi Rapor Keasramaan ke jsPDF-AutoTable

## 📋 Overview

Sistem cetak rapor keasramaan telah dimigrasi dari HTML/CSS print ke jsPDF-AutoTable untuk mengatasi masalah pagination yang kompleks dengan konten dinamis.

## 🎯 Pendekatan Dual System

### Preview (HTML/CSS)

- Tetap menggunakan component Svelte existing
- WYSIWYG preview di browser
- User bisa melihat tampilan sebelum download
- Path: `src/lib/components/cetak/preview/KeasramaanPreview.svelte`

### Export PDF (jsPDF-AutoTable)

- Generate PDF langsung dari data
- Auto-pagination tanpa kompleksitas boundary detection
- Desain mengikuti template HTML
- Path: `src/lib/utils/pdf/keasramaan-pdf-generator.ts`

## 🔧 Implementasi

### 1. Dependencies

```json
{
	"jspdf": "^3.0.4",
	"jspdf-autotable": "^5.0.2"
}
```

### 2. PDF Generator API

```typescript
import { downloadKeasramaanPDF } from '$lib/utils/pdf/keasramaan-pdf-generator';

await downloadKeasramaanPDF({
  sekolah: { nama, npsn, alamat, logoUrl },
  murid: { nama, nis, nisn },
  rombel: { nama },
  periode: { tahunAjaran, semester },
  waliAsrama: { nama, nip },
  waliAsuh: { nama, nip },
  kepalaSekolah: { nama, nip, statusKepalaSekolah },
  ttd: { tempat, tanggal },
  kehadiran: { sakit, izin, alfa },
  keasramaanRows: [...]
});
```

### 3. UI Integration

Tombol "Download PDF" ditambahkan di halaman cetak:

- Muncul setelah preview berhasil
- Hanya untuk single murid (bukan bulk mode)
- Path: `src/routes/cetak/keasramaan/+page.svelte`

## 📐 Layout PDF

### Ukuran & Margin

- Format: A4 Portrait (210mm × 297mm)
- Margin: 20mm all sides
- Font: Helvetica

### Struktur Halaman

**Page 1:**

1. Header Judul (centered, bold)
2. Identity Table (2 kolom: label | value)
3. Main Table: Keasramaan Rows
   - Auto page break
   - Header repeat di setiap halaman

**Page N (lanjutan):**

- Main table continues
- Header table di-repeat

**Last Page:**

- Kehadiran Section (3 rows)
- Signature Grid (2×2 layout)

### Column Widths

- No: 12mm (center)
- Indikator: 60mm
- Predikat: 20mm (center)
- Deskripsi: auto (remaining width)

## ✅ Keuntungan

1. **No More Boundary Detection Complexity**
   - jsPDF-AutoTable handle pagination otomatis
   - Tidak perlu iterative measurement
   - Tidak perlu simulasi posisi

2. **Reliable Pagination**
   - Split row konsisten
   - Tidak ada row terpotong
   - Header repeat otomatis

3. **Maintainable**
   - Kode lebih simple
   - Styling explicit (tidak bergantung CSS)
   - Debug lebih mudah

4. **Performance**
   - Generate PDF cepat
   - Tidak perlu multiple DOM render
   - Memory efficient

## 🚀 Future Enhancement

1. **Bulk PDF Export**
   - Generate multiple PDF sekaligus
   - Merge atau ZIP multiple files

2. **Logo Sekolah**
   - Support embed logo ke PDF
   - Convert URL/blob ke base64

3. **Custom Styling**
   - Theme options
   - Font customization
   - Color scheme

4. **Progress Indicator**
   - Loading state saat generate PDF
   - Progress bar untuk bulk export

## 🔗 References

- [jsPDF Documentation](https://github.com/parallax/jsPDF)
- [jsPDF-AutoTable Documentation](https://github.com/simonbengtsson/jsPDF-AutoTable)
- [NPM Package](https://www.npmjs.com/package/jspdf-autotable)
