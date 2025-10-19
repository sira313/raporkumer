<script lang="ts">
	import { invalidate } from '$app/navigation';
	import CheatControls from '$lib/components/asesmen-sumatif/cheat-controls.svelte';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import LingkupSummaryCard from '$lib/components/asesmen-sumatif/lingkup-summary-card.svelte';
	import NilaiAkhirCard from '$lib/components/asesmen-sumatif/nilai-akhir-card.svelte';
	import SasInputTable from '$lib/components/asesmen-sumatif/sas-input-table.svelte';
	import SasSummaryCard from '$lib/components/asesmen-sumatif/sas-summary-card.svelte';
	import TujuanTable from '$lib/components/asesmen-sumatif/tujuan-table.svelte';
	import type {
		EntryDraft,
		LingkupSummary,
		NilaiAkhirCategory,
		TujuanEntry
	} from '$lib/components/asesmen-sumatif/types';
	import {
		formatScore,
		toInputText,
		toDraft,
		normalizeScoreText,
		isScoreValid
	} from '$lib/components/asesmen-sumatif/utils';

	type PageData = {
		murid: { id: number; nama: string };
		mapel: { id: number; nama: string; kkm: number };
		hasTujuan: boolean;
		entries: TujuanEntry[];
		initialScores: {
			naLingkup: number | null;
			sasTes: number | null;
			sasNonTes: number | null;
			sas: number | null;
			nilaiAkhir: number | null;
		};
		cheatUnlocked: boolean;
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

	let { data }: { data: PageData } = $props();

	let entries = $state(data.entries.map(toDraft));
	let sasTesText = $state(
		data.initialScores.sasTes != null ? data.initialScores.sasTes.toFixed(2) : ''
	);
	let sasNonTesText = $state(
		data.initialScores.sasNonTes != null ? data.initialScores.sasNonTes.toFixed(2) : ''
	);
	let cheatUnlocked = $state(data.cheatUnlocked);

	$effect(() => {
		entries = data.entries.map(toDraft);
		sasTesText = data.initialScores.sasTes != null ? data.initialScores.sasTes.toFixed(2) : '';
		sasNonTesText =
			data.initialScores.sasNonTes != null ? data.initialScores.sasNonTes.toFixed(2) : '';
		cheatUnlocked = data.cheatUnlocked;
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
		const values = [sasTesValue, sasNonTesValue].filter((value): value is number => value != null);
		if (!values.length) return null;
		return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
	});

	const nilaiAkhir = $derived.by(() => {
		const values = [naSumatifLingkup, nilaiSas].filter((value): value is number => value != null);
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

	function handleEntryNilaiChange(event: CustomEvent<{ index: number; value: string }>) {
		const { index, value } = event.detail;
		entries = entries.map((entry, idx) => (idx === index ? { ...entry, nilaiText: value } : entry));
	}

	function handleSasChange(event: CustomEvent<{ target: 'tes' | 'nonTes'; value: string }>) {
		const { target, value } = event.detail;
		if (target === 'tes') {
			sasTesText = value;
			return;
		}
		sasNonTesText = value;
	}

	function handleCheatApply(
		event: CustomEvent<{ entries: EntryDraft[]; sasTesText: string; sasNonTesText: string }>
	): void {
		const { entries: drafts, sasTesText: sasTes, sasNonTesText: sasNonTes } = event.detail;
		entries = drafts;
		sasTesText = sasTes;
		sasNonTesText = sasNonTes;
	}

	function handleCheatUnlockChange(event: CustomEvent<{ cheatUnlocked: boolean }>): void {
		cheatUnlocked = event.detail.cheatUnlocked;
	}

	async function handleSuccess({ data: result }: { data?: Record<string, unknown> }) {
		const payload = (result?.payload ?? null) as SavePayload | null;
		if (payload) {
			const scoreMap = new Map(
				payload.tujuanScores.map((item) => [item.tujuanPembelajaranId, item.nilai])
			);
			entries = entries.map((entry) => {
				const nilai = scoreMap.has(entry.tujuanPembelajaranId)
					? (scoreMap.get(entry.tujuanPembelajaranId) ?? null)
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
				<a href={kembaliHref} class="btn shadow-none btn-soft">
					<Icon name="left" />
					Kembali
				</a>
				<CheatControls
					{entries}
					hasTujuan={data.hasTujuan}
					initialNilaiAkhir={data.initialScores.nilaiAkhir}
					{nilaiAkhir}
					disabled={submitting}
					{cheatUnlocked}
					on:apply={handleCheatApply}
					on:unlockChange={handleCheatUnlockChange}
				/>
				<button
					type="submit"
					class="btn btn-primary btn-soft shadow-none sm:ml-auto"
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
				<TujuanTable
					{entries}
					{formatScore}
					{getInputClass}
					onnilaiChange={handleEntryNilaiChange}
				/>
			{/if}

			<LingkupSummaryCard {naSumatifLingkup} {lingkupSummaries} {totalBobot} {formatScore} />

			<h3 class="mt-6 pb-2 text-lg font-bold">
				Isi Sumatif Akhir Semester di bawah ini untuk {data.murid.nama}.
			</h3>
			<SasInputTable {sasTesText} {sasNonTesText} {getInputClass} onsasChange={handleSasChange} />

			<SasSummaryCard {nilaiSas} {formatScore} />

			<NilaiAkhirCard {nilaiAkhir} {nilaiAkhirCategory} {kkm} {formatScore} />
		{/snippet}
	</FormEnhance>
</div>
