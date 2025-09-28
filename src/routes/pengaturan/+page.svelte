<script lang="ts">
	import { goto } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import type { PageData } from './$types';

	type TahunAjaranRow = typeof import('$lib/server/db/schema').tableTahunAjaran.$inferSelect;
	type SemesterRow = typeof import('$lib/server/db/schema').tableSemester.$inferSelect;
	type TahunAjaranWithSemester = TahunAjaranRow & { semester: SemesterRow[] };

	const { data } = $props<{ data: PageData }>();
	const sekolahList = (data.sekolahList ?? []) as Sekolah[];
	const tahunAjaranList = (data.tahunAjaranList ?? []) as TahunAjaranWithSemester[];
	const activeSekolahId = data.activeSekolahId ?? null;
	const activeTahunAjaranId = data.activeTahunAjaranId ?? null;
	const activeSemesterId = data.activeSemesterId ?? null;
	const tanggalBagiRaport = data.tanggalBagiRaport as {
		ganjilId?: number;
		ganjil?: string | null;
		genapId?: number;
		genap?: string | null;
	};

	let selectedSekolahId = $state(activeSekolahId ? String(activeSekolahId) : '');
	let selectedTahunAjaranId = $state(activeTahunAjaranId ? String(activeTahunAjaranId) : '');
	let selectedSemesterId = $state(activeSemesterId ? String(activeSemesterId) : '');
	let tanggalRaporGanjil = $state(tanggalBagiRaport.ganjil ?? '');
	let tanggalRaporGenap = $state(tanggalBagiRaport.genap ?? '');

	let tahunAjaranOptions = $state(tahunAjaranList);
	const disabledSekolahActions = sekolahList.length === 0;

	let semesterOptions = $state<SemesterRow[]>([]);
	let semesterGanjil = $state<SemesterRow | null>(null);
	let semesterGenap = $state<SemesterRow | null>(null);
	let selectedSemesterRecord = $state<SemesterRow | null>(null);
	let disabledSave = $state(false);
	const disableTanggalInputs = $derived(!semesterGanjil && !semesterGenap);
	const disableTanggalGanjil = $derived(
		!selectedSemesterRecord || selectedSemesterRecord.tipe !== 'ganjil'
	);
	const disableTanggalGenap = $derived(
		!selectedSemesterRecord || selectedSemesterRecord.tipe !== 'genap'
	);

	$effect(() => {
		const tahunId = Number(selectedTahunAjaranId);
		const nextTahun =
			Number.isFinite(tahunId) && tahunId
				? tahunAjaranOptions.find((item) => item.id === tahunId) ?? null
				: null;

		const nextSemesterList = nextTahun?.semester ?? [];
		semesterOptions = nextSemesterList;

		if (!nextSemesterList.some((item) => String(item.id) === selectedSemesterId)) {
			const fallback =
				nextSemesterList.find((item) => item.isAktif) ?? nextSemesterList.at(0) ?? null;
			selectedSemesterId = fallback ? String(fallback.id) : '';
		}

		semesterGanjil = nextSemesterList.find((item) => item.tipe === 'ganjil') ?? null;
		semesterGenap = nextSemesterList.find((item) => item.tipe === 'genap') ?? null;
		selectedSemesterRecord =
			nextSemesterList.find((item) => String(item.id) === selectedSemesterId) ?? null;

		const noTahun = tahunAjaranOptions.length === 0;
		const noSemester = nextSemesterList.length === 0;
		const noTanggal = disableTanggalInputs;
		disabledSave = disabledSekolahActions || (noTahun && noSemester && noTanggal);
	});

	let prevGanjilId: number | null = null;
	$effect(() => {
		const currentId = semesterGanjil?.id ?? null;
		if (currentId !== prevGanjilId) {
			tanggalRaporGanjil = semesterGanjil?.tanggalBagiRaport ?? '';
			prevGanjilId = currentId;
		}
	});

	let prevGenapId: number | null = null;
	$effect(() => {
		const currentId = semesterGenap?.id ?? null;
		if (currentId !== prevGenapId) {
			tanggalRaporGenap = semesterGenap?.tanggalBagiRaport ?? '';
			prevGenapId = currentId;
		}
	});

	let formInitSekolah = $state<Record<string, string>>({
		sekolahId: activeSekolahId ? String(activeSekolahId) : ''
	});

	let formInitPengaturan = $state<Record<string, string>>({
		tahunAjaranId: activeTahunAjaranId ? String(activeTahunAjaranId) : '',
		semesterId: activeSemesterId ? String(activeSemesterId) : '',
		'ganjil.id': tanggalBagiRaport.ganjilId ? String(tanggalBagiRaport.ganjilId) : '',
		'ganjil.tanggalBagiRaport': tanggalBagiRaport.ganjil ?? '',
		'genap.id': tanggalBagiRaport.genapId ? String(tanggalBagiRaport.genapId) : '',
		'genap.tanggalBagiRaport': tanggalBagiRaport.genap ?? ''
	});

	const refreshPengaturan = async () => {
		await goto('/pengaturan', { invalidateAll: true, replaceState: true });
	};

	const handleSwitchSuccess = ({ data }: { data?: Record<string, any> }) => {
		const payload = (data?.tahunAjaranList ?? []) as TahunAjaranWithSemester[];
		tahunAjaranOptions = payload;

		const nextSekolahId = data?.activeSekolahId ? String(data.activeSekolahId) : selectedSekolahId;
		const nextTahunId = data?.activeTahunAjaranId ? String(data.activeTahunAjaranId) : '';
		const nextSemesterId = data?.activeSemesterId ? String(data.activeSemesterId) : '';
		const rapor = data?.tanggalBagiRaport as
			| {
				ganjilId?: number;
				ganjil?: string | null;
				genapId?: number;
				genap?: string | null;
			}
			| undefined;

		selectedSekolahId = nextSekolahId;
		selectedTahunAjaranId = nextTahunId;
		selectedSemesterId = nextSemesterId;
		tanggalRaporGanjil = rapor?.ganjil ?? '';
		tanggalRaporGenap = rapor?.genap ?? '';

		formInitSekolah = { sekolahId: nextSekolahId };
		formInitPengaturan = {
			tahunAjaranId: nextTahunId,
			semesterId: nextSemesterId,
			'ganjil.id': rapor?.ganjilId ? String(rapor.ganjilId) : '',
			'ganjil.tanggalBagiRaport': rapor?.ganjil ?? '',
			'genap.id': rapor?.genapId ? String(rapor.genapId) : '',
			'genap.tanggalBagiRaport': rapor?.genap ?? ''
		};
	};

	const handleSaveSuccess = async () => {
		await refreshPengaturan();
	};
</script>

<div class="grid grid-cols-1 gap-6">
	<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
		<div class="space-y-6">
			<header class="space-y-2">
				<h1 class="text-2xl font-bold">Pengaturan Sekolah</h1>
				<p class="text-base-content/70 text-sm">
					Kelola sekolah aktif, tahun ajaran, semester, dan tanggal bagi rapor.
				</p>
			</header>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Ganti sekolah</legend>
				<FormEnhance action="?/switch" init={formInitSekolah} onsuccess={handleSwitchSuccess}>
					{#snippet children({ submitting })}
						<div class="relative">
							<select
								class="select bg-base-200 w-full dark:border-none"
								name="sekolahId"
								bind:value={selectedSekolahId}
								required
								disabled={disabledSekolahActions || submitting}
								onchange={(event) => {
									const value = event.currentTarget.value;
									selectedSekolahId = value;
									event.currentTarget.form?.requestSubmit();
								}}
							>
								<option value="" disabled>Pilih Sekolah</option>
								{#if sekolahList.length === 0}
									<option disabled value="">Belum ada data sekolah</option>
								{:else}
									{#each sekolahList as item (item.id)}
										<option value={String(item.id)}>{item.nama}</option>
									{/each}
								{/if}
							</select>
						</div>
					{/snippet}
				</FormEnhance>
				<p class="text-base-content/70 mt-1 text-xs">
					Operator dapat memilih sekolah aktif di sini.
				</p>
			</fieldset>

			<FormEnhance
				action="?/save"
				init={formInitPengaturan}
				onsuccess={handleSaveSuccess}
				enctype="multipart/form-data"
			>
				{#snippet children({ submitting, invalid })}
					<input
						type="hidden"
						name="ganjil.id"
						value={semesterGanjil ? String(semesterGanjil.id) : formInitPengaturan['ganjil.id'] ?? ''}
					/>
					<input
						type="hidden"
						name="genap.id"
						value={semesterGenap ? String(semesterGenap.id) : formInitPengaturan['genap.id'] ?? ''}
					/>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<fieldset class="fieldset">
							<legend class="fieldset-legend">Tahun Ajaran</legend>
							<select
								class="select bg-base-200 w-full dark:border-none"
								name="tahunAjaranId"
								bind:value={selectedTahunAjaranId}
								required
							>
								<option value="" disabled>Pilih Tahun Ajaran</option>
								{#each tahunAjaranOptions as item (item.id)}
									<option value={String(item.id)}>
										{item.nama}
										{item.isAktif ? ' (aktif)' : ''}
									</option>
								{/each}
							</select>
						</fieldset>

						<fieldset class="fieldset">
							<legend class="fieldset-legend">Semester</legend>
							<select
								class="select bg-base-200 w-full dark:border-none"
								name="semesterId"
								bind:value={selectedSemesterId}
								required
								disabled={semesterOptions.length === 0}
							>
								<option value="" disabled>Pilih Semester</option>
								{#each semesterOptions as item (item.id)}
									<option value={String(item.id)}>
										{item.nama}
										{item.isAktif ? ' (aktif)' : ''}
									</option>
								{/each}
							</select>
						</fieldset>

						<fieldset class="fieldset">
							<legend class="fieldset-legend">Tanggal bagi rapor semester ganjil</legend>
							<input
								class="input bg-base-200 w-full dark:border-none"
								type="date"
								name="ganjil.tanggalBagiRaport"
								bind:value={tanggalRaporGanjil}
								disabled={disableTanggalGanjil}
							/>
							<p class="text-base-content/70 mt-2 text-xs">
								Tanggal ini akan muncul di catatan rapor semester ganjil.
							</p>
						</fieldset>

						<fieldset class="fieldset">
							<legend class="fieldset-legend">Tanggal bagi rapor semester genap</legend>
							<input
								class="input bg-base-200 w-full dark:border-none"
								type="date"
								name="genap.tanggalBagiRaport"
								bind:value={tanggalRaporGenap}
								disabled={disableTanggalGenap}
							/>
							<p class="text-base-content/70 mt-2 text-xs">
								Tanggal ini akan muncul di catatan rapor semester genap.
							</p>
						</fieldset>

						<fieldset class="fieldset md:col-span-2">
							<legend class="fieldset-legend">Import data siswa dan kelas</legend>
							<input
								type="file"
								class="file-input file-input-ghost"
								accept=".xlsx, .xls"
								name="data"
							/>
							<p class="text-base-content/70 mt-1 text-xs">
								File daftar siswa dengan format excel dari dapodik. Pastikan file dapat dibuka sebelum
								import.
							</p>
						</fieldset>
					</div>

					<div class="mt-6 flex justify-end">
						<button
							class="btn btn-primary shadow-none"
							type="submit"
							disabled={submitting || invalid || disabledSave}
						>
							{submitting ? 'Menyimpan…' : 'Simpan'}
						</button>
					</div>
				{/snippet}
			</FormEnhance>
		</div>
	</section>
	<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
		<div class="space-y-6">
			<header class="space-y-2">
				<h2 class="text-xl font-bold">Pengaturan Aplikasi</h2>
				<p class="text-base-content/70 text-sm">
					Pengaturan tambahan untuk lingkungan server lokal Anda.
				</p>
			</header>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Atur port aplikasi</legend>
				<input
					type="text"
					class="input bg-base-200 join-item w-full dark:border-none"
					placeholder="Contoh: 5173"
				/>
				<p class="text-base-content/70 mt-1 text-xs">Kosongkan bila tidak diperlukan</p>
			</fieldset>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Alamat aplikasi</legend>
				<div class="join">
					<input
						type="text"
						disabled
						class="input bg-base-200 join-item w-full dark:border-none"
						placeholder="192.168.8.100:5173"
						value="192.168.8.100:5173"
					/>
					<button class="btn join-item shadow-none" type="button">Copy</button>
				</div>
				<p class="text-base-content/70 mt-1 text-xs">
					Buka alamat ini pada perangkat lain di jaringan lokal yang sama.
				</p>
			</fieldset>

			<div class="flex justify-end">
				<button class="btn btn-primary shadow-none" type="button">
					<Icon name="save" />
					Simpan
				</button>
			</div>
		</div>
	</section>
</div>
