<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- small helper link/button uses are intentional here */
	import Icon from '$lib/components/icon.svelte';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import { invalidate, goto } from '$app/navigation';
	import MuridPicker from '$lib/components/asesmen-sumatif/murid-picker.svelte';
	import { checkboxArrowNavigation } from '$lib/utils/checkbox-navigation';

	type EntryStatus = 'ya' | 'tidak' | null;
	type PageData = {
		murid: { id: number; nama: string };
		kelasId: number;
		mapelList: { id: number; nama: string }[];
		pickerMapelId: number;
		mapel: { id: number; nama: string };
		entries: Array<{
			index: number;
			tujuanPembelajaranId: number;
			deskripsi: string;
			lingkupMateri: string;
			status: EntryStatus;
		}>;
		hasTujuan: boolean;
	};

	let { data }: { data: PageData } = $props();

	type EntryOverrideMap = Record<number, EntryStatus | undefined>;

	let overrides = $state<EntryOverrideMap>({});

	const entries = $derived.by(
		() =>
			data.entries.map<PageData['entries'][number]>((entry, index) => {
				const override = overrides[index];
				return {
					...entry,
					status: override === undefined ? entry.status : override
				};
			}) as PageData['entries']
	);

	// svelte-ignore state_referenced_locally
	const kembaliHref = `/asesmen-formatif?mapel_id=${data.mapel.id}`;

	// Navigasi antar murid/mapel memakai route yang sama (komponen tidak remount) —
	// bersihkan override agar status murid/mapel baru terbaca dari data server.
	$effect(() => {
		void data.murid.id;
		void data.mapel.id;
		overrides = {};
	});

	// Pemilih murid & mapel (komponen bersama) — isDirty dipakai untuk
	// konfirmasi sebelum pindah agar penilaian yang belum tersimpan tidak hilang.
	const isDirty = $derived(Object.keys(overrides).length > 0);

	function toggleEntry(
		index: number,
		value: Exclude<EntryStatus, null>,
		target: HTMLInputElement | null = null
	) {
		const base = data.entries[index];
		if (!base) return;
		const currentStatus = overrides[index] ?? base.status ?? null;
		const nextStatus: EntryStatus = currentStatus === value ? null : value;
		const updated: EntryOverrideMap = { ...overrides };
		const baseStatus = base.status ?? null;
		if (nextStatus === baseStatus) {
			delete updated[index];
		} else {
			updated[index] = nextStatus;
		}
		overrides = updated;

		if (!target) return;
		target.checked = nextStatus === value;
		const row = target.closest('tr');
		if (!row) return;
		const oppositeColumn = value === 'ya' ? 'tidak' : 'ya';
		const oppositeInput = row.querySelector<HTMLInputElement>(
			`input[data-checkbox-column="${oppositeColumn}"]`
		);
		if (oppositeInput) {
			oppositeInput.checked = false;
		}
	}

	function isChecked(status: EntryStatus, value: 'ya' | 'tidak') {
		return status === value;
	}

	async function handleSuccess() {
		await invalidate('app:asesmen-formatif');
		await invalidate('app:asesmen-formatif/formulir');
		overrides = {};
	}

	async function pilihMapel(event: Event) {
		const select = event.currentTarget as HTMLSelectElement;
		const mapelId = Number(select.value);
		if (!Number.isInteger(mapelId) || mapelId === data.pickerMapelId) return;
		if (
			isDirty &&
			!confirm(
				'Masih ada perubahan penilaian yang belum disimpan. Pindah mapel akan membuangnya. Lanjutkan?'
			)
		) {
			select.value = String(data.pickerMapelId);
			return;
		}
		await goto(`/asesmen-formatif/formulir-asesmen?murid_id=${data.murid.id}&mapel_id=${mapelId}`, {
			keepFocus: true
		});
	}
</script>

<div class="bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<FormEnhance action="?/save" onsuccess={handleSuccess} showToast>
		{#snippet children({ submitting })}
			<input type="hidden" name="muridId" value={data.murid.id} />
			<input type="hidden" name="mapelId" value={data.mapel.id} />

			<div class="mb-6 flex flex-col gap-2 sm:flex-row">
				<a href={kembaliHref} class="btn btn-soft shadow-none">
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

			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
				<select
					class="select bg-base-200 w-full truncate dark:border-none"
					title="Pilih mata pelajaran"
					aria-label="Pilih mata pelajaran"
					value={data.pickerMapelId}
					onchange={pilihMapel}
				>
					{#each data.mapelList as opsi (opsi.id)}
						<option value={opsi.id}>{opsi.nama}</option>
					{/each}
				</select>
				<MuridPicker
					basePath="/asesmen-formatif/formulir-asesmen"
					kelasId={data.kelasId}
					muridId={data.murid.id}
					mapelId={data.pickerMapelId}
					getDirty={() => isDirty}
					confirmMessage="Masih ada perubahan penilaian yang belum disimpan. Pindah murid akan membuangnya. Lanjutkan?"
				/>
			</div>

			<h3 class="py-2 text-lg font-bold">
				Apakah {data.murid.nama} telah memenuhi setiap tujuan pembelajaran {data.mapel.nama}?
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
					<table class="border-base-200 table border dark:border-none">
						<thead>
							<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
								<th style="width: 40px; min-width: 40px;">No</th>
								<th class="w-full" style="min-width: 260px;">Tujuan Pembelajaran</th>
								<th class="text-center">Ya</th>
								<th class="text-center">Tidak</th>
							</tr>
						</thead>
						<tbody use:checkboxArrowNavigation>
							{#each entries as entry, index (entry.tujuanPembelajaranId)}
								<tr
									class:border-l-success={entry.status === 'ya'}
									class:border-l-error={entry.status === 'tidak'}
									class:border-l-4={entry.status !== null}
								>
									<td>{entry.index}</td>
									<td>
										<p class="font-medium">{entry.deskripsi}</p>
										<p class="text-base-content/60 mt-2 text-xs tracking-wide uppercase">
											{entry.lingkupMateri}
										</p>
										<input
											type="hidden"
											name={`entries.${index}.tujuanPembelajaranId`}
											value={entry.tujuanPembelajaranId}
										/>
										<input
											type="hidden"
											name={`entries.${index}.status`}
											value={entry.status ?? ''}
										/>
									</td>
									<td class="text-center">
										<input
											type="checkbox"
											class="checkbox"
											disabled={submitting}
											checked={isChecked(entry.status, 'ya')}
											data-checkbox-column="ya"
											onchange={(event) =>
												toggleEntry(index, 'ya', event.currentTarget as HTMLInputElement)}
										/>
									</td>
									<td class="text-center">
										<input
											type="checkbox"
											class="checkbox"
											disabled={submitting}
											checked={isChecked(entry.status, 'tidak')}
											data-checkbox-column="tidak"
											onchange={(event) =>
												toggleEntry(index, 'tidak', event.currentTarget as HTMLInputElement)}
										/>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{/snippet}
	</FormEnhance>
</div>
