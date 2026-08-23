<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- small goto call used for form navigation */
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import {
		agamaMapelNames,
		agamaParentName,
		pksMapelNames,
		pksParentName,
		jenisMapel
	} from '$lib/statics';

	const AGAMA_MAPEL_NAME_SET = new Set<string>(agamaMapelNames);
	const PKS_MAPEL_NAME_SET = new Set<string>(pksMapelNames);

	type KelasLite = {
		id?: number;
		nama?: string;
		fase?: string | null;
	};

	type FormMapel = {
		id?: number;
		nama?: string;
		jenis?: MataPelajaran['jenis'];
		kkm?: number | null;
		kode?: string | null;
		kelas?: KelasLite | null;
	} & Record<string, unknown>;

	type FormData = {
		mode?: 'add' | 'edit';
		mapel?: FormMapel | null;
		kelasAktif?: KelasLite | null;
		dapodikMapelList?: Array<{ nama: string; kode: string | null }>;
	} & Record<string, unknown>;

	let { data }: { data: FormData } = $props();
	const mode: 'add' | 'edit' = $derived(data?.mode === 'edit' ? 'edit' : 'add');
	const mapel = $derived(data?.mapel ?? null);
	const kelasAktif = $derived(data?.kelasAktif ?? mapel?.kelas ?? null);
	const kelasAktifLabel = $derived(
		kelasAktif
			? kelasAktif.fase
				? `${kelasAktif.nama} - ${kelasAktif.fase}`
				: kelasAktif.nama
			: 'Belum ada kelas aktif'
	);
	const isAgamaGroup = $derived(!!mapel?.nama && AGAMA_MAPEL_NAME_SET.has(mapel.nama));
	const isAgamaParent = $derived(!!mapel?.nama && mapel.nama === agamaParentName);
	const isPksGroup = $derived(!!mapel?.nama && PKS_MAPEL_NAME_SET.has(mapel.nama));
	const isPksParent = $derived(!!mapel?.nama && mapel.nama === pksParentName);
	const disableNama = $derived(!kelasAktif || (mode === 'edit' && (isAgamaGroup || isPksGroup)));
	const disableJenis = $derived(!kelasAktif || (mode === 'edit' && isAgamaGroup));
	const formAction = $derived(mode === 'edit' ? '?/update' : '?/add');
	const invalidateTargets = $derived(
		mode === 'edit'
			? ['app:mapel', 'app:mapel_tp-rl', 'app:asesmen-formatif']
			: ['app:mapel', 'app:asesmen-formatif']
	);
	const formInit = $derived(
		mode === 'edit' && mapel
			? {
					nama: mapel.nama,
					kkm: mapel.kkm ?? '',
					jenis: mapel.jenis,
					kode: mapel.kode ?? ''
				}
			: undefined
	);
	function initialKode(): string {
		if (mode === 'edit' && isAgamaGroup) return 'PAPB';
		if (mode === 'edit' && isPksGroup) return 'PKS';
		return mapel?.kode ?? '';
	}
	let localKode = $state(initialKode());

	// Dapatkan jenjang varian dari sekolah (misalnya 'SMK')
	const jenjangVariant = $derived.by(() => {
		const sekolah = page.data.sekolah as { jenjangVariant?: string | null } | null | undefined;
		return sekolah?.jenjangVariant ?? null;
	});

	// Fungsi untuk mendapatkan label jenis mapel yang dinamis berdasarkan jenjang
	function getJenisMapelLabel(jenis: string): string {
		if (jenis === 'wajib' && jenjangVariant?.toUpperCase() === 'SMK') {
			return 'Mata Pelajaran Umum';
		}
		return jenisMapel[jenis as MataPelajaran['jenis']] ?? jenis;
	}

	// Derive displayable jenis mapel options
	const displayJenisMapel = $derived.by(() => {
		const result: Record<string, string> = {};
		for (const key of Object.keys(jenisMapel)) {
			// "belum_dipetakan" hanya untuk hasil tarikan Dapodik — tidak bisa dipilih manual.
			if (key === 'belum_dipetakan') {
				continue;
			}
			// Sembunyikan opsi "kejuruan" jika bukan SMK
			if (key === 'kejuruan' && jenjangVariant?.toUpperCase() !== 'SMK') {
				continue;
			}
			// Sembunyikan opsi "pemberdayaan" jika bukan PKBM/SKB
			if (
				key === 'pemberdayaan' &&
				!['PKBM', 'SKB'].includes(jenjangVariant?.toUpperCase() ?? '')
			) {
				continue;
			}
			result[key] = getJenisMapelLabel(key);
		}
		return result;
	});

	function applyNamaRules(v: string) {
		if (AGAMA_MAPEL_NAME_SET.has(v)) {
			localKode = 'PAPB';
		} else if (PKS_MAPEL_NAME_SET.has(v)) {
			localKode = 'PKS';
		} else if (mode !== 'edit') {
			if (localKode === 'PAPB' || localKode === 'PKS') localKode = '';
		}
	}

	function onNamaInput(e: Event) {
		applyNamaRules(((e.target as HTMLInputElement)?.value ?? '').trim());
	}
	const heading = $derived(mode === 'edit' ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran');
	const namaPlaceholder = $derived(
		mode === 'edit' && isAgamaParent
			? 'Pendidikan Agama dan Budi Pekerti'
			: 'Contoh: Ilmu Pengetahuan Alam dan Sosial'
	);
	// Ada referensi Dapodik di DB (hasil Sinkronisasi) → mode tambah memakai select.
	const dapodikMapelOptions = $derived(data.dapodikMapelList ?? []);
	const pakaiSelectDapodik = $derived(mode === 'add' && dapodikMapelOptions.length > 0);

	// Combobox pencarian nama mapel (input + dropdown hasil filter).
	let namaQuery = $state('');
	let daftarNamaTerbuka = $state(false);
	let indeksSorot = $state(-1);
	const MAX_OPSI_TAMPIL = 80;
	const namaTersaring = $derived.by(() => {
		const q = namaQuery.trim().toLowerCase();
		if (!q) return dapodikMapelOptions;
		return dapodikMapelOptions.filter((o) => o.nama.toLowerCase().includes(q));
	});
	function pilihNama(nama: string) {
		namaQuery = nama;
		daftarNamaTerbuka = false;
		indeksSorot = -1;
		applyNamaRules(nama);
	}
	function sorotGeser(delta: number) {
		const total = Math.min(namaTersaring.length, MAX_OPSI_TAMPIL);
		if (total === 0) return;
		indeksSorot = (indeksSorot + delta + total) % total;
		document.getElementById(`nama-opsi-${indeksSorot}`)?.scrollIntoView({ block: 'nearest' });
	}
	function onNamaKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			daftarNamaTerbuka = false;
			return;
		}
		if (!daftarNamaTerbuka || namaTersaring.length === 0) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			sorotGeser(1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			sorotGeser(-1);
		} else if (e.key === 'Enter' && indeksSorot >= 0) {
			e.preventDefault();
			pilihNama(namaTersaring[Math.min(indeksSorot, namaTersaring.length - 1)].nama);
		}
	}
</script>

<FormEnhance
	action={formAction}
	init={formInit}
	onsuccess={async () => {
		await Promise.all(invalidateTargets.map((token) => invalidate(token)));
		if (typeof window !== 'undefined' && window.history?.state?.modal) {
			history.back();
		} else {
			await goto('/intrakurikuler', { replaceState: true });
		}
	}}
>
	{#snippet children({ submitting, invalid })}
		<p class="mb-2 text-xl font-bold">{heading}</p>
		{#if !kelasAktif}
			<div
				class="alert bg-warning/10 border-warning text-warning-content mb-4 flex items-center gap-2 border border-dashed"
			>
				<Icon name="info" />
				<span
					>Pilih kelas di navbar sebelum {mode === 'edit' ? 'mengubah' : 'menambah'} mata pelajaran.</span
				>
			</div>
		{/if}
		{#if mode === 'edit'}
			<input name="id" value={mapel?.id ?? ''} hidden />
		{/if}
		{#if mode === 'edit' && disableNama}
			<input name="nama" value={mapel?.nama ?? ''} hidden />
		{/if}
		{#if mode === 'edit' && disableJenis}
			<input name="jenis" value={mapel?.jenis ?? ''} hidden />
		{/if}
		<p class="text-base-content/70 mb-4 text-sm">Kelas aktif: {kelasAktifLabel}</p>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Nama Mata Pelajaran</legend>
			{#if pakaiSelectDapodik}
				<div class="relative">
					<input
						type="text"
						class="input validator bg-base-200 w-full border-base-300 dark:border-none"
						placeholder="Pilih Mata Pelajaran"
						name="nama"
						required
						disabled={disableNama}
						autocomplete="off"
						role="combobox"
						aria-expanded={daftarNamaTerbuka}
						aria-controls="daftar-nama-mapel"
						aria-activedescendant={daftarNamaTerbuka && indeksSorot >= 0
							? `nama-opsi-${indeksSorot}`
							: undefined}
						bind:value={namaQuery}
						onfocus={() => {
							daftarNamaTerbuka = true;
							indeksSorot = 0;
						}}
						oninput={() => {
							daftarNamaTerbuka = true;
							indeksSorot = 0;
							applyNamaRules(namaQuery.trim());
						}}
						onblur={() => (daftarNamaTerbuka = false)}
						onkeydown={onNamaKeydown}
					/>
					{#if daftarNamaTerbuka && namaTersaring.length > 0}
						<ul
							id="daftar-nama-mapel"
							role="listbox"
							class="bg-base-200 absolute z-50 mt-1 max-h-60 w-full list-none overflow-y-auto rounded-box p-1 shadow-lg"
						>
							{#each namaTersaring.slice(0, MAX_OPSI_TAMPIL) as opsi, i (`${opsi.kode ?? ''}|${opsi.nama}`)}
								<li id={`nama-opsi-${i}`} role="option" aria-selected={i === indeksSorot}>
									<button
										type="button"
										class="w-full truncate rounded px-2 py-1.5 text-left text-sm transition-colors duration-200 hover:bg-base-content/10 {i ===
										indeksSorot
											? 'bg-base-content/10'
											: ''}"
										onmousedown={(e) => e.preventDefault()}
										onclick={() => pilihNama(opsi.nama)}
									>
										{#if opsi.kode}
											<span class="mr-1.5 font-mono text-xs opacity-60">{opsi.kode}</span>
										{/if}
										{opsi.nama}
									</button>
								</li>
							{/each}
							{#if namaTersaring.length > MAX_OPSI_TAMPIL}
								<li class="px-2 py-1 text-sm opacity-60">
									{namaTersaring.length - MAX_OPSI_TAMPIL} lainnya — ketik untuk mempersempit.
								</li>
							{/if}
						</ul>
					{/if}
				</div>
			{:else}
				<input
					type="text"
					class="input validator bg-base-200 w-full border-base-300 dark:border-none"
					placeholder={namaPlaceholder}
					name="nama"
					required
					disabled={disableNama}
					value={mapel?.nama ?? ''}
					oninput={onNamaInput}
				/>
			{/if}
			<p class="label text-wrap">
				{#if pakaiSelectDapodik}
					Ketik untuk mencari, lalu pilih dari daftar. Nama mata pelajaran jangan disingkat!
				{:else}
					Nama mata pelajaran jangan disingkat!
				{/if}
			</p>
		</fieldset>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">KKM</legend>
			<input
				type="number"
				class="input validator bg-base-200 w-full border-base-300 dark:border-none"
				placeholder="Contoh: 76"
				name="kkm"
				required
				disabled={!kelasAktif}
				min="0"
			/>
		</fieldset>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Kode</legend>
			<input
				type="text"
				class="input validator bg-base-200 w-full border-base-300 dark:border-none"
				placeholder="Contoh: PAPB"
				name="kode"
				bind:value={localKode}
				disabled={isAgamaGroup || isPksGroup ? true : !kelasAktif}
			/>
			<p class="label text-wrap">Singkatan/kode singkat untuk mata pelajaran (opsional).</p>
		</fieldset>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Jenis Mata Pelajaran</legend>
			<select
				class="select bg-base-200 w-full truncate border-base-300 dark:border-none"
				name="jenis"
				required
				disabled={disableJenis}
			>
				<option disabled selected>Pilih Jenis Mata Pelajaran</option>
				{#each Object.entries(displayJenisMapel) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</select>
		</fieldset>
		{#if mode === 'edit' && isAgamaParent}
			<p class="text-base-content/70 mt-2 text-sm">
				Perubahan KKM akan diterapkan ke semua varian mata pelajaran Pendidikan Agama dan Budi
				Pekerti.
			</p>
		{/if}
		{#if mode === 'edit' && isPksParent}
			<p class="text-base-content/70 mt-2 text-sm">
				Perubahan KKM dan jenis akan diterapkan ke semua varian mata pelajaran Pendalaman Kitab
				Suci.
			</p>
		{/if}
		<div class="mt-6 flex justify-between gap-2">
			<button type="button" class="btn btn-soft shadow-none" onclick={() => history.back()}>
				<Icon name="close-sm" />
				Batal
			</button>
			<button
				type="submit"
				class="btn btn-primary shadow-none"
				disabled={submitting || invalid || !kelasAktif}
			>
				{#if submitting}
					<div class="loading loading-spinner"></div>
				{:else}
					<Icon name="save" />
				{/if}
				Simpan
			</button>
		</div>
	{/snippet}
</FormEnhance>
