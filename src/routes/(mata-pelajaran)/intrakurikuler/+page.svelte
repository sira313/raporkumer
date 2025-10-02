<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/icon.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import {
		agamaMapelLabelByName,
		agamaMapelNames,
		agamaParentName
	} from '$lib/statics';
	import { modalRoute } from '$lib/utils';
	import IntrakurikulerModals from '$lib/components/intrakurikuler/modals.svelte';

	let { data }: { data: { kelasId: number | null; mapel: Record<string, MataPelajaran[]> } } = $props();

	const emptyStateMessage = 'Belum ada data mata pelajaran';
	const agamaMapelNameSet = new Set<string>(agamaMapelNames);

	const kelasAktifLabel = $derived.by(() => {
		const kelas = page.data.kelasAktif ?? null;
		if (!kelas) return null;
		return kelas.fase ? `${kelas.nama} - ${kelas.fase}` : kelas.nama;
	});

	const hasKelasAktif = $derived.by(() => !!page.data.kelasAktif);
	const totalMapel = $derived.by(
		() =>
			data.mapel.daftarWajib.length +
			data.mapel.daftarPilihan.length +
			data.mapel.daftarMulok.length
	);


	function formatKkm(kkm: number | null | undefined) {
		return typeof kkm === 'number' && Number.isFinite(kkm) ? kkm : '—';
	}

	function handleDeleteClick(event: MouseEvent, mapel: Pick<MataPelajaran, 'nama'>) {
		if (event.defaultPrevented) return;
		if (event.shiftKey || event.metaKey || event.ctrlKey || event.button === 1) return;
		if (!agamaMapelNameSet.has(mapel.nama)) return;

		const label = agamaMapelLabelByName[mapel.nama];
		const message =
			mapel.nama === agamaParentName
				? `Menghapus "<b>${mapel.nama}</b>" akan menghapus seluruh varian Pendidikan Agama dan Budi Pekerti pada kelas ini.`
				: `Menghapus "<b>${mapel.nama}</b>" akan menghapus varian Pendidikan Agama <b>${label}</b> beserta seluruh penilaian terkait.`;

		toast({ message, type: 'warning', persist: true });
	}
</script>

<div class="card bg-base-100 rounded-box border border-none p-4 shadow-md">
	<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<h2 class="text-xl font-bold">Daftar Mata Pelajaran Intrakurikuler</h2>
			{#if kelasAktifLabel}
				<p class="text-sm text-base-content/70">Kelas aktif: {kelasAktifLabel}</p>
			{:else}
				<p class="text-sm text-base-content/60">
					Pilih kelas di navbar untuk melihat mata pelajaran intrakurikuler.
				</p>
			{/if}
		</div>
		<a
			class="btn shadow-none"
			href="/intrakurikuler/form"
			title="Tambah mata pelajaran"
			use:modalRoute={'add-mapel'}
		>
			<Icon name="plus" />
			Tambah Mata Pelajaran
		</a>
	</div>

	<div class="stats stats-horizontal mt-4 w-full border border-base-200 bg-base-100 dark:bg-base-200 text-base-content shadow-md dark:shadow-none">
		<div class="stat place-items-start">
			<div class="stat-title">Mapel Wajib</div>
			<div class="stat-value text-2xl">{data.mapel.daftarWajib.length}</div>
		</div>
		<div class="stat place-items-start">
			<div class="stat-title">Mapel Pilihan</div>
			<div class="stat-value text-2xl">{data.mapel.daftarPilihan.length}</div>
		</div>
		<div class="stat place-items-start">
			<div class="stat-title">Muatan Lokal</div>
			<div class="stat-value text-2xl">{data.mapel.daftarMulok.length}</div>
		</div>
		<div class="stat place-items-start">
			<div class="stat-title">Total Mapel</div>
			<div class="stat-value text-2xl">{totalMapel}</div>
		</div>
	</div>

	{#if !hasKelasAktif}
		<div class="alert mt-6 border border-dashed border-warning/60 bg-warning/10 text-warning-content">
			<Icon name="info" />
			<span>Pilih kelas aktif agar daftar mata pelajaran dapat ditampilkan.</span>
		</div>
	{/if}

	{#if hasKelasAktif && totalMapel === 0}
		<div class="alert mt-6 border border-dashed border-info/60 bg-info/10 text-info-content">
			<Icon name="info" />
			<span>Belum ada data mata pelajaran untuk kelas ini. Gunakan tombol &ldquo;Tambah Mata Pelajaran&rdquo; di atas.</span>
		</div>
	{/if}

	{#each [
		{ key: 'wajib', title: 'Mata Pelajaran Wajib', items: data.mapel.daftarWajib },
		{ key: 'pilihan', title: 'Mata Pelajaran Pilihan', items: data.mapel.daftarPilihan },
		{ key: 'mulok', title: 'Muatan Lokal', items: data.mapel.daftarMulok }
	] as section (section.key)}
		<fieldset class="fieldset mt-8">
			<legend class="fieldset-legend">{section.title}</legend>
			<div class="bg-base-100 dark:bg-base-200 overflow-x-auto rounded-md shadow-md dark:shadow-none">
				<table class="border-base-200 table border dark:border-none">
					<thead>
						<tr class="bg-base-200 dark:bg-base-300 text-left font-bold">
							<th style="width: 60px;">No</th>
							<th style="min-width: 280px;">Mata Pelajaran</th>
							<th style="width: 100px;">KKM</th>
							<th style="width: 180px;">Tujuan Pembelajaran</th>
							<th>Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each section.items as mapel, index (mapel.id)}
							<tr>
								<td>{index + 1}</td>
								<td class="font-medium">{mapel.nama}</td>
								<td>{formatKkm(mapel.kkm)}</td>
								<td>
									<a
										class="btn btn-sm btn-soft shadow-none"
										href={`/intrakurikuler/${mapel.id}/tp-rl`}
										title="Kelola tujuan &amp; ruang lingkup"
									>
										<Icon name="edit" />
										Edit TP
									</a>
								</td>
								<td>
									<div class="flex flex-row gap-2">
										<a
											class="btn btn-sm btn-soft shadow-none"
											href={`/intrakurikuler/${mapel.id}/edit`}
											title="Edit data mata pelajaran"
											use:modalRoute={'edit-mapel'}
										>
											<Icon name="edit" />
										</a>
										<a
											class="btn btn-sm btn-error btn-soft shadow-none"
											href={`/intrakurikuler/${mapel.id}/delete`}
											title="Hapus mata pelajaran"
											use:modalRoute={'delete-mapel'}
											onclick={(event) => handleDeleteClick(event, mapel)}
										>
											<Icon name="del" />
										</a>
									</div>
								</td>
							</tr>
						{:else}
							<tr>
								<td class="py-6 text-center italic opacity-60" colspan="5">{emptyStateMessage}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</fieldset>
	{/each}
</div>

<IntrakurikulerModals />
