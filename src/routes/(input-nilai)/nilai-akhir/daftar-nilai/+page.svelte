<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- simple href links used for per-row navigation */
	import Icon from '$lib/components/icon.svelte';
	import { page } from '$app/state';

	let { data } = $props();
	const status = $derived(data.status ?? 'empty');
	const murid = $derived(data.murid ?? null);
	const daftarNilai = $derived(status === 'ready' ? (data.daftarNilai ?? []) : []);
	const ringkasan = $derived(
		status === 'ready'
			? (data.ringkasan ?? { rataRata: null, mapelDinilai: 0, totalMapel: 0 })
			: { rataRata: null, mapelDinilai: 0, totalMapel: 0 }
	);
	const hasNilai = $derived(status === 'ready' && ringkasan.totalMapel > 0);
	const kelasAktif = $derived(page.data.kelasAktif ?? null);
	const kelasAktifLabel = $derived.by(() => {
		if (!kelasAktif) return null;
		return kelasAktif.fase ? `${kelasAktif.nama} - ${kelasAktif.fase}` : kelasAktif.nama;
	});
	let exporting = $state(false);

	function formatScore(value: number | null) {
		if (value == null) return '&mdash;';
		return value.toLocaleString('id-ID', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
	}

	const rataRataDisplay = $derived.by(() => formatScore(ringkasan.rataRata));
	const coverageDisplay = $derived.by(() => {
		if (!ringkasan.totalMapel) return '0/0 Mata Pelajaran';
		return `${ringkasan.mapelDinilai}/${ringkasan.totalMapel} Mata Pelajaran`;
	});

	async function handleExport() {
		if (!murid || !hasNilai || exporting) return;
		try {
			exporting = true;
			const ExcelJS = (await import('exceljs')).default ?? (await import('exceljs'));
			const headerRows: (string | number)[][] = [
				['Rekap Nilai Akhir Murid'],
				['Nama Murid', murid.nama],
				['Kelas', kelasAktifLabel ?? '-'],
				['Rata-rata', ringkasan.rataRata ?? ''],
				['Mapel Dinilai', `${ringkasan.mapelDinilai} dari ${ringkasan.totalMapel}`],
				[]
			];
			const tableHeader = ['No', 'Mata Pelajaran', 'Nilai Akhir', 'Status'];
			const tableRows = daftarNilai.map(
				(nilai: {
					no: number;
					mataPelajaran: string;
					sudahDinilai: boolean;
					nilaiAkhir: number | null;
				}) => [
					nilai.no,
					nilai.mataPelajaran,
					nilai.sudahDinilai && typeof nilai.nilaiAkhir === 'number'
						? Number.parseFloat(nilai.nilaiAkhir.toFixed(2))
						: null,
					nilai.sudahDinilai ? 'Sudah Dinilai' : 'Belum Dinilai'
				]
			);
			const workbook = new ExcelJS.Workbook();
			const worksheet = workbook.addWorksheet('Nilai Akhir');
			worksheet.addRows([...headerRows, tableHeader, ...tableRows]);
			// set approximate column widths
			try {
				const colDefs: Array<{ wch?: number }> = [
					{ wch: 6 },
					{ wch: 40 },
					{ wch: 14 },
					{ wch: 18 }
				];
				for (let i = 0; i < colDefs.length; i += 1) {
					const def = colDefs[i];
					if (def && def.wch) worksheet.getColumn(i + 1).width = def.wch;
				}
				worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: headerRows.length + 1 }];
			} catch {
				// ignore view/width errors in some runtimes
			}
			const safeName = murid.nama.replace(/[<>:"/\\|?*]+/g, ' ').trim() || 'murid';
			const kelasName = kelasAktifLabel ? ` - ${kelasAktifLabel}` : '';
			const timestamp = new Date().toISOString().slice(0, 10);
			const fileName = `Nilai Akhir - ${safeName}${kelasName} - ${timestamp}.xlsx`;
			try {
				const buf = await workbook.xlsx.writeBuffer();
				const srcView = ArrayBuffer.isView(buf)
					? new Uint8Array(
							(buf as ArrayBufferView).buffer,
							(buf as ArrayBufferView).byteOffset,
							(buf as ArrayBufferView).byteLength
						)
					: new Uint8Array(buf as ArrayBufferLike);
				const uint8 = Uint8Array.from(srcView);
				const blob = new Blob([uint8], {
					type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				});
				const link = document.createElement('a');
				link.href = URL.createObjectURL(blob);
				link.download = fileName;
				document.body.appendChild(link);
				link.click();
				link.remove();
				URL.revokeObjectURL(link.href);
			} catch (e) {
				console.error('Gagal menulis file Excel di client', e);
			}
		} catch (error) {
			console.error('Gagal mengekspor nilai akhir', error);
		} finally {
			exporting = false;
		}
	}
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<div class="mb-2 flex flex-col gap-2 sm:flex-row">
		<a href="/nilai-akhir/" class="btn btn-soft shadow-none">
			<Icon name="left" />
			Kembali
		</a>
		<button
			class="btn btn-soft shadow-none sm:ml-auto"
			class:loading={exporting}
			disabled={!hasNilai || exporting}
			title={exporting
				? 'Sedang menyiapkan file Excel'
				: hasNilai
					? 'Unduh nilai murid'
					: 'Belum ada nilai untuk diexport'}
			onclick={handleExport}
		>
			<Icon name="export" />
			Export
		</button>
	</div>

	{#if status === 'ready' && murid}
		<div class="border-base-200 flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-center">
			<div>
				<h2 class="text-xl font-bold">Rekap Nilai Akhir Murid</h2>
				<p class="text-base-content/80">{murid.nama}</p>
				{#if kelasAktifLabel}
					<p class="text-base-content/60 text-sm">Kelas {kelasAktifLabel}</p>
				{/if}
			</div>
			<div class="divider sm:divider-horizontal"></div>
			<div class="flex flex-wrap gap-4">
				<div>
					<p class="text-base-content/60 text-sm tracking-wide uppercase">Rata-rata</p>
					<p class="text-3xl font-semibold">{@html rataRataDisplay}</p>
				</div>
				<div>
					<p class="text-base-content/60 text-sm tracking-wide uppercase">Mapel Dinilai</p>
					<p class="text-xl font-semibold">{coverageDisplay}</p>
				</div>
			</div>
		</div>

		<div role="alert" class="alert rounded-box alert-soft alert-info mt-4">
			<span class="text-2xl">
				<Icon name="info" />
			</span>
			<span>
				<p class="text-lg">
					Nilai rata-rata ananda <b>{murid.nama}</b>
				</p>
				<p class="text-2xl font-bold">{@html rataRataDisplay}</p>
				<p class="text-base-content/70 text-sm">
					Menggunakan nilai akhir seluruh mata pelajaran yang tersedia.
				</p>
			</span>
		</div>

		<div
			class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none"
		>
			<table class="border-base-200 table border dark:border-none">
				<thead>
					<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
						<th style="width: 50px; min-width: 40px;">No</th>
						<th class="w-full" style="min-width: 150px;">Mata Pelajaran</th>
						<th style="min-width: 120px;">Nilai Akhir</th>
					</tr>
				</thead>
				<tbody>
					{#if hasNilai}
						{#each daftarNilai as nilai (nilai.mataPelajaranId)}
							<tr>
								<td>{nilai.no}</td>
								<td>{nilai.mataPelajaran}</td>
								<td
									class={`font-semibold${nilai.sudahDinilai ? '' : ' text-base-content/60 italic'}`}
								>
									{@html formatScore(nilai.nilaiAkhir)}
								</td>
							</tr>
						{/each}
					{:else}
						<tr>
							<td colspan="3" class="p-8 text-center">
								<em class="opacity-60">Belum ada nilai akhir yang terinput untuk murid ini.</em>
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="alert alert-soft alert-warning mt-4 flex items-start gap-3">
			<Icon name="warning" class="text-xl" />
			<span>
				{#if status === 'not-found'}
					<p class="font-semibold">Murid tidak ditemukan.</p>
					<p class="text-base-content/70 text-sm">
						Pastikan Anda memilih murid dari daftar rekap yang sama.
					</p>
				{:else}
					<p class="font-semibold">Pilih murid terlebih dahulu.</p>
					<p class="text-base-content/70 text-sm">
						Gunakan tombol "Lihat" pada halaman Rekap Nilai Akhir untuk membuka rincian.
					</p>
				{/if}
			</span>
		</div>
	{/if}
</div>
