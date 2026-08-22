<script lang="ts">
	import { invalidate } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';

	let { data } = $props();

	type SectionLog = { label: string; status: 'ok' | 'gagal' | 'dilewati'; detail: string };

	const modes = [
		{ value: 'tes-koneksi', label: 'Tes Koneksi Dapodik' },
		{ value: 'semester', label: 'Ambil Semester Saja' },
		{ value: 'semua', label: 'Ambil Semua Data' }
	] as const;

	type ModeValue = (typeof modes)[number]['value'];

	let selectedMode = $state<ModeValue>('tes-koneksi');
	let sections = $state<SectionLog[]>([]);
	let resultMessage = $state('');

	const modeDescription: Record<ModeValue, string> = {
		'tes-koneksi': 'Berfungsi untuk melakukan tes koneksi dapodik melalui bearer token.',
		semester:
			'Ambil data semester saja. Berdampak pada halaman /sekolah/tahun-ajaran dan "Semester Aktif" pada halaman /akademik.',
		semua:
			'Ambil semua data yang dapat diambil dari Dapodik: profil sekolah, semester, PTK/guru, rombongan belajar, peserta didik, pembelajaran (mapel & pengampu), dan ekstrakurikuler.'
	};

	function statusIcon(status: SectionLog['status']): IconName {
		if (status === 'ok') return 'success';
		if (status === 'gagal') return 'error';
		return 'info';
	}

	function statusClass(status: SectionLog['status']): string {
		if (status === 'ok') return 'text-success';
		if (status === 'gagal') return 'text-error';
		return 'opacity-60';
	}

	function handleSuccess({ data: payload }: { data?: Record<string, unknown> }) {
		resultMessage =
			typeof payload?.message === 'string' ? payload.message : 'Sinkronisasi selesai.';
		sections = Array.isArray(payload?.sections) ? (payload.sections as SectionLog[]) : [];
		invalidate('app:sekolah');
	}
</script>

<FormEnhance
	action="?/sync"
	init={{ ...(data.settings ?? {}), npsn: data.npsn ?? '' }}
	onsuccess={handleSuccess}
>
	{#snippet children({ submitting })}
		<h3 class="mb-1 text-xl font-bold">Sinkronisasi Dapodik</h3>
		<p class="mb-4 text-sm opacity-70">
			Ambil data dari aplikasi Dapodik desktop sekolah melalui Web Service (Bearer token). Data
			Dapodik akan menimpa data yang sudah ada di sistem.
		</p>

		<div class="grid grid-cols-1 gap-2">
			<div class="fieldset">
				<legend class="fieldset-legend">Token</legend>
				<input
					required
					type="text"
					name="token"
					placeholder="Masukkan token web service dapodik"
					class="input bg-base-200 dark:bg-base-300 validator w-full border-base-300 dark:border-none"
				/>
				<p class="label text-wrap">
					Token didapat dari menu Web Service pada aplikasi Dapodik desktop sekolah.
				</p>
			</div>

			<div class="fieldset">
				<legend class="fieldset-legend">URL Dapodik</legend>
				<input
					required
					type="text"
					name="url"
					placeholder="Contoh: 192.168.8.114:5774"
					class="input bg-base-200 dark:bg-base-300 validator w-full border-base-300 dark:border-none"
				/>
			</div>

			<div class="fieldset">
				<legend class="fieldset-legend">NPSN</legend>
				<input
					required
					type="text"
					name="npsn"
					placeholder="Contoh: 69856875"
					class="input bg-base-200 dark:bg-base-300 validator w-full border-base-300 dark:border-none"
				/>
			</div>

			<div class="fieldset">
				<legend class="fieldset-legend">Mode Sinkronisasi</legend>
				<select
					bind:value={selectedMode}
					name="mode"
					class="select w-full truncate bg-base-200 dark:bg-base-300 validator border-base-300 dark:border-none"
				>
					{#each modes as item (item.value)}
						<option value={item.value}>{item.label}</option>
					{/each}
				</select>
				<p class="label text-wrap">{modeDescription[selectedMode]}</p>
			</div>
		</div>

		{#if sections.length > 0}
			<div class="bg-base-200 dark:bg-base-300 mt-4 rounded-md p-3">
				{#if resultMessage}
					<p class="mb-2 font-semibold">{resultMessage}</p>
				{/if}
				<ul class="flex flex-col gap-1">
					{#each sections as section (section.label)}
						<li class="flex items-start gap-2 text-sm">
							<span class="{statusClass(section.status)} mt-0.5 shrink-0">
								<Icon name={statusIcon(section.status)} />
							</span>
							<span>
								<b>{section.label}:</b>
								{section.detail}
							</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="mt-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
			<button type="button" class="btn btn-soft shadow-none" onclick={() => history.back()}>
				<Icon name="close" />
				Tutup
			</button>
			<button class="btn btn-primary shadow-none" disabled={submitting}>
				{#if submitting}
					<span class="loading loading-spinner"></span>
				{/if}
				<Icon name="play" />
				Proses
			</button>
		</div>
	{/snippet}
</FormEnhance>
