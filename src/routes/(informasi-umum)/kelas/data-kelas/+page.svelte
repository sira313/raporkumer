<script lang="ts">
	import { toast } from '$lib/components/toast/state.svelte';
	import db from '$lib/data/db';
	import { onMount } from 'svelte';

	let loading = $state(false);
	let daftarKelas = $state<Kelas[]>([]);

	async function load() {
		loading = true;
		try {
			const result = await db.kelas.toArray();
			daftarKelas = result;
		} catch (error) {
			console.error(error);
			toast('Gagal memuat data kelas', 'error');
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		load();
	});
</script>

{#if loading}
	<em class="opacity-50">Loading...</em>
{/if}

{#each daftarKelas as kelas}
	<fieldset class="fieldset bg-base-100 mx-auto w-full max-w-3xl rounded-lg p-4 shadow-md">
		<legend class="fieldset-legend">Data Kelas</legend>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<div class="card bg-base-200">
				<div class="card-body p-4">
					<h2 class="card-title text-base-content/70 text-sm">Nama Kelas</h2>
					<p class="text-lg font-semibold">{kelas.nama}</p>
				</div>
			</div>
			<div class="card bg-base-200">
				<div class="card-body p-4">
					<h2 class="card-title text-base-content/70 text-sm">Fase</h2>
					<p class="text-lg font-semibold">{kelas.fase}</p>
				</div>
			</div>
			<div class="card bg-base-200">
				<div class="card-body p-4">
					<h2 class="card-title text-base-content/70 text-sm">Semester</h2>
					<p class="text-lg font-semibold">{kelas.semester}</p>
				</div>
			</div>
			<div class="card bg-base-200">
				<div class="card-body p-4">
					<h2 class="card-title text-base-content/70 text-sm">Tahun Ajaran</h2>
					<p class="text-lg font-semibold">{kelas.tahunAjaran}</p>
				</div>
			</div>
			<div class="card bg-base-200 col-span-full lg:col-span-1">
				<div class="card-body p-4">
					<h2 class="card-title text-base-content/70 text-sm">Wali Kelas</h2>
					<p class="text-lg font-semibold">{kelas.waliKelas?.nama}</p>
					<p class="text-base-content/70 text-sm">NIP {kelas.waliKelas?.nip}</p>
				</div>
			</div>
		</div>

		<div class="mt-6 text-right">
			<a href="/kelas?id={kelas.id}" class="btn btn-primary shadow-md">Edit</a>
		</div>
	</fieldset>
{:else}
	<div>
		<p>Belum ada data kelas</p>
	</div>
{/each}
