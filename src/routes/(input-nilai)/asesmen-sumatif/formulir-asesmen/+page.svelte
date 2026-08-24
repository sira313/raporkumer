<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- small Map and URLSearchParams usage and navigation helpers */
	import { invalidate, goto } from '$app/navigation';
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
		kelasId: number;
		mapel: { id: number; kkm: number };
		sumatifWeights: { lingkup: number; sts: number; sas: number };
		sumatifWeightsRts: { lingkup: number; sts: number };
		hasLingkupComplete: boolean;
		hasTujuan: boolean;
		entries: TujuanEntry[];
		initialScores: {
			stsTes: number | null;
			stsNonTes: number | null;
			sasTes: number | null;
			sasNonTes: number | null;
			nilaiAkhir: number | null;
		};
		cheatUnlocked: boolean;
	};

	type SavePayload = {
		tujuanScores: { tujuanPembelajaranId: number; nilai: number | null }[];
		aggregates: {
			naLingkup: number | null;
			stsTes: number | null;
			stsNonTes: number | null;
			sts: number | null;
			sasTes: number | null;
			sasNonTes: number | null;
			sas: number | null;
			nilaiAkhir: number | null;
			nilaiAkhirRts: number | null;
		};
	};

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let entries = $state(data.entries.map(toDraft));
	let sasTesText = $state(
		// svelte-ignore state_referenced_locally
		data.initialScores.sasTes != null ? data.initialScores.sasTes.toFixed(2) : ''
	);
	let sasNonTesText = $state(
		// svelte-ignore state_referenced_locally
		data.initialScores.sasNonTes != null ? data.initialScores.sasNonTes.toFixed(2) : ''
	);
	// Sumatif Tengah Semester (STS) - new inputs, initially empty (backend doesn't persist yet)
	let stsTesText = $state(
		// svelte-ignore state_referenced_locally
		data.initialScores.stsTes != null ? data.initialScores.stsTes.toFixed(2) : ''
	);
	let stsNonTesText = $state(
		// svelte-ignore state_referenced_locally
		data.initialScores.stsNonTes != null ? data.initialScores.stsNonTes.toFixed(2) : ''
	);
	// svelte-ignore state_referenced_locally
	let cheatUnlocked = $state(data.cheatUnlocked);

	$effect(() => {
		entries = data.entries.map(toDraft);
		sasTesText = data.initialScores.sasTes != null ? data.initialScores.sasTes.toFixed(2) : '';
		sasNonTesText =
			data.initialScores.sasNonTes != null ? data.initialScores.sasNonTes.toFixed(2) : '';
		stsTesText = data.initialScores.stsTes != null ? data.initialScores.stsTes.toFixed(2) : '';
		stsNonTesText =
			data.initialScores.stsNonTes != null ? data.initialScores.stsNonTes.toFixed(2) : '';
		cheatUnlocked = data.cheatUnlocked;
	});

	// Combobox pindah murid: daftar diambil dari /api/murid/daftar (kelas sama),
	// difilter lokal seperti combobox "Nama Mata Pelajaran".
	type MuridOption = { id: number; nama: string };
	const MAX_OPSI_MURID = 80;
	let muridQuery = $state('');
	let daftarMuridTerbuka = $state(false);
	let indeksSorotMurid = $state(-1);
	let muridOptions = $state<MuridOption[]>([]);
	let muridLoading = $state(false);

	const isDirty = $derived.by(() => {
		if (
			normalizeScoreText(sasTesText) !== data.initialScores.sasTes ||
			normalizeScoreText(sasNonTesText) !== data.initialScores.sasNonTes ||
			normalizeScoreText(stsTesText) !== data.initialScores.stsTes ||
			normalizeScoreText(stsNonTesText) !== data.initialScores.stsNonTes
		) {
			return true;
		}
		return entries.some(
			(entry, i) => normalizeScoreText(entry.nilaiText) !== (data.entries[i]?.nilai ?? null)
		);
	});

	async function loadMuridOptions() {
		if (muridOptions.length || muridLoading) return;
		muridLoading = true;
		try {
			const res = await fetch(`/api/murid/daftar?kelas_id=${data.kelasId}`);
			if (res.ok) muridOptions = await res.json();
		} finally {
			muridLoading = false;
		}
	}

	const muridTersaring = $derived.by(() => {
		const q = muridQuery.trim().toLowerCase();
		if (!q) return muridOptions;
		return muridOptions.filter((o) => o.nama.toLowerCase().includes(q));
	});

	function sorotMuridGeser(delta: number) {
		const total = Math.min(muridTersaring.length, MAX_OPSI_MURID);
		if (total === 0) return;
		indeksSorotMurid = (indeksSorotMurid + delta + total) % total;
		document.getElementById(`murid-opsi-${indeksSorotMurid}`)?.scrollIntoView({ block: 'nearest' });
	}

	function onMuridKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') e.preventDefault();
		if (e.key === 'Escape') {
			daftarMuridTerbuka = false;
			return;
		}
		if (!daftarMuridTerbuka || muridTersaring.length === 0) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			sorotMuridGeser(1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			sorotMuridGeser(-1);
		} else if (e.key === 'Enter' && indeksSorotMurid >= 0) {
			pilihMurid(muridTersaring[Math.min(indeksSorotMurid, muridTersaring.length - 1)]);
		}
	}

	async function pilihMurid(murid: MuridOption) {
		daftarMuridTerbuka = false;
		indeksSorotMurid = -1;
		muridQuery = '';
		if (murid.id === data.murid.id) return;
		if (
			isDirty &&
			!confirm(
				'Masih ada perubahan nilai yang belum disimpan. Pindah murid akan membuangnya. Lanjutkan?'
			)
		) {
			return;
		}
		await goto(`/asesmen-sumatif/formulir-asesmen?murid_id=${murid.id}&mapel_id=${data.mapel.id}`, {
			keepFocus: true
		});
	}

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

	const stsTesValue = $derived.by(() => normalizeScoreText(stsTesText));
	const stsNonTesValue = $derived.by(() => normalizeScoreText(stsNonTesText));

	const nilaiSas = $derived.by(() => {
		const values = [sasTesValue, sasNonTesValue].filter((value): value is number => value != null);
		if (!values.length) return null;
		return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
	});

	const nilaiSts = $derived.by(() => {
		const values = [stsTesValue, stsNonTesValue].filter((value): value is number => value != null);
		if (!values.length) return null;
		return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
	});

	const nilaiAkhir = $derived.by(() => {
		// Determine effective weights using rules:
		// - All present: base weights
		// - STS missing only: lingkup 70 / sas 30
		const base = {
			lingkup: data.sumatifWeights?.lingkup ?? 60,
			sts: data.sumatifWeights?.sts ?? 20,
			sas: data.sumatifWeights?.sas ?? 20
		};
		let eff = nilaiSts == null ? { lingkup: 70, sts: 0, sas: 30 } : base;
		let weighted = 0;
		let totalW = 0;
		if (naSumatifLingkup != null) {
			weighted += naSumatifLingkup * eff.lingkup;
			totalW += eff.lingkup;
		}
		if (nilaiSts != null) {
			weighted += nilaiSts * eff.sts;
			totalW += eff.sts;
		}
		if (nilaiSas != null) {
			weighted += nilaiSas * eff.sas;
			totalW += eff.sas;
		}
		if (totalW === 0) return null;
		return Math.round((weighted / totalW) * 100) / 100;
	});

	// Effective weights used by the UI: if STS not provided, use 70/0/30
	const effectiveSumatifWeights = $derived.by(() => {
		const base = {
			lingkup: data.sumatifWeights?.lingkup ?? 60,
			sts: data.sumatifWeights?.sts ?? 20,
			sas: data.sumatifWeights?.sas ?? 20
		};
		if (nilaiSts == null) return { lingkup: 70, sts: 0, sas: 30 };
		return base;
	});
	const kkm = $derived.by(() => Math.max(0, data.mapel.kkm ?? 0));

	const nilaiAkhirRts = $derived.by(() => {
		const bobot = {
			lingkup: data.sumatifWeightsRts?.lingkup ?? 70,
			sts: data.sumatifWeightsRts?.sts ?? 30
		};
		let weighted = 0;
		let totalW = 0;
		if (naSumatifLingkup != null) {
			weighted += naSumatifLingkup * bobot.lingkup;
			totalW += bobot.lingkup;
		}
		if (nilaiSts != null) {
			weighted += nilaiSts * bobot.sts;
			totalW += bobot.sts;
		}
		if (totalW === 0) return null;
		return Math.round((weighted / totalW) * 100) / 100;
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

	const nilaiAkhirRtsCategory = $derived.by((): NilaiAkhirCategory | null => {
		const nilai = nilaiAkhirRts;
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

	// svelte-ignore state_referenced_locally
	const kembaliHref = `/asesmen-sumatif?mapel_id=${data.mapel.id}`;

	function getInputClass(value: string) {
		return isScoreValid(value)
			? 'input bg-base-200 dark:bg-base-300 border-base-300 dark:border-none'
			: 'input input-error dark:bg-base-300 border-base-300 dark:border-none';
	}

	function handleEntryNilaiChange(event: CustomEvent<{ index: number; value: string }>) {
		const { index, value } = event.detail;
		entries = entries.map((entry, idx) => (idx === index ? { ...entry, nilaiText: value } : entry));
	}

	function handleSasChange(
		event: CustomEvent<{ namePrefix?: string; target: 'tes' | 'nonTes'; value: string }>
	) {
		const { namePrefix, target, value } = event.detail;
		const prefix = namePrefix ?? 'sas';
		if (prefix === 'sts') {
			if (target === 'tes') {
				stsTesText = value;
				return;
			}
			stsNonTesText = value;
			return;
		}
		// default: sas (Akhir Semester)
		if (target === 'tes') {
			sasTesText = value;
			return;
		}
		sasNonTesText = value;
	}

	function handleCheatApply(
		event: CustomEvent<{
			entries: EntryDraft[];
			sasTesText: string;
			sasNonTesText: string;
			stsTesText: string;
			stsNonTesText: string;
		}>
	): void {
		const {
			entries: drafts,
			sasTesText: sasTes,
			sasNonTesText: sasNonTes,
			stsTesText: stsTes,
			stsNonTesText: stsNonTes
		} = event.detail;
		entries = drafts;
		sasTesText = sasTes;
		sasNonTesText = sasNonTes;
		stsTesText = stsTes;
		stsNonTesText = stsNonTes;
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
			stsTesText = toInputText(payload.aggregates.stsTes);
			stsNonTesText = toInputText(payload.aggregates.stsNonTes);
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
				<a href={kembaliHref} class="btn btn-soft shadow-none">
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
					class="btn btn-primary shadow-none sm:ml-auto"
					disabled={!data.hasTujuan || !data.hasLingkupComplete || submitting}
				>
					<Icon name="save" />
					{submitting ? 'Menyimpan...' : 'Simpan'}
				</button>
			</div>

			<div class="relative mt-3 w-full">
				<label class="input bg-base-200 w-full border-base-300 dark:border-none">
					<Icon name="search" />
					<input
						type="search"
						class="w-full grow bg-transparent outline-none"
						placeholder="Ketik nama murid atau pilih di sini"
						autocomplete="off"
						role="combobox"
						aria-expanded={daftarMuridTerbuka}
						aria-controls="daftar-murid-formulir"
						aria-activedescendant={daftarMuridTerbuka && indeksSorotMurid >= 0
							? `murid-opsi-${indeksSorotMurid}`
							: undefined}
						bind:value={muridQuery}
						onfocus={() => {
							void loadMuridOptions();
							daftarMuridTerbuka = true;
							indeksSorotMurid = -1;
						}}
						oninput={() => {
							daftarMuridTerbuka = true;
							indeksSorotMurid = -1;
						}}
						onblur={() => (daftarMuridTerbuka = false)}
						onkeydown={onMuridKeydown}
					/>
				</label>
				{#if daftarMuridTerbuka && muridTersaring.length > 0}
					<ul
						id="daftar-murid-formulir"
						role="listbox"
						class="bg-base-200 absolute z-50 mt-1 max-h-60 w-full list-none overflow-y-auto rounded-box p-1 shadow-lg"
					>
						{#each muridTersaring.slice(0, MAX_OPSI_MURID) as opsi, i (opsi.id)}
							<li id={`murid-opsi-${i}`} role="option" aria-selected={i === indeksSorotMurid}>
								<button
									type="button"
									class="w-full truncate rounded px-2 py-1.5 text-left text-sm transition-colors duration-200 hover:bg-base-content/10 {i ===
									indeksSorotMurid
										? 'bg-base-content/10'
										: ''}"
									onmousedown={(e) => e.preventDefault()}
									onclick={() => pilihMurid(opsi)}
								>
									{#if opsi.id === data.murid.id}
										<Icon name="check" class="mr-1.5 inline size-4" />
									{/if}
									{opsi.nama}
								</button>
							</li>
						{/each}
						{#if muridTersaring.length > MAX_OPSI_MURID}
							<li class="px-2 py-1 text-sm opacity-60">
								{muridTersaring.length - MAX_OPSI_MURID} lainnya — ketik untuk mempersempit.
							</li>
						{/if}
					</ul>
				{:else if daftarMuridTerbuka && muridLoading}
					<ul
						role="listbox"
						class="bg-base-200 absolute z-50 mt-1 w-full list-none rounded-box p-2 shadow-lg"
					>
						<li class="text-sm opacity-60">Memuat...</li>
					</ul>
				{:else if daftarMuridTerbuka}
					<ul
						role="listbox"
						class="bg-base-200 absolute z-50 mt-1 w-full list-none rounded-box p-2 shadow-lg"
					>
						<li class="text-sm opacity-60">Murid tidak ditemukan.</li>
					</ul>
				{/if}
			</div>

			<h3 class="mt-4 pb-2 text-lg font-bold">
				Isi nilai harian tiap tujuan pembelajaran untuk {data.murid.nama}.
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
			{:else if !data.hasLingkupComplete}
				<div class="alert alert-soft alert-warning mt-4">
					<Icon name="alert" />
					<span>
						Semua kolom <strong>Lingkup Materi</strong> harus diisi sebelum menyimpan penilaian
						sumatif. Silakan lengkapi Lingkup Materi pada menu
						<strong>Intrakurikuler</strong>.
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
				Isi Sumatif Tengah Semester di bawah ini untuk {data.murid.nama} (opsional).
			</h3>
			<SasInputTable
				tesText={stsTesText}
				nonTesText={stsNonTesText}
				namePrefix="sts"
				tesLabel="Nilai Tes Sumatif Tengah Semester (STS)"
				nonTesLabel="Nilai Non Tes Sumatif Tengah Semester (STS)"
				{getInputClass}
				on:sasChange={handleSasChange}
			/>

			<SasSummaryCard
				nilaiSas={nilaiSts}
				{formatScore}
				title="NA Sumatif Tengah Semester"
				subtitle="Rata-rata dari nilai Tes dan Non Tes STS"
			/>

			<h3 class="mt-6 pb-2 text-lg font-bold">
				Isi Sumatif Akhir Semester di bawah ini untuk {data.murid.nama}.
			</h3>
			<SasInputTable
				tesText={sasTesText}
				nonTesText={sasNonTesText}
				{getInputClass}
				on:sasChange={handleSasChange}
			/>

			<SasSummaryCard {nilaiSas} {formatScore} />

			<NilaiAkhirCard
				title="Nilai Rapor Tengah Semester"
				nilaiAkhir={nilaiAkhirRts}
				nilaiAkhirCategory={nilaiAkhirRtsCategory}
				{kkm}
				{formatScore}
				sumatifWeights={{
					lingkup: data.sumatifWeightsRts?.lingkup ?? 70,
					sts: data.sumatifWeightsRts?.sts ?? 30
				}}
			/>

			<NilaiAkhirCard
				{nilaiAkhir}
				{nilaiAkhirCategory}
				{kkm}
				{formatScore}
				sumatifWeights={effectiveSumatifWeights}
			/>
		{/snippet}
	</FormEnhance>
</div>
