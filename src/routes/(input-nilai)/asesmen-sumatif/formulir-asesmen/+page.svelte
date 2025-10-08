<script lang="ts">
	import { invalidate } from '$app/navigation';
	import CheatModal from '$lib/components/asesmen-sumatif/cheat-modal.svelte';
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
	import { showModal, updateModal } from '$lib/components/global-modal.svelte';
	import {
		formatScore,
		toInputText,
		toDraft,
		normalizeScoreText,
		isScoreValid
	} from '$lib/components/asesmen-sumatif/utils';
	import { generateCheatResult } from '$lib/components/asesmen-sumatif/cheat-generator';

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
	let cheatNilaiAkhirText = $state('');
	let cheatModalError = $state<string | null>(null);

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

	/* Cheat logic handled via generateCheatResult utility */

	function syncCheatModalBody(): void {
		updateModal({
			bodyProps: {
				nilaiAkhirText: cheatNilaiAkhirText,
				errorMessage: cheatModalError,
				onInput: handleCheatInput
			}
		});
	}

	function handleCheatInput(value: string): void {
		cheatNilaiAkhirText = value;
		cheatModalError = null;
		syncCheatModalBody();
	}

	function handleCheatConfirm(close: () => void): void {
		const normalized = normalizeScoreText(cheatNilaiAkhirText);
		if (normalized == null) {
			cheatModalError = 'Masukkan angka antara 0 sampai 100 dengan maksimal dua angka desimal.';
			syncCheatModalBody();
			return;
		}
		if (!entries.length) {
			cheatModalError = 'Tidak ada tujuan pembelajaran yang dapat diisi otomatis.';
			syncCheatModalBody();
			return;
		}
		const result = generateCheatResult(entries, normalized);
		if (!result) {
			cheatModalError = 'Gagal menghasilkan nilai acak yang valid. Coba lagi.';
			syncCheatModalBody();
			return;
		}
		entries = result.drafts;
		sasTesText = toInputText(result.sasTes);
		sasNonTesText = toInputText(result.sasNonTes);
		cheatModalError = null;
		close();
	}

	function openCheatModal(): void {
		if (!data.hasTujuan) return;
		cheatNilaiAkhirText = toInputText(data.initialScores.nilaiAkhir ?? nilaiAkhir ?? null);
		cheatModalError = null;
		showModal({
			title: 'Fitur Cheat Nilai Sumatif',
			body: CheatModal,
			bodyProps: {
				nilaiAkhirText: cheatNilaiAkhirText,
				errorMessage: cheatModalError,
				onInput: handleCheatInput
			},
			dismissible: true,
			onNegative: {
				label: 'Batal',
				icon: 'close',
				action: ({ close }) => close()
			},
			onPositive: {
				label: 'Terapkan',
				icon: 'check',
				action: ({ close }) => handleCheatConfirm(close)
			}
		});
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
					type="button"
					class="btn shadow-none"
					onclick={openCheatModal}
					disabled={!data.hasTujuan || submitting}
				>
					<Icon name="copy" />
					Isi Sekaligus
				</button>
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
				<TujuanTable
					{entries}
					{formatScore}
					{getInputClass}
					on:nilaiChange={handleEntryNilaiChange}
				/>
			{/if}

			<LingkupSummaryCard {naSumatifLingkup} {lingkupSummaries} {totalBobot} {formatScore} />

			<h3 class="mt-6 pb-2 text-lg font-bold">
				Isi Sumatif Akhir Semester di bawah ini untuk {data.murid.nama}.
			</h3>
			<SasInputTable {sasTesText} {sasNonTesText} {getInputClass} on:sasChange={handleSasChange} />

			<SasSummaryCard {nilaiSas} {formatScore} />

			<NilaiAkhirCard {nilaiAkhir} {nilaiAkhirCategory} {kkm} {formatScore} />
		{/snippet}
	</FormEnhance>
</div>
