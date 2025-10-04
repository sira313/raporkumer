<script lang="ts">
	import { invalidate } from '$app/navigation';
	import Icon from '$lib/components/icon.svelte';
	import FormEnhance from '$lib/components/form-enhance.svelte';

	type Entry = {
		index: number;
		tujuanPembelajaranId: number;
		deskripsi: string;
		lingkupMateri: string;
		bobot: number | null;
		nilai: number | null;
	};

	type PageData = {
		murid: { id: number; nama: string };
		mapel: { id: number; nama: string; kkm: number };
		hasTujuan: boolean;
		entries: Entry[];
		initialScores: {
			naLingkup: number | null;
			sasTes: number | null;
			sasNonTes: number | null;
			sas: number | null;
			nilaiAkhir: number | null;
		};
	};

	type EntryDraft = Entry & { nilaiText: string };
 	type LingkupSummary = {
 		lingkupMateri: string;
 		bobot: number | null;
 		rataRata: number | null;
 	};
	type SavePayload = {
		tujuanScores: { tujuanPembelajaranId: number; nilai: number | null }[];
		aggregates: {
			naLingkup: number | null;
			sasTes: number | null;
			sasNonTes: number | null;
			sas: number | null;
			nilaiAkhir: number | null;
		};
	};
	type NilaiAkhirCategory = {
		key: 'perlu-bimbingan' | 'cukup' | 'baik' | 'sangat-baik';
		label: string;
		className: string;
		icon: 'error' | 'alert' | 'check' | 'info';
		description: string;
	};

	let { data }: { data: PageData } = $props();

	function formatScore(value: number | null) {
		if (value == null || Number.isNaN(value)) return '—';
		return value.toFixed(2);
	}

	function toInputText(value: number | null) {
		return value != null ? value.toFixed(2) : '';
	}

	function toDraft(entry: Entry): EntryDraft {
		const nilaiText = toInputText(entry.nilai);
		return { ...entry, nilaiText };
	}

	function normalizeScoreText(text: string) {
		const trimmed = text.trim();
		if (!trimmed) return null;
		const normalized = trimmed.replace(',', '.');
		const pattern = /^(?:100(?:\.0{1,2})?|\d{1,2}(?:\.\d{1,2})?)$/;
		if (!pattern.test(normalized)) return null;
		const value = Number.parseFloat(normalized);
		if (!Number.isFinite(value) || value < 0 || value > 100) return null;
		return Math.round(value * 100) / 100;
	}

	function isScoreValid(text: string) {
		if (!text.trim()) return true;
		return normalizeScoreText(text) != null;
	}

	let entries = $state(data.entries.map(toDraft));
	let sasTesText = $state(
		data.initialScores.sasTes != null ? data.initialScores.sasTes.toFixed(2) : ''
	);
	let sasNonTesText = $state(
		data.initialScores.sasNonTes != null ? data.initialScores.sasNonTes.toFixed(2) : ''
	);

	$effect(() => {
		entries = data.entries.map(toDraft);
		sasTesText = data.initialScores.sasTes != null ? data.initialScores.sasTes.toFixed(2) : '';
		sasNonTesText =
			data.initialScores.sasNonTes != null ? data.initialScores.sasNonTes.toFixed(2) : '';
	});

	const lingkupSummaries = $derived.by((): LingkupSummary[] => {
		const grouped = new Map<
			string,
			{
				bobot: number | null;
				values: number[];
			}
		>();

		for (const entry of entries) {
			const key = entry.lingkupMateri;
			let group = grouped.get(key);
			if (!group) {
				group = { bobot: entry.bobot ?? null, values: [] };
				grouped.set(key, group);
			} else if (group.bobot == null && entry.bobot != null) {
				group.bobot = entry.bobot;
			}
			const score = normalizeScoreText(entry.nilaiText);
			if (score != null) {
				group.values.push(score);
			}
		}

		return Array.from(grouped.entries(), ([lingkupMateri, group]) => {
			const avg = group.values.length
				? Math.round(
						(group.values.reduce((sum, value) => sum + value, 0) / group.values.length) * 100
					) / 100
				: null;
			return { lingkupMateri, bobot: group.bobot, rataRata: avg } satisfies LingkupSummary;
		});
	});

	const naSumatifLingkup = $derived.by(() => {
		const summaries = lingkupSummaries;
		if (!summaries.length) return null;
		const totalWeight = summaries
			.map((item) => item.bobot ?? 0)
			.reduce((sum, value) => sum + value, 0);
		const weighted = summaries.reduce(
			(
				acc,
				item
			): {
				sum: number;
				weight: number;
				fallbackSum: number;
				fallbackCount: number;
			} => {
				if (item.rataRata == null) return acc;
				const bobot = item.bobot ?? 0;
				if (bobot > 0) {
					return {
						sum: acc.sum + item.rataRata * bobot,
						weight: acc.weight + bobot,
						fallbackSum: acc.fallbackSum,
						fallbackCount: acc.fallbackCount
					};
				}
				return {
					sum: acc.sum,
					weight: acc.weight,
					fallbackSum: acc.fallbackSum + item.rataRata,
					fallbackCount: acc.fallbackCount + 1
				};
			},
			{ sum: 0, weight: 0, fallbackSum: 0, fallbackCount: 0 }
		);

		if (weighted.weight > 0) {
			return Math.round((weighted.sum / weighted.weight) * 100) / 100;
		}
		if (weighted.fallbackCount > 0) {
			return Math.round((weighted.fallbackSum / weighted.fallbackCount) * 100) / 100;
		}
		return null;
	});

	const sasTesValue = $derived.by(() => normalizeScoreText(sasTesText));
	const sasNonTesValue = $derived.by(() => normalizeScoreText(sasNonTesText));

	const nilaiSas = $derived.by(() => {
		const values = [sasTesValue, sasNonTesValue].filter(
			(value): value is number => value != null
		);
		if (!values.length) return null;
		return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
	});

	const nilaiAkhir = $derived.by(() => {
		const values = [naSumatifLingkup, nilaiSas].filter(
			(value): value is number => value != null
		);
		if (!values.length) return null;
		return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
	});

	const nilaiAkhirCategory = $derived.by((): NilaiAkhirCategory | null => {
		const nilai = nilaiAkhir;
		if (nilai == null) return null;
		const baseKkm = Math.max(0, kkm);
		const thresholdCukup = baseKkm * 1.15;
		const thresholdBaik = baseKkm * 1.3;
		if (nilai < baseKkm) {
			return {
				key: 'perlu-bimbingan',
				label: 'Perlu Bimbingan',
				className: 'alert-error',
				icon: 'error',
				description: `Nilai akhir berada di bawah KKM (${formatScore(baseKkm)}).`
			};
		}
		if (nilai < thresholdCukup) {
			return {
				key: 'cukup',
				label: 'Cukup',
				className: 'alert-warning',
				icon: 'alert',
				description: `Nilai akhir berada pada rentang ≥ KKM (${formatScore(baseKkm)}) dan < ${formatScore(thresholdCukup)}.`
			};
		}
		if (nilai < thresholdBaik) {
			return {
				key: 'baik',
				label: 'Baik',
				className: 'alert-success',
				icon: 'check',
				description: `Nilai akhir berada pada rentang ≥ ${formatScore(thresholdCukup)} dan < ${formatScore(thresholdBaik)}.`
			};
		}
		return {
			key: 'sangat-baik',
			label: 'Sangat Baik',
			className: 'alert-info',
			icon: 'info',
			description: `Nilai akhir minimal ${formatScore(thresholdBaik)} (≥ 130% dari KKM).`
		};
	});

	const totalBobot = $derived.by(() =>
		lingkupSummaries.reduce((sum, item) => sum + (item.bobot ?? 0), 0)
	);

	const kkm = $derived.by(() => Math.max(0, data.mapel.kkm ?? 0));

	const kembaliHref = `/asesmen-sumatif?mapel_id=${data.mapel.id}`;

	function getInputClass(value: string) {
		return isScoreValid(value)
			? 'input dark:bg-base-300 dark:border-none'
			: 'input input-error dark:bg-base-300 dark:border-none';
	}

	async function handleSuccess({ data: result }: { data?: Record<string, unknown> }) {
		const payload = (result?.payload ?? null) as SavePayload | null;
		if (payload) {
			const scoreMap = new Map(payload.tujuanScores.map((item) => [item.tujuanPembelajaranId, item.nilai]));
			entries = entries.map((entry) => {
				const nilai = scoreMap.has(entry.tujuanPembelajaranId)
					? scoreMap.get(entry.tujuanPembelajaranId) ?? null
					: normalizeScoreText(entry.nilaiText);
				return {
					...entry,
					nilai,
					nilaiText: toInputText(nilai)
				};
			});
			sasTesText = toInputText(payload.aggregates.sasTes);
			sasNonTesText = toInputText(payload.aggregates.sasNonTes);
		}
		await invalidate('app:asesmen-sumatif');
		await invalidate('app:asesmen-sumatif/formulir');
	}
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<FormEnhance action="?/save" onsuccess={handleSuccess} showToast>
		{#snippet children({ submitting })}
			<input type="hidden" name="muridId" value={data.murid.id} />
			<input type="hidden" name="mapelId" value={data.mapel.id} />

			<div class="flex flex-col gap-2 sm:flex-row">
				<a href={kembaliHref} class="btn shadow-none">
					<Icon name="left" />
					Kembali
				</a>
				<button
					type="submit"
					class="btn btn-primary shadow-none sm:ml-auto"
					disabled={!data.hasTujuan || submitting}
				>
					<Icon name="save" />
					{submitting ? 'Menyimpan...' : 'Simpan'}
				</button>
			</div>

			<h3 class="mt-4 pb-2 text-lg font-bold">
				Isi nilai sumatif tiap tujuan pembelajaran di bawah ini untuk {data.murid.nama}.
			</h3>

			{#if !data.hasTujuan}
				<div class="alert alert-soft alert-info mt-4">
					<Icon name="info" />
					<span>
						Belum ada tujuan pembelajaran untuk mata pelajaran ini. Tambahkan tujuan pembelajaran di
						menu
						<strong>Intrakurikuler</strong> terlebih dahulu.
					</span>
				</div>
			{:else}
				<div
					class="bg-base-100 dark:bg-base-200 border-base-200 mt-2 overflow-x-auto rounded-md shadow-md dark:shadow-none"
				>
					<table class="border-base-200 table min-w-160 border dark:border-none">
						<thead>
							<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
								<th style="width: 40px; min-width: 40px;">No</th>
								<th class="w-full" style="min-width: 260px;">Tujuan Pembelajaran</th>
								<th style="min-width: 140px;">Nilai</th>
							</tr>
						</thead>
						<tbody>
							{#each entries as entry, index}
								<tr>
									<td>{entry.index}</td>
									<td>
										<p class="font-medium first-letter:uppercase">{entry.deskripsi}</p>
										<p class="text-base-content/60 mt-2 text-xs tracking-wide uppercase">
											{entry.lingkupMateri}
											{#if entry.bobot != null}
												<span class="ml-1 font-semibold">• Bobot {formatScore(entry.bobot)}%</span>
											{/if}
										</p>
										<input
											type="hidden"
											name={`entries.${index}.tujuanPembelajaranId`}
											value={entry.tujuanPembelajaranId}
										/>
									</td>
									<td>
										<input
											type="number"
											name={`entries.${index}.nilai`}
											class={getInputClass(entry.nilaiText)}
											bind:value={entries[index].nilaiText}
											placeholder="Isi nilai"
											min="0"
											max="100"
											step="0.01"
											required
											inputmode="decimal"
											title="Rentang 0-100 dengan maksimal 2 angka desimal"
											spellcheck="false"
										/>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<div role="alert" class="alert rounded-box alert-soft alert-info mt-4">
				<span class="text-2xl">
					<Icon name="info" />
				</span>
				<span class="w-full">
					<p class="text-lg">NA Sumatif Lingkup Materi</p>
					<p class="text-2xl font-bold">{formatScore(naSumatifLingkup)}</p>
					<p class="text-sm">
						Rata-rata dari {lingkupSummaries.length} lingkup materi
						{#if totalBobot > 0}
							(dengan total bobot {totalBobot}%)
						{/if}
					</p>
					{#if lingkupSummaries.length}
						<ul class="text-base-content/70 mt-2 space-y-1 text-xs">
							{#each lingkupSummaries as summary}
								<li>
									<strong>{summary.lingkupMateri}</strong> — {formatScore(summary.rataRata)}
									{#if summary.bobot != null}
										<span class="ml-1">(Bobot {formatScore(summary.bobot)}%)</span>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</span>
			</div>

			<h3 class="mt-6 pb-2 text-lg font-bold">
				Isi Sumatif Akhir Semester di bawah ini untuk {data.murid.nama}.
			</h3>
			<div
				class="bg-base-100 dark:bg-base-200 border-base-200 mt-2 overflow-x-auto rounded-md shadow-md dark:shadow-none"
			>
				<table class="border-base-200 table border dark:border-none">
					<thead>
						<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
							<th style="width: 40px; min-width: 40px;">No</th>
							<th class="w-full" style="min-width: 220px;">Jenis Tes</th>
							<th style="min-width: 140px;">Nilai</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>1</td>
							<td>Nilai Tes Sumatif Akhir Semester (SAS)</td>
							<td>
								<input
									type="number"
									name="sasTes"
									class={getInputClass(sasTesText)}
									bind:value={sasTesText}
									placeholder="Isi nilai"
									min="0"
									max="100"
									step="0.01"
									required
									inputmode="decimal"
									title="Rentang 0-100 dengan maksimal 2 angka desimal"
									spellcheck="false"
								/>
							</td>
						</tr>
						<tr>
							<td>2</td>
							<td>Nilai Non Tes Sumatif Akhir Semester (SAS)</td>
							<td>
								<input
									type="number"
									name="sasNonTes"
									class={getInputClass(sasNonTesText)}
									bind:value={sasNonTesText}
									placeholder="Isi nilai"
									min="0"
									max="100"
									step="0.01"
									required
									inputmode="decimal"
									title="Rentang 0-100 dengan maksimal 2 angka desimal"
									spellcheck="false"
								/>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div role="alert" class="alert rounded-box alert-soft alert-info mt-4">
				<span class="text-2xl">
					<Icon name="info" />
				</span>
				<span>
					<p class="text-lg">NA Sumatif Akhir Semester</p>
					<p class="text-2xl font-bold">{formatScore(nilaiSas)}</p>
					<p class="text-sm">Rata-rata dari nilai Tes dan Non Tes SAS</p>
				</span>
			</div>

			<div
				class={`alert rounded-box ${
					nilaiAkhirCategory ? nilaiAkhirCategory.className : 'alert-soft alert-warning'
				} mt-6`}
			>
				<span class="text-2xl">
					<Icon name={nilaiAkhirCategory ? nilaiAkhirCategory.icon : 'alert'} />
				</span>
				<span>
					<p class="text-lg">Nilai Akhir</p>
					<p class="text-2xl font-bold">{formatScore(nilaiAkhir)}</p>
					<p class="text-sm">
						Rata-rata dari NA Sumatif Lingkup Materi dan NA Sumatif Akhir Semester
					</p>
					<p class="text-sm font-semibold">
						KKM {kkm}
						{#if nilaiAkhir == null}
							— Lengkapi penilaian untuk menghitung nilai akhir
						{:else}
							— {nilaiAkhirCategory?.label}
						{/if}
					</p>
					{#if nilaiAkhirCategory}
						<p class="text-sm">{nilaiAkhirCategory.description}</p>
					{/if}
				</span>
			</div>
		{/snippet}
	</FormEnhance>
</div>
