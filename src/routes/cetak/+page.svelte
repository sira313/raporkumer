<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/icon.svelte';
	import { toast } from '$lib/components/toast.svelte';

	let { data } = $props();

	type DocumentType = 'cover' | 'biodata' | 'rapor' | 'piagam';

	const documentOptions: Array<{ value: DocumentType; label: string }> = [
		{ value: 'cover', label: 'Cover' },
		{ value: 'biodata', label: 'Biodata' },
		{ value: 'rapor', label: 'Rapor' },
		{ value: 'piagam', label: 'Piagam' }
	];

	const documentPaths: Record<Exclude<DocumentType, 'piagam'>, string> = {
		cover: '/cetak/cover',
		biodata: '/cetak/biodata',
		rapor: '/cetak/rapor'
	};

	let selectedDocument = $state<DocumentType | ''>('');
	let selectedMuridId = $state('');

	const academicContext = $derived(data.academicContext ?? null);
	const activeSemester = $derived.by(() => {
		const context = academicContext;
		if (!context?.activeSemesterId) return null;
		for (const tahun of context.tahunAjaranList ?? []) {
			const match = tahun.semester.find((item) => item.id === context.activeSemesterId);
			if (match) {
				return {
					...match,
					tahunAjaranNama: tahun.nama
				};
			}
		}
		return null;
	});

	const kelasAktif = $derived(page.data.kelasAktif ?? null);
	const kelasAktifLabel = $derived.by(() => {
		if (!kelasAktif) return null;
		return kelasAktif.fase ? `${kelasAktif.nama} - ${kelasAktif.fase}` : kelasAktif.nama;
	});

	const daftarMurid = $derived(data.daftarMurid ?? []);
	const muridCount = $derived.by(() => daftarMurid.length);
	const hasMurid = $derived.by(() => muridCount > 0);
	const selectedMurid = $derived.by(
		() => daftarMurid.find((murid) => String(murid.id) === selectedMuridId) ?? null
	);

	$effect(() => {
		const list = daftarMurid;
		if (!list.length) {
			if (selectedMuridId) {
				selectedMuridId = '';
			}
			return;
		}
		if (selectedMuridId && !list.some((murid) => String(murid.id) === selectedMuridId)) {
			selectedMuridId = '';
		}
	});

	const selectedDocumentEntry = $derived.by(
		() => documentOptions.find((option) => option.value === selectedDocument) ?? null
	);
	const previewDisabled = $derived.by(
		() => !selectedDocument || selectedDocument === 'piagam' || !hasMurid || !selectedMurid
	);
	const previewButtonTitle = $derived.by(() => {
		if (!selectedDocument) return 'Pilih dokumen yang ingin dilihat terlebih dahulu';
		if (selectedDocument === 'piagam') return 'Preview piagam belum tersedia';
		if (!hasMurid) return 'Tidak ada murid yang dapat dilihat untuk kelas ini';
		if (!selectedMurid) return 'Pilih murid yang ingin dilihat terlebih dahulu';
		return `Preview ${selectedDocumentEntry?.label ?? 'dokumen'} untuk ${selectedMurid.nama}`;
	});

	function handlePreview() {
		const documentType = selectedDocument;
		if (!documentType) {
			toast('Pilih dokumen yang ingin dilihat terlebih dahulu.', 'warning');
			return;
		}
		if (!hasMurid) {
			toast('Tidak ada murid yang dapat dilihat untuk kelas ini.', 'warning');
			return;
		}
		const murid = selectedMurid;
		if (!murid) {
			toast('Pilih murid yang ingin dilihat.', 'warning');
			return;
		}
		if (documentType === 'piagam') {
			toast('Preview piagam akan tersedia setelah tampilan piagam selesai dibuat.', 'info');
			return;
		}

		const basePath = documentPaths[documentType];
		const params = new URLSearchParams({ murid_id: String(murid.id) });
		if (data.kelasId) {
			params.set('kelas_id', data.kelasId);
		}
		const target = `${basePath}?${params.toString()}`;

		void goto(target, { replaceState: false, keepFocus: true });
	}
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<h2 class="mb-6 text-xl font-bold">
		Cetak Dokumen Rapor
		{#if kelasAktifLabel}
			<span class="mt-2 block text-lg font-semibold text-base-content">
				{kelasAktifLabel}
				{#if activeSemester}
					{' '}- Semester {activeSemester.nama} ({activeSemester.tahunAjaranNama})
				{:else if academicContext?.activeSemesterId}
					{' '}- Semester aktif tidak ditemukan dalam daftar tahun ajaran.
				{:else}
					{' '}- Semester belum disetel di menu Rapor.
				{/if}
			</span>
		{/if}
	</h2>
	<div class="mb-2 flex flex-col gap-2 sm:flex-row">
		<select
			class="select bg-base-200 w-full dark:border-none"
			bind:value={selectedDocument}
			title="Pilih dokumen yang ingin dilihat"
		>
			<option value="">Pilih dokumen…</option>
			{#each documentOptions as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
		<select
			class="select bg-base-200 w-full dark:border-none"
			bind:value={selectedMuridId}
			title="Pilih murid yang ingin dilihat preview dokumennya"
			disabled={!hasMurid}
		>
			<option value="">Pilih murid…</option>
			{#each daftarMurid as murid (murid.id)}
				<option value={String(murid.id)}>
					{murid.nama}
					{#if murid.nisn}
						 — {murid.nisn}
					{:else if murid.nis}
						 — {murid.nis}
					{/if}
				</option>
			{/each}
		</select>
		<button
			class="btn shadow-none sm:ml-auto"
			type="button"
			title={previewButtonTitle}
			disabled={previewDisabled}
			onclick={handlePreview}
		>
			<Icon name="eye" />
			Preview
		</button>
	</div>
	{#if selectedDocument === 'piagam'}
		<p class="text-warning text-sm">
			Cetak piagam akan tersedia setelah tampilan piagam selesai dibuat.
		</p>
	{/if}

	<div class="mt-4 space-y-2 text-sm">
		{#if hasMurid}
			<p>
				Terdapat <strong>{muridCount}</strong> murid di kelas ini. Preview dokumen dilakukan per murid melalui menu data murid.
			</p>
		{:else}
			<p class="text-warning">
				Belum ada data murid yang bisa dilihat. Tambahkan murid terlebih dahulu pada menu Informasi Umum › Murid.
			</p>
		{/if}
	</div>
</div>
