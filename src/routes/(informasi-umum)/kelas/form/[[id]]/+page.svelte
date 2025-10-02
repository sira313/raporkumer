<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';

	type TahunAjaranOption =
		(typeof import('$lib/server/db/schema').tableTahunAjaran.$inferSelect) & {
			semester: typeof import('$lib/server/db/schema').tableSemester.$inferSelect[];
			isAktif: number | boolean;
		};

	let { data } = $props();
	const tahunAjaranOptions = $derived((data.tahunAjaranOptions ?? []) as TahunAjaranOption[]);
	let selectedTahunAjaranId = $state((data.formInit?.tahunAjaranId as string | undefined) ?? '');
	const semesterOptions = $derived.by(() => {
		const tahunId = selectedTahunAjaranId;
		const item = tahunAjaranOptions.find((option) => String(option.id) === tahunId);
		return item?.semester ?? [];
	});
	let selectedSemesterId = $state((data.formInit?.semesterId as string | undefined) ?? '');
	const disableAcademic = $derived.by(
		() => tahunAjaranOptions.length === 0 || semesterOptions.length === 0
	);

	$effect(() => {
		const options = semesterOptions;
		if (!options.length) {
			selectedSemesterId = '';
			return;
		}
		if (!options.some((option) => String(option.id) === selectedSemesterId)) {
			const fallback =
				options.find((option) => option.isAktif) ??
				options.find((option) => option.tipe === 'ganjil') ??
				options[0];
			selectedSemesterId = fallback ? String(fallback.id) : '';
		}
	});
</script>

<FormEnhance
	action="?/save"
	init={data.formInit}
	onsuccess={async () => {
		await goto('/kelas');
		await invalidate('app:kelas');
	}}
>
	{#snippet children({ submitting })}
		<div class="card bg-base-100 mx-auto rounded-lg p-4 shadow-md">
			<h2 class="mb-4 text-xl font-bold">Formulir Isian Data Kelas</h2>
			{#if tahunAjaranOptions.length === 0}
				<div class="alert alert-warning mb-4 flex items-center gap-3">
					<Icon name="warning" />
					<span>Tambahkan tahun ajaran dan semester aktif terlebih dahulu sebelum membuat data kelas.</span>
				</div>
			{:else if semesterOptions.length === 0}
				<div class="alert alert-warning mb-4 flex items-center gap-3">
					<Icon name="warning" />
					<span>Pilih tahun ajaran yang memiliki data semester.</span>
				</div>
			{/if}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<legend class="fieldset-legend">Tahun Ajaran</legend>
					<select
						required
						name="tahunAjaranId"
						class="select bg-base-200 w-full dark:border-none"
						bind:value={selectedTahunAjaranId}
						disabled={tahunAjaranOptions.length === 0}
					>
						<option value="" disabled>Pilih tahun ajaran</option>
						{#each tahunAjaranOptions as option (option.id)}
							<option value={String(option.id)}>
								{option.nama}
								{option.isAktif ? ' (aktif)' : ''}
							</option>
						{/each}
					</select>
				</div>

				<div>
					<legend class="fieldset-legend">Semester</legend>
					<select
						required
						name="semesterId"
						class="select bg-base-200 w-full dark:border-none"
						bind:value={selectedSemesterId}
						disabled={semesterOptions.length === 0}
					>
						<option value="" disabled>Pilih semester</option>
						{#each semesterOptions as option (option.id)}
							<option value={String(option.id)}>
								{option.nama}
								{option.isAktif ? ' (aktif)' : ''}
							</option>
						{/each}
					</select>
					{#if selectedTahunAjaranId && semesterOptions.length === 0}
						<p class="text-xs text-error mt-2">
							Tahun ajaran ini belum memiliki data semester. Tambahkan semester di menu Rapor.
						</p>
					{/if}
				</div>

				<!-- Nama Rombel -->
				<div>
					<legend class="fieldset-legend">Nama Rombel</legend>
					<input
						required
						type="text"
						class="input validator bg-base-200 w-full dark:border-none"
						placeholder="Contoh: VI (Kelas 6)"
						name="rombel"
					/>
				</div>

				<!-- Fase -->
				<!-- <div>
					<legend class="fieldset-legend">Fase</legend>
					<input
						required
						type="text"
						class="input validator bg-base-200 w-full dark:border-none"
						placeholder="Contoh: Fase C (Kelas 6)"
						name="fase"
					/>
				</div> -->

				<!-- Fase diganti dengan tingkat pendidikan -->
				<div>
					<legend class="fieldset-legend">Fase (opsional)</legend>
					<select
						class="select bg-base-200 w-full dark:border-none"
						title="Pilih tingkat pendidikan"
						name="fase"
						disabled={!data.tingkatOptions?.length}
					>
						<option value="" disabled selected>Pilih fase</option>
						{#each data.tingkatOptions ?? [] as option (option.fase)}
							<option value={option.fase}>{option.label}</option>
						{:else}
							<option value="" disabled>
								Atur data sekolah terlebih dahulu untuk memilih fase
							</option>
						{/each}
					</select>
				</div>

				<!-- Wali Kelas -->
				<div>
					<legend class="fieldset-legend">Wali Kelas (opsional)</legend>
					<input
						type="text"
						class="input validator bg-base-200 w-full dark:border-none"
						placeholder="Contoh: Damian Wayne, Bat"
						name="waliKelas.nama"
					/>
				</div>

				<!-- NIP Wali Kelas -->
				<div>
					<legend class="fieldset-legend">NIP Wali Kelas (opsional)</legend>
					<input
						type="text"
						class="input validator bg-base-200 w-full dark:border-none"
						placeholder="Contoh: 19940505 201803 1 008"
						name="waliKelas.nip"
					/>
				</div>
			</div>
			<div class="mt-6 flex justify-end gap-2">
				<a class="btn shadow-none" href="/kelas" aria-label="kembali">
					<Icon name="left" />
					Kembali
				</a>
				<button
					class="btn shadow-none {data.kelas?.id ? 'btn-secondary' : 'btn-primary'}"
					disabled={submitting || disableAcademic}
				>
					{#if submitting}
						<div class="loading loading-spinner"></div>
					{:else if data.kelas?.id}
						<Icon name="edit" />
						Update
					{:else}
						<Icon name="plus" />
						Tambah
					{/if}
				</button>
			</div>
		</div>
	{/snippet}
</FormEnhance>
