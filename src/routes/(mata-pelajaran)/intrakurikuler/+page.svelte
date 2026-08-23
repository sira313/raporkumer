<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- many navigation links built from data */
	import { page } from '$app/state';
	import { invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/icon.svelte';
	import { showModal } from '$lib/components/global-modal.svelte';
	import ImportMapelDialog from '$lib/components/intrakurikuler/import-mapel-dialog.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import {
		agamaMapelLabelByName,
		agamaMapelNames,
		agamaParentName,
		jenisMapel,
		pksMapelLabelByName,
		pksMapelNames,
		pksParentName
	} from '$lib/statics';
	import { modalRoute } from '$lib/utils';
	import IntrakurikulerModals from '$lib/components/intrakurikuler/modals.svelte';

	type MapelWithIndicator = MataPelajaran & { tpCount: number; editTpMapelId?: number };
	let { data }: { data: { mapel: { daftarMapel: MapelWithIndicator[] } } } = $props();

	const emptyStateMessage = 'Belum ada data mata pelajaran';
	const agamaMapelNameSet = new Set<string>(agamaMapelNames);
	const pksMapelNameSet = new Set<string>(pksMapelNames);

	const kelasAktifLabel = $derived.by(() => {
		const kelas = page.data.kelasAktif ?? null;
		if (!kelas) return null;
		return kelas.fase ? `${kelas.nama} - ${kelas.fase}` : kelas.nama;
	});

	const hasKelasAktif = $derived.by(() => !!page.data.kelasAktif);
	// server-provided small permission flag: if false, UI for managing
	// mata pelajaran should be disabled for this client (role 'user').
	const canManageMapel = $derived.by(() => {
		const u = page.data.user as { canManageMapel?: boolean } | null | undefined;
		// default to true for backwards compatibility
		return u?.canManageMapel ?? true;
	});

	// Dapatkan jenjang varian dari sekolah (misalnya 'SMK')
	const jenjangVariant = $derived.by(() => {
		const sekolah = page.data.sekolah as { jenjangVariant?: string | null } | null | undefined;
		return sekolah?.jenjangVariant ?? null;
	});

	// Fungsi khusus untuk jenjang SMK: ubah label "Wajib" menjadi "Umum"
	function getWajibLabel(): string {
		return jenjangVariant?.toUpperCase() === 'SMK' ? 'Umum' : 'Wajib';
	}

	// Fungsi untuk mengecek apakah section kejuruan harus ditampilkan (hanya untuk SMK)
	function shouldShowKejuruan(): boolean {
		return jenjangVariant?.toUpperCase() === 'SMK';
	}

	// Fungsi untuk mengecek apakah section pemberdayaan harus ditampilkan (hanya untuk PKBM/SKB)
	function shouldShowPemberdayaan(): boolean {
		return ['PKBM', 'SKB'].includes(jenjangVariant?.toUpperCase() ?? '');
	}

	// Satu daftar gabungan seluruh jenis, sudah diurutkan server (belum dipetakan
	// paling atas). Baris kejuruan/pemberdayaan hanya tampil sesuai jenjang sekolah
	// (SMK / PKBM-SKB) — konsisten dengan kotak statistiknya.
	const daftarMapel = $derived(
		(data.mapel.daftarMapel ?? []).filter((item) => {
			if (item.jenis === 'kejuruan') return shouldShowKejuruan();
			if (item.jenis === 'pemberdayaan') return shouldShowPemberdayaan();
			return true;
		})
	);
	const totalMapel = $derived(daftarMapel.length);

	const hitunganJenis = $derived.by(() => {
		const acc: Record<MataPelajaran['jenis'], number> = {
			belum_dipetakan: 0,
			wajib: 0,
			pilihan: 0,
			mulok: 0,
			kejuruan: 0,
			pemberdayaan: 0
		};
		for (const item of daftarMapel) {
			if (item.jenis && item.jenis in acc) acc[item.jenis] += 1;
		}
		return acc;
	});

	function formatKkm(kkm: number | null | undefined) {
		return typeof kkm === 'number' && Number.isFinite(kkm) ? kkm : '—';
	}

	// ── Edit Urutan (drag-and-drop) ──
	let editUrutan = $state(false);
	let urutanList = $state<MapelWithIndicator[]>([]);
	let dragIndex = $state<number | null>(null);
	let simpanUrutanPending = $state(false);

	function mulaiEditUrutan() {
		urutanList = [...daftarMapel];
		dragIndex = null;
		editUrutan = true;
	}

	function batalEditUrutan() {
		editUrutan = false;
		dragIndex = null;
	}

	function handleDragStart(index: number, e: DragEvent) {
		dragIndex = index;
		e.dataTransfer?.setData('text/plain', String(index));
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	function handleDragOver(e: DragEvent) {
		if (dragIndex === null) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
	}

	function handleDrop(index: number) {
		if (dragIndex === null || dragIndex === index) {
			dragIndex = null;
			return;
		}
		const [moved] = urutanList.splice(dragIndex, 1);
		urutanList.splice(index, 0, moved);
		dragIndex = null;
	}

	const barisTampil = $derived(editUrutan ? urutanList : daftarMapel);

	function handleDeleteClick(event: MouseEvent, mapel: Pick<MataPelajaran, 'nama'>) {
		if (event.defaultPrevented) return;
		if (event.shiftKey || event.metaKey || event.ctrlKey || event.button === 1) return;

		const isAgama = agamaMapelNameSet.has(mapel.nama);
		const isPks = pksMapelNameSet.has(mapel.nama);

		if (!isAgama && !isPks) return;

		let message = '';
		if (isAgama) {
			const label = agamaMapelLabelByName[mapel.nama];
			message =
				mapel.nama === agamaParentName
					? `Menghapus "<b>${mapel.nama}</b>" akan menghapus seluruh varian Pendidikan Agama dan Budi Pekerti pada kelas ini.`
					: `Menghapus "<b>${mapel.nama}</b>" akan menghapus varian Pendidikan Agama <b>${label}</b> beserta seluruh penilaian terkait.`;
		} else if (isPks) {
			const label = pksMapelLabelByName[mapel.nama];
			message =
				mapel.nama === pksParentName
					? `Menghapus "<b>${mapel.nama}</b>" akan menghapus seluruh varian Pendalaman Kitab Suci pada kelas ini.`
					: `Menghapus "<b>${mapel.nama}</b>" akan menghapus varian PKS <b>${label}</b> beserta seluruh penilaian terkait.`;
		}

		if (message) {
			toast({ message, type: 'warning', persist: true });
		}
	}
</script>

<div class="card bg-base-100 rounded-box border border-none p-4 shadow-md">
	<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<h2 class="text-xl font-bold">Daftar Mata Pelajaran Intrakurikuler</h2>
			{#if kelasAktifLabel}
				<p class="text-base-content/70 text-sm">Kelas aktif: {kelasAktifLabel}</p>
			{:else}
				<p class="text-base-content/60 text-sm">
					Pilih kelas di navbar untuk melihat mata pelajaran intrakurikuler.
				</p>
			{/if}
		</div>
	</div>

	<div
		class="stats stats-horizontal border-base-200 bg-base-100 dark:bg-base-200 text-base-content mt-4 w-full border shadow-md dark:shadow-none"
	>
		<div class="stat place-items-start">
			<div class="stat-title">Mapel {getWajibLabel()}</div>
			<div class="stat-value text-2xl">{hitunganJenis.wajib}</div>
		</div>
		{#if hitunganJenis.belum_dipetakan > 0}
			<div class="stat place-items-start">
				<div class="stat-title text-warning">Belum Dipetakan</div>
				<div class="stat-value text-2xl">{hitunganJenis.belum_dipetakan}</div>
			</div>
		{/if}
		<div class="stat place-items-start">
			<div class="stat-title">Mapel Pilihan</div>
			<div class="stat-value text-2xl">{hitunganJenis.pilihan}</div>
		</div>
		<div class="stat place-items-start">
			<div class="stat-title">Muatan Lokal</div>
			<div class="stat-value text-2xl">{hitunganJenis.mulok}</div>
		</div>
		{#if shouldShowKejuruan()}
			<div class="stat place-items-start">
				<div class="stat-title">Kejuruan</div>
				<div class="stat-value text-2xl">{hitunganJenis.kejuruan}</div>
			</div>
		{/if}
		{#if shouldShowPemberdayaan()}
			<div class="stat place-items-start">
				<div class="stat-title">Pemberdayaan & Keterampilan</div>
				<div class="stat-value text-2xl">{hitunganJenis.pemberdayaan}</div>
			</div>
		{/if}
		<div class="stat place-items-start">
			<div class="stat-title">Total Mapel</div>
			<div class="stat-value text-2xl">{totalMapel}</div>
		</div>
	</div>

	<div class="mt-4 flex flex-wrap items-start justify-between gap-2">
		{#if canManageMapel && hasKelasAktif && !editUrutan}
			<button
				type="button"
				class="btn btn-soft shadow-none order-2 w-full sm:order-1 sm:w-auto"
				onclick={mulaiEditUrutan}
			>
				<Icon name="menu-drawer" />
				Edit Urutan
			</button>
		{:else if editUrutan}
			<form
				method="POST"
				action="?/simpan_urutan"
				class="order-2 flex w-full sm:order-1 sm:w-auto"
				use:enhance={() => {
					simpanUrutanPending = true;
					return async ({ result, update }) => {
						simpanUrutanPending = false;
						if (result.type === 'success') {
							await invalidate('app:mapel');
							batalEditUrutan();
							toast({
								message:
									(result.data as { success?: string } | undefined)?.success ??
									'Urutan mata pelajaran berhasil disimpan.',
								type: 'success'
							});
						} else if (result.type === 'failure') {
							toast({
								message:
									(result.data as { fail?: string } | undefined)?.fail ?? 'Gagal menyimpan urutan.',
								type: 'error'
							});
						} else {
							await update({ reset: false });
						}
					};
				}}
			>
				<input type="hidden" name="urutan" value={JSON.stringify(urutanList.map((m) => m.id))} />
				<button
					type="submit"
					class="btn btn-primary btn-soft flex-1 rounded-r-none shadow-none"
					disabled={simpanUrutanPending}
				>
					<Icon name="save" />
					Simpan
				</button>
				<button
					type="button"
					class="btn btn-error btn-soft flex-1 rounded-l-none shadow-none"
					disabled={simpanUrutanPending}
					onclick={batalEditUrutan}
				>
					<Icon name="close-sm" />
					Batal
				</button>
			</form>
		{/if}

		<div class="order-1 max-sm:w-full sm:order-2 sm:ml-auto">
			<div class="flex">
				<a
					class={`btn btn-soft rounded-r-none shadow-none max-sm:flex-1 ${!canManageMapel ? 'pointer-events-none opacity-50' : ''}`}
					href={canManageMapel ? '/intrakurikuler/form' : '#'}
					use:modalRoute={canManageMapel ? 'add-mapel' : ''}
					aria-disabled={!canManageMapel}
				>
					<Icon name="plus" />
					Tambah Mapel
				</a>

				<!-- dropdown yang tergabung (perhatikan join-item dan hilangkan margin m-1) -->
				<div class="dropdown dropdown-end">
					<!-- trigger: gunakan button bertipe btn supaya tampil seperti item lain -->
					<button
						title="Export dan Import mata pelajaran"
						type="button"
						tabindex="0"
						class={`btn btn-soft rounded-l-none shadow-none ${!canManageMapel ? 'opacity-50' : ''}`}
						disabled={!canManageMapel}
						aria-disabled={!canManageMapel}
					>
						<Icon name="down" />
					</button>

					<!-- menu dropdown -->
					<ul
						tabindex="-1"
						class="dropdown-content menu bg-base-100 border-base-300 z-50 mt-2 w-49 rounded-md border p-2 shadow-lg"
					>
						<li>
							<button
								type="button"
								class={`w-full text-left ${!canManageMapel ? 'pointer-events-none opacity-50' : ''}`}
								disabled={!canManageMapel}
								aria-disabled={!canManageMapel}
								onclick={() =>
									showModal({
										title: 'Impor Mata Pelajaran',
										body: ImportMapelDialog,
										dismissible: true
									})}
							>
								<Icon name="import" />
								Impor Mapel
							</button>
						</li>
						<li>
							<button
								type="button"
								class={`w-full text-left ${!canManageMapel ? 'pointer-events-none opacity-50' : ''}`}
								disabled={!canManageMapel}
								aria-disabled={!canManageMapel}
								onclick={async () => {
									try {
										const resp = await fetch('/intrakurikuler/export_mapel', { method: 'GET' });
										if (!resp.ok) {
											const body = await resp.json().catch(() => ({}));
											return toast({
												message: body?.fail || 'Gagal mengekspor data.',
												type: 'error'
											});
										}
										const blob = await resp.blob();
										const url = URL.createObjectURL(blob);
										// prefer filename from Content-Disposition header set by server
										let filename = `mapel-${new Date().toISOString().slice(0, 10)}.xlsx`;
										try {
											const cd =
												resp.headers.get('content-disposition') ||
												resp.headers.get('Content-Disposition');
											if (cd) {
												// match filename*=UTF-8''encoded or filename="name"
												const mStar = cd.match(/filename\*=UTF-8''([^;\n\r]+)/i);
												const mBasic = cd.match(/filename="?([^";]+)"?/i);
												if (mStar && mStar[1]) filename = decodeURIComponent(mStar[1]);
												else if (mBasic && mBasic[1]) filename = mBasic[1];
											}
										} catch {
											/* ignore and fallback */
										}
										const a = document.createElement('a');
										a.href = url;
										a.download = filename;
										document.body.appendChild(a);
										a.click();
										a.remove();
										URL.revokeObjectURL(url);
									} catch (err) {
										console.error(err);
										toast({ message: 'Terjadi kesalahan saat mengekspor.', type: 'error' });
									}
								}}
							>
								<Icon name="export" />
								Ekspor Mapel
							</button>
						</li>
						<li>
							<form
								method="POST"
								action="?/tambah_pks"
								class="w-full"
								use:enhance={() => {
									toast({ message: 'Menambahkan mata pelajaran PKS...', type: 'info' });
									return async ({ result }) => {
										if (result.type === 'success') {
											await Promise.all([
												invalidate('app:mapel'),
												invalidate('app:asesmen-formatif')
											]);
											const data = result.data as { success?: string } | undefined;
											toast({
												message: data?.success || 'Mata pelajaran PKS berhasil ditambahkan.',
												type: 'success'
											});
										} else if (result.type === 'failure') {
											const data = result.data as { fail?: string } | undefined;
											toast({
												message: data?.fail || 'Gagal menambahkan mata pelajaran PKS.',
												type: 'error'
											});
										}
									};
								}}
							>
								<button
									type="submit"
									class={`flex w-full items-center gap-2 ${!canManageMapel || !hasKelasAktif ? 'pointer-events-none opacity-50' : ''}`}
									disabled={!canManageMapel || !hasKelasAktif}
									aria-disabled={!canManageMapel || !hasKelasAktif}
								>
									<Icon name="plus" />
									<span>Tambah PKS</span>
								</button>
							</form>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</div>

	{#if !hasKelasAktif}
		<div
			class="alert border-warning/60 bg-warning/10 text-warning-content mt-6 border border-dashed"
		>
			<Icon name="info" />
			<span>Pilih kelas aktif agar daftar mata pelajaran dapat ditampilkan.</span>
		</div>
	{/if}

	{#if hasKelasAktif && totalMapel === 0}
		<div class="alert border-info/60 bg-info/10 mt-6 border border-dashed">
			<Icon name="info" />
			<span
				>Belum ada data mata pelajaran untuk kelas ini. Gunakan tombol &ldquo;Tambah Mata
				Pelajaran&rdquo; di atas.</span
			>
		</div>
	{/if}

	<div
		class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none"
	>
		<table class="border-base-200 table border dark:border-none">
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-left font-bold">
					{#if editUrutan}
						<th style="width: 48px;" title="Urutkan">
							<Icon name="menu-drawer" />
						</th>
					{/if}
					<th style="width: 60px;">No</th>
					<th style="min-width: 240px;">Mata Pelajaran</th>
					<th style="min-width: 150px;">Jenis Mapel</th>
					<th style="width: 120px;">Kode</th>
					<th style="width: 100px;">KKM</th>
					<th style="width: 180px;">Tujuan Pembelajaran</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#each barisTampil as mapel, index (mapel.id)}
					<tr
						draggable={editUrutan}
						class={editUrutan
							? `${dragIndex === index ? 'opacity-40' : 'cursor-grab'} active:cursor-grabbing`
							: undefined}
						ondragstart={(e) => handleDragStart(index, e)}
						ondragover={handleDragOver}
						ondragend={() => (dragIndex = null)}
						ondrop={() => handleDrop(index)}
					>
						{#if editUrutan}
							<td class="text-center">
								<span
									class="inline-flex cursor-grab items-center justify-center"
									title="Tarik untuk mengurutkan"
								>
									<Icon name="chevron-up-down" class="text-sm" />
								</span>
							</td>
						{/if}
						<td>{index + 1}</td>
						<td class="font-medium">{mapel.nama}</td>
						<td class="whitespace-nowrap">{jenisMapel[mapel.jenis ?? 'wajib']}</td>
						<td class="font-mono text-sm"
							>{mapel.kode ?? (mapel.nama === agamaParentName ? 'PAPB' : '—')}</td
						>
						<td>{formatKkm(mapel.kkm)}</td>
						<td>
							<div class="indicator">
								<span
									class="indicator-item indicator-end badge badge-xs"
									class:badge-success={mapel.tpCount > 0}
									class:badge-error={mapel.tpCount === 0}
									aria-label={`Status tujuan pembelajaran: ${
										mapel.tpCount > 0 ? 'sudah terisi' : 'belum terisi'
									}`}
									role="status"
								></span>
								{#if canManageMapel}
									<a
										class="btn btn-sm btn-soft shadow-none"
										href={`/intrakurikuler/${mapel.editTpMapelId ?? mapel.id}/tp-rl`}
									>
										<Icon name="edit" />
										Edit TP
									</a>
								{:else}
									<button
										type="button"
										class="btn btn-sm btn-disabled shadow-none"
										disabled
										title="Anda tidak memiliki izin untuk mengedit"
									>
										<Icon name="edit" />
										Edit TP
									</button>
								{/if}
							</div>
						</td>
						<td>
							<div class="flex flex-row">
								{#if canManageMapel}
									<a
										class="btn btn-sm btn-soft rounded-r-none shadow-none"
										href={`/intrakurikuler/${mapel.id}/edit`}
										title="Edit data mata pelajaran"
										use:modalRoute={'edit-mapel'}
									>
										<Icon name="edit" />
									</a>
									<a
										class="btn btn-sm btn-error btn-soft rounded-l-none shadow-none"
										href={`/intrakurikuler/${mapel.id}/delete`}
										title="Hapus mata pelajaran"
										use:modalRoute={'delete-mapel'}
										onclick={(event) => handleDeleteClick(event, mapel)}
									>
										<Icon name="del" />
									</a>
								{:else}
									<button
										type="button"
										class="btn btn-sm btn-disabled rounded-r-none shadow-none"
										disabled
										title="Anda tidak memiliki izin untuk mengedit"
									>
										<Icon name="edit" />
									</button>
									<button
										type="button"
										class="btn btn-sm btn-disabled rounded-l-none shadow-none"
										disabled
										title="Anda tidak memiliki izin untuk menghapus"
									>
										<Icon name="del" />
									</button>
								{/if}
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td class="py-6 text-center italic opacity-60" colspan={editUrutan ? 8 : 7}>
							{emptyStateMessage}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<IntrakurikulerModals />

<style>
	/* Baris drag-and-drop: background di level sel agar ghost drag punya bg + sudut
	   membulat (radius di <tr> tidak bekerja pada border-collapse: collapse). */
	tbody tr[draggable='true'] > td {
		background-color: var(--color-base-100);
		border-radius: 0;
	}
	tbody tr[draggable='true'] > td:first-child {
		border-start-start-radius: 0.5rem;
		border-end-start-radius: 0.5rem;
	}
	tbody tr[draggable='true'] > td:last-child {
		border-start-end-radius: 0.5rem;
		border-end-end-radius: 0.5rem;
	}
</style>
