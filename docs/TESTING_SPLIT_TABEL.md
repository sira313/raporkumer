# Perbaikan Split Tabel Rapor - Testing Guide

## 🔧 Perubahan Yang Dilakukan

### 1. **Height Estimates Yang Lebih Akurat**

**Before**:

```typescript
intrakRow: 38,           // Terlalu kecil!
intrakRowMultiline: 60,  // Masih terlalu kecil
```

**After**:

```typescript
intrakRowBase: 56,       // Base row height
intrakRowPerLine: 20,    // Height per line of deskripsi
// Calculation: base + (estimated_lines × per_line)
// Result: 56 + (3 × 20) = 116px untuk row dengan deskripsi sedang
```

### 2. **Conservative Capacity Calculation**

- **First Page**: 971px - 80 (header) - 240 (identity) - 48 (table header) - 50 (footer) - 24 (margin) = **~529px**
- **Continuation Page**: 971px - 48 (header) - 50 (footer) - 24 (margin) = **~849px**

Lebih konservatif dari sebelumnya untuk mencegah overflow.

### 3. **Deskripsi Length Estimation**

```typescript
// Asumsi ~60 chars per line (conservative)
const estimatedLines = Math.max(2, Math.ceil(deskripsiLength / 60));
```

Dari screenshot, deskripsi rata-rata 150-250 karakter = 3-5 baris.

### 4. **Enhanced Debug Logging**

Setiap pagination sekarang log:

- Capacity per page
- Estimated height per page
- **Overflow warning** jika ada page yang melebihi capacity

---

## 🧪 Cara Testing

### Step 1: Buka Dev Tools Console

1. Buka browser dev tools (F12)
2. Pilih tab "Console"
3. Filter dengan keyword: `[Fixed Pagination]`

### Step 2: Test Single Preview

1. Pilih "Rapor"
2. Pilih **satu murid** (yang punya banyak nilai)
3. Klik **"Preview"**
4. **Lihat console** untuk log seperti ini:

```
[Fixed Pagination] Capacity Calculation: {
  contentHeightPx: 971,
  firstPageAvailable: 529,
  continuationAvailable: 849,
  ...
}

[Fixed Pagination] Ananda Arkle Yoel: {
  totalPages: 3,
  pages: [
    { page: 1, rowCount: 5, estimatedHeight: 520, capacity: 529, overflow: -9, fits: true },
    { page: 2, rowCount: 8, estimatedHeight: 840, capacity: 849, overflow: -9, fits: true },
    { page: 3, rowCount: 3, estimatedHeight: 380, capacity: 849, overflow: -469, fits: true }
  ]
}
```

**Verifikasi**:

- ✅ `fits: true` untuk semua pages
- ✅ Tidak ada warning overflow
- ✅ Visual: tabel tidak menembus batas kertas

### Step 3: Test Bulk Mode

1. Klik **"Preview Semua Murid"**
2. **Lihat console** - seharusnya ada log untuk setiap murid
3. **Cari warning** - cek apakah ada murid yang overflow

```
[Fixed Pagination] WARNING: 2 pages overflow!
```

Jika ada warning, lihat detail page mana yang overflow.

### Step 4: Visual Verification

**Check untuk setiap murid**:

- [ ] Header "Laporan Hasil Belajar" di posisi tepat
- [ ] Tabel identitas tidak terpotong
- [ ] **Tabel intrakurikuler tidak menembus batas kertas**
- [ ] Page break terjadi di tempat yang tepat
- [ ] Footer/signature di posisi yang benar
- [ ] Tidak ada content yang tumpang tindih

---

## 🔍 Troubleshooting

### Jika Masih Ada Overflow

**Symptom**: Console log menunjukkan `fits: false` atau warning overflow.

**Solution 1: Increase Safety Margin**

Edit `src/lib/utils/rapor-pagination-fixed.ts`:

```typescript
const HEIGHTS = {
  safetyMargin: 24,  // Increase to 36 or 48
  ...
}
```

**Solution 2: Adjust Row Heights**

Jika specific row type yang bermasalah:

```typescript
const HEIGHTS = {
  intrakRowBase: 56,      // Increase if rows overflow
  intrakRowPerLine: 20,   // Increase if multi-line rows overflow
  groupHeader: 48,        // Increase if group headers cut off
  ...
}
```

**Solution 3: Measure Actual Heights**

1. Preview satu murid
2. Inspect element di dev tools
3. Lihat "Computed" tab → Height
4. Update konstanta di code

---

## 📊 Expected Results

### Single Preview

- **Loading**: Instant (<50ms)
- **Console**: 1 log entry dengan pagination details
- **Visual**: Perfect page breaks

### Bulk Preview (10 murid)

- **Loading**: Fast (~200-500ms)
- **Console**: 10 log entries, no warnings
- **Visual**: All murids paginated correctly

### Bulk Preview (30 murid)

- **Loading**: Moderate (~1-2 seconds)
- **Console**: 30 log entries, no warnings
- **Visual**: Consistent pagination across all

---

## 🐛 Known Issues & Workarounds

### Issue: Rows with Extremely Long Deskripsi

**Symptom**: Row terpotong di tengah deskripsi.

**Current**: Capped at 200px maximum.

**Workaround**: Increase cap in `estimateRowHeight()`:

```typescript
return Math.min(estimatedHeight, 250); // Was 200
```

### Issue: Tail Blocks Variable Height

**Symptom**: Kokurikuler/ekstrakurikuler dengan banyak item overflow.

**Current**: Fixed estimate (180px).

**Workaround**: Increase block heights:

```typescript
kokurikulerBlock: 220,      // Was 180
ekstrakurikulerBlock: 220,  // Was 180
```

---

## ✅ Success Criteria

Pagination dianggap berhasil jika:

1. ✅ Console: No overflow warnings
2. ✅ Visual: No content menembus batas kertas
3. ✅ Visual: No overlapping content
4. ✅ Loading: Smooth tanpa freeze (even 30+ murid)
5. ✅ Consistency: Sama untuk single dan bulk mode

---

## 🚀 Next Steps

Setelah testing:

1. **Report hasil** - screenshot console + visual issues
2. **Jika ada overflow** - share console log yang menunjukkan page mana
3. **Fine-tune heights** berdasarkan actual rendering
4. **Iterate** sampai semua cases work perfectly

---

## 💡 Tips

- **Test dengan murid yang punya banyak nilai** (5+ mata pelajaran)
- **Test dengan murid yang punya sedikit nilai** (1-2 mata pelajaran)
- **Test dengan deskripsi panjang** (>200 karakter)
- **Test dengan kelas yang punya kokurikuler**
- **Test dengan kelas yang tidak punya kokurikuler**

Goal: Pagination konsisten dan reliable across all scenarios.
