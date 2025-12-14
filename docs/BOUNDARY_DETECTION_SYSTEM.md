# Sistem Boundary Detection untuk Rapor Pagination

## 📌 Konsep Dasar

Sistem baru ini menggunakan **boundary detection** berbasis **DOM measurement** untuk memecah tabel rapor ke halaman yang berbeda. Berbeda dengan sistem fixed-height calculation yang menggunakan estimasi, sistem ini mengukur posisi aktual elemen di DOM.

## 🔄 Proses Kerja

### 1. **Measurement Phase** (Fase Pengukuran)

```
Render semua rows dalam container virtual (offscreen)
    ↓
Tunggu DOM fully rendered (~100ms)
    ↓
Measure posisi setiap row dengan getBoundingClientRect()
    ↓
Simpan data: top, bottom, height untuk setiap row
```

### 2. **Boundary Detection Phase** (Fase Deteksi Batas)

```
Untuk setiap row:
  - Cek apakah bottom row > availableHeight (boundary trigger)
  - Jika YA: split ke halaman baru
  - Jika TIDAK: tambahkan ke halaman saat ini

Special handling:
  - Prevent orphaned headers (group header, ekstrakurikuler header)
  - Determine footer placement (last page or separate page)
```

### 3. **Render Phase** (Fase Rendering Final)

```
Render hasil pagination yang sudah dideteksi
    ↓
Semua pages dengan rows yang tepat
    ↓
Footer ditempatkan dengan benar
    ↓
Ready untuk print!
```

## 🎯 Keunggulan

### vs Fixed-Height Calculation

| Aspek             | Fixed-Height              | Boundary Detection         |
| ----------------- | ------------------------- | -------------------------- |
| **Akurasi**       | ❌ Estimasi, bisa meleset | ✅ Ukuran aktual dari DOM  |
| **Ruang kosong**  | ❌ Sering ada gap besar   | ✅ Optimized per row       |
| **Overflow**      | ❌ Kadang melebihi batas  | ✅ Deteksi presisi         |
| **Adaptabilitas** | ❌ Harus adjust manual    | ✅ Auto-adapt dengan style |
| **Maintenance**   | ❌ Update constants       | ✅ Tidak perlu update      |

## 🏗️ Struktur Kode

### File Utama

1. **`src/lib/utils/rapor-boundary-detection.ts`**
   - Logic untuk boundary detection
   - Functions: `measureRows()`, `detectBoundaryViolations()`, `calculatePageBoundary()`

2. **`src/lib/components/cetak/preview/RaporPreviewFixed.svelte`**
   - Komponen preview dengan boundary detection
   - Two-phase rendering: measurement → display

3. **`src/lib/components/cetak/rapor/RaporIntrakTable.svelte`**
   - Menambahkan `data-row-order` attribute pada setiap `<tr>`

## 📐 Boundary Calculation

```typescript
// Paper A4: 297mm - 40mm padding = 257mm ≈ 971px
const CONTENT_HEIGHT_PX = 971;

// Halaman pertama
const FIRST_PAGE_AVAILABLE =
	971 -
	HEIGHTS.header - // 70px
	HEIGHTS.identityTable - // 200px
	HEIGHTS.tableHeader - // 45px
	HEIGHTS.pageFooter; // 45px
// = 611px

// Halaman lanjutan
const CONTINUATION_PAGE_AVAILABLE =
	971 -
	HEIGHTS.tableHeader - // 45px
	HEIGHTS.pageFooter; // 45px
// = 881px
```

## 🔍 Boundary Trigger

```typescript
for (const measurement of measurements) {
	const { row, bottom } = measurement;

	// TRIGGER: bottom row melebihi availableHeight?
	if (bottom > boundary.availableHeight) {
		// SPLIT ke halaman baru
		pages.push({ rows: currentPageRows });
		currentPageRows = [row];
	} else {
		// TAMBAHKAN ke halaman saat ini
		currentPageRows.push(row);
	}
}
```

## 🛡️ Orphan Prevention

Mencegah header sendirian di akhir halaman:

```typescript
// Cek baris terakhir di halaman saat ini
if (lastRow.kind === 'intrak-group-header' || lastRow.kind === 'ekstrakurikuler-header') {
	// Pindahkan header ke halaman berikutnya
	currentPageRows.pop();

	// Simpan halaman saat ini
	pages.push({ rows: currentPageRows });

	// Mulai halaman baru dengan: header + row berikutnya
	currentPageRows = [header, nextRow];
}
```

## 🎨 Two-Phase Rendering

### Phase 1: Measurement (Hidden)

```svelte
{#if !detectionComplete}
	<div style="position: absolute; left: -9999px; opacity: 0;">
		<!-- Render ALL rows untuk diukur -->
		<RaporIntrakTable rows={tableRows} ... />
	</div>

	<div>
		<span class="loading loading-spinner"></span>
		Mengukur layout...
	</div>
{/if}
```

### Phase 2: Display (Visible)

```svelte
{:else}
  <div>
    {#each pages as page}
      <PrintCardPage>
        <RaporIntrakTable rows={page.rows} ... />

        {#if page.hasFooter}
          <section><!-- Tanda tangan --></section>
        {/if}
      </PrintCardPage>
    {/each}
  </div>
{/if}
```

## 🐛 Debugging

Lihat console untuk info pagination:

```
[Boundary Detection] Ahmad Rizki: {
  pages: 3,
  measurements: 45,
  details: [
    {
      page: 1,
      rows: 18,
      footer: false,
      used: 598,
      capacity: 611,
      remaining: 13,
      utilization: "98%",
      status: "✅"
    },
    {
      page: 2,
      rows: 20,
      footer: false,
      used: 870,
      capacity: 881,
      remaining: 11,
      utilization: "99%",
      status: "✅"
    },
    {
      page: 3,
      rows: 7,
      footer: true,
      used: 350,
      capacity: 881,
      remaining: 531,
      utilization: "40%",
      status: "✅"
    }
  ]
}
```

## ⚠️ Trade-offs

### Kelebihan ✅

- Akurasi tinggi (ukuran aktual)
- Tidak ada ruang kosong berlebih
- Tidak ada overflow
- Adaptif dengan perubahan style
- Tidak perlu manual calibration

### Kekurangan ❌

- Butuh two-phase rendering (measurement + display)
- Loading time ~100-200ms per murid
- Sedikit lebih kompleks dari calculation
- DOM measurement bisa lambat di bulk mode (tapi masih smooth dengan optimization)

## 🚀 Performance di Bulk Mode

Untuk 30 murid:

```
Total measurement time: ~100ms × 30 = 3000ms (3 detik)
```

Sudah dioptimasi dengan:

- Sequential detection (tidak semua bersamaan)
- Offscreen rendering untuk measurement
- Efficient DOM queries dengan `data-row-order`

## 📝 Cara Menggunakan

Sistem ini sudah terintegrasi di `RaporPreviewFixed.svelte`. Tidak perlu konfigurasi tambahan:

```svelte
<RaporPreviewFixed data={raporData} muridProp={murid} onPrintableReady={handleReady} />
```

Komponen akan:

1. Render measurement phase (hidden)
2. Measure semua rows
3. Detect boundaries
4. Re-render dengan pagination yang benar
5. Callback `onPrintableReady` setelah selesai

---

Sistem ini memberikan akurasi maksimal dengan mengukur posisi aktual elemen, memastikan tidak ada ruang kosong berlebih atau overflow yang melewati batas kertas.
