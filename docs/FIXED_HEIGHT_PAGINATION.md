# Solusi Fixed-Height Pagination untuk Rapor

## 🔥 Masalah Pendekatan Sebelumnya (Reactive Measurement)

### Timeline Observasi

```
t=0s   → Render: Tabel tumpang tindih ❌
t=2s   → Murid #1: Normal ✅
t=3s   → Murid #2,#3: Masih kacau ❌
t=5s   → Murid #1: KACAU LAGI! ❌❌
```

### Root Causes

#### 1. **Reactive Instability Loop**

```typescript
// Reactive system causes infinite loop:
$effect → trigger measurement
  → DOM change
  → $effect triggered again
  → measurement again
  → DOM change
  → loop...
```

#### 2. **Async Measurement vs Sync Rendering**

- Browser renders HTML instantly → tabel tampil **tanpa pagination**
- 100-500ms later → measurement selesai → pagination calculated
- State update → re-render → **triggers measurement again**
- Tidak stabil, unpredictable

#### 3. **Layout Thrashing**

```
30 murid × 120 rows × getBoundingClientRect() = 3,600+ forced reflows
Browser overwhelmed, layout calculation freeze
```

#### 4. **Race Conditions dalam Bulk**

- Semua 30 instance measure bersamaan
- Shared Map collision (sudah diperbaiki)
- Tapi masalah fundamental masih ada: **reactive re-calculation**

---

## ✅ Solusi Baru: Fixed-Height Calculation

### Konsep

**Tidak ada DOM measurement**. Semua calculation berdasarkan **pre-defined heights**.

```typescript
// Fixed heights (measured once, reused forever)
const HEIGHTS = {
  intrakRow: 38,           // px
  groupHeader: 42,         // px
  tailRow: 38,             // px
  footer: 180,             // px
  ...
};

// Paper capacity (calculated, not measured)
const FIRST_PAGE_AVAILABLE =
  CONTENT_HEIGHT_PX        // 971px (A4 - margins)
  - HEIGHTS.header         // -60px
  - HEIGHTS.identityTable  // -220px
  - HEIGHTS.tableHeader    // -45px
  - HEIGHTS.safetyMargin;  // -12px
  // = 634px available for rows
```

### Algoritma

```typescript
function paginateRaporWithFixedHeights(rows: TableRow[]) {
	let currentPage = [];
	let currentHeight = 0;

	for (const row of rows) {
		const rowHeight = estimateRowHeight(row); // Pre-defined, no DOM

		if (currentHeight + rowHeight > PAGE_CAPACITY) {
			// Push page, start new
			pages.push(currentPage);
			currentPage = [row];
			currentHeight = rowHeight;
		} else {
			currentPage.push(row);
			currentHeight += rowHeight;
		}
	}

	return pages;
}
```

**Key points**:

- ✅ **No `getBoundingClientRect()`** - zero forced reflows
- ✅ **No reactive re-calculation** - calculated once per data
- ✅ **No retry logic** - calculation is instant and deterministic
- ✅ **Predictable** - same input = same output, always

---

## 📊 Perbandingan

| Aspek                | Reactive Measurement | Fixed-Height Calc |
| -------------------- | -------------------- | ----------------- |
| **DOM Access**       | ❌ Ribuan kali       | ✅ Nol            |
| **Calculation Time** | ❌ 100-500ms         | ✅ <1ms           |
| **Stability**        | ❌ Reactive loop     | ✅ Run once       |
| **Bulk Mode**        | ❌ Overload          | ✅ Smooth         |
| **Predictability**   | ❌ Race conditions   | ✅ Deterministic  |
| **Code Complexity**  | ❌ 1000+ lines       | ✅ ~250 lines     |

---

## 🧪 Cara Testing

### Setup

1. Buka `src/lib/components/cetak/PreviewContent.svelte`
2. Ganti import:

```svelte
<!-- OLD -->
<script>
import RaporPreview from '$lib/components/cetak/preview/RaporPreview.svelte';
</script>

<!-- NEW -->
<script>
import RaporPreview from '$lib/components/cetak/preview/RaporPreviewFixed.svelte';
</script>
```

3. Atau buat A/B testing dengan query param:

```svelte
<script>
	import { page } from '$app/state';
	import RaporPreview from '$lib/components/cetak/preview/RaporPreview.svelte';
	import RaporPreviewFixed from '$lib/components/cetak/preview/RaporPreviewFixed.svelte';

	const useFixed = $derived($page.url.searchParams.get('fixed') === '1');
</script>

{#if useFixed}
	<RaporPreviewFixed ... />
{:else}
	<RaporPreview ... />
{/if}
```

### Test Cases

#### Test 1: Single Murid

```
1. Pilih "Rapor"
2. Pilih satu murid
3. Klik "Preview"
4. Verifikasi:
   - ✅ Tabel tidak menembus batas kertas
   - ✅ Page break di tempat yang tepat
   - ✅ Footer placement correct
   - ✅ Tidak ada flashing/jumping content
```

#### Test 2: Bulk Mode (10 Murid)

```
1. Klik "Preview Semua Murid"
2. Wait for loading
3. Verifikasi:
   - ✅ Semua murid ter-render dengan benar
   - ✅ Tidak ada tabel yang tumpang tindih
   - ✅ Tidak ada content yang menembus kertas
   - ✅ Loading smooth, tidak freeze
   - ✅ Console clean (check instanceId logs)
```

#### Test 3: Bulk Mode (30 Murid)

```
1. Kelas dengan banyak murid
2. "Preview Semua Murid"
3. Verifikasi:
   - ✅ Browser tidak freeze
   - ✅ All layouts correct
   - ✅ Consistent pagination across all murids
```

#### Test 4: Edge Cases

```
- Murid dengan nilai sangat banyak (5+ pages)
- Murid dengan nilai sedikit (1 page)
- Murid tanpa nilai intrakurikuler
- Kelas tanpa kokurikuler
- Toggle background logo
```

---

## 🔧 Fine-tuning Heights

Jika pagination tidak pas, adjust heights di `src/lib/utils/rapor-pagination-fixed.ts`:

```typescript
const HEIGHTS = {
	// Adjust these values based on actual rendering
	intrakRow: 38, // If rows are taller, increase
	groupHeader: 42, // If headers overflow, increase
	footer: 180, // If signatures are cut off, increase
	safetyMargin: 12 // Increase for more conservative pagination
};
```

**Cara measure height yang tepat**:

1. Preview satu murid dengan dev tools
2. Inspect element → Computed → Height
3. Update konstanta di code
4. Refresh → test again

---

## ⚖️ Trade-offs

### Fixed-Height Approach

**Pros** ✅:

- Extremely fast (<1ms calculation)
- Completely stable (no reactive loops)
- Predictable and deterministic
- Scales perfectly to bulk mode
- Simple, maintainable code

**Cons** ❌:

- Requires manual height calibration
- Less flexible for dynamic content
- Must update if styles change

### Reactive Measurement Approach

**Pros** ✅:

- Theoretically adapts to any content
- No manual height calibration
- Automatically handles style changes

**Cons** ❌:

- **Fundamentally unstable** in bulk mode
- Extremely slow (100-500ms+ per murid)
- Race conditions unavoidable
- Complex code (retry logic, queue system)
- Layout thrashing

---

## 🎯 Rekomendasi

**Gunakan Fixed-Height** kecuali Anda memiliki requirement:

- Content height yang **extremely variable**
- User-generated styles yang berubah-ubah
- Multi-language dengan text height yang tidak predictable

Untuk use case "Rapor Kurikulum Merdeka":

- ✅ Layout fixed dan well-defined
- ✅ Content format consistent
- ✅ Bulk printing adalah core feature
- → **Fixed-Height adalah solusi terbaik**

---

## 🚀 Next Steps

1. **Test** fixed-height approach dengan skenario real
2. **Calibrate** heights jika ada pagination yang tidak pas
3. **Monitor** console logs untuk any issues
4. **Compare** performance: old vs new
5. **Decide**: commit to fixed-height atau butuh hybrid approach

---

## 💡 Hybrid Approach (Future)

Jika diperlukan, bisa kombinasikan:

```typescript
// Use fixed for initial render (fast)
const initialPages = paginateWithFixedHeights(rows);

// Then optionally measure and adjust (lazy)
onMount(async () => {
	await tick();
	const adjustedPages = await refineWithMeasurement(initialPages);
	if (hasSignificantDifference(initialPages, adjustedPages)) {
		pages = adjustedPages;
	}
});
```

Tapi untuk sekarang, **pure fixed-height should be sufficient**.
