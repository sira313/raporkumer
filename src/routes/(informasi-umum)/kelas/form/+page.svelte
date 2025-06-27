<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/icon.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import db from '$lib/data/db';
	import { flatten, populateForm, unflatten } from '$lib/utils';
	import { onMount } from 'svelte';

	let form: HTMLFormElement;
	let kelas_id = $state<number>();
	let saving = $state(false);
	let loading = $state(false);

	async function save(e: FormSubmitEvent) {
		e.preventDefault();
		try {
			saving = true;
			const formData = new FormData(e.currentTarget);
			const kelas = unflatten<Kelas>(Object.fromEntries(formData.entries()));
			const result = kelas_id ? await db.kelas.update(kelas_id, kelas) : await db.kelas.add(kelas);
			kelas_id = result;
			toast('Data kelas berhasil disimpan', 'success');
			await goto('/kelas');
		} catch (error) {
			console.error(error);
			toast('Gagal simpan data kelas', 'error');
		} finally {
			saving = false;
		}
	}

	async function load() {
		loading = true;
		kelas_id = Number(page.url.searchParams.get('id'));
		if (!kelas_id) {
			loading = false;
			return;
		}
		try {
			const kelas = await db.kelas.get(kelas_id);
			if (!kelas) {
				toast(`Data kelas dengan id "${kelas_id}" tidak ditemukan`, 'warning');
				return;
			}
			populateForm(form, flatten(kelas));
		} catch (error) {
			console.error(error);
			toast('Terjadi kesalahan saat memuat data kelas', 'error');
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		load();
	});
</script>

<form bind:this={form} onsubmit={save}>
	<fieldset
		class="fieldset bg-base-100 mx-auto w-full max-w-4xl rounded-lg border border-none p-4 shadow-md"
	>
		<legend class="fieldset-legend">
			Formulir Isian Data Kelas
			{#if loading}
				<em class="text-xs opacity-50">Loading...</em>
			{/if}
		</legend>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Nama Kelas -->
			<div>
				<legend class="fieldset-legend">Nama Kelas</legend>
				<input
					required
					type="text"
					class="input validator bg-base-200 w-full dark:border-none"
					placeholder="Contoh: VI (Kelas 6)"
					name="nama"
				/>
			</div>

			<!-- Fase -->
			<div>
				<legend class="fieldset-legend">Fase</legend>
				<input
					required
					type="text"
					class="input validator bg-base-200 w-full dark:border-none"
					placeholder="Contoh: Fase C (Kelas 6)"
					name="fase"
				/>
			</div>

			<!-- Semester -->
			<div>
				<legend class="fieldset-legend">Semester</legend>
				<select
					class="select bg-base-200 validator w-full border dark:border-none"
					name="semester"
					required
				>
					<option value="" disabled selected>Pilih Semester</option>
					<option>Ganjil</option>
					<option>Genap</option>
				</select>
			</div>

			<!-- Tahun Ajaran -->
			<div>
				<legend class="fieldset-legend">Tahun Ajaran</legend>
				<input
					required
					type="text"
					class="input validator bg-base-200 w-full dark:border-none"
					placeholder="Contoh: 2025/2026"
					name="tahunAjaran"
				/>
			</div>

			<!-- Wali Kelas -->
			<div>
				<legend class="fieldset-legend">Wali Kelas</legend>
				<input
					required
					type="text"
					class="input validator bg-base-200 w-full dark:border-none"
					placeholder="Contoh: Damian Wayne, Bat"
					name="waliKelas.nama"
				/>
			</div>

			<!-- NIP Wali Kelas -->
			<div>
				<legend class="fieldset-legend">NIP Wali Kelas</legend>
				<input
					required
					type="text"
					class="input validator bg-base-200 w-full dark:border-none"
					placeholder="Contoh: 19940505 201803 1 008"
					name="waliKelas.nip"
				/>
			</div>
		</div>
		<button
			class="btn mt-6 ml-auto shadow-none {kelas_id ? 'btn-secondary' : 'btn-primary'}"
			disabled={saving || loading}
		>
			{#if saving}
				<div class="loading loading-spinner"></div>
			{:else if kelas_id}
				<Icon name="edit" />
				Update
			{:else}
				<Icon name="plus" />
				Tambah
			{/if}
		</button>
	</fieldset>
</form>
