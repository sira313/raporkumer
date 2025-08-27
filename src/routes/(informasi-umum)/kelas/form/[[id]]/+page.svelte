<script lang="ts">
	import { goto } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';

	let { data } = $props();
</script>

<FormEnhance action="?/save" init={data.kelas} onsuccess={() => goto(`/kelas`)}>
	{#snippet children({ submitting })}
		<div class="card bg-base-100 mx-auto rounded-lg p-4 shadow-md">
			<h2 class="mb-4 text-xl font-bold">Formulir Isian Data Kelas</h2>
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
					<!-- <legend class="fieldset-legend">Fase</legend>
					<input
						required
						type="text"
						class="input validator bg-base-200 w-full dark:border-none"
						placeholder="Contoh: Fase C (Kelas 6)"
						name="fase"
					/> -->
					<legend class="fieldset-legend">Tingkat pendidikan</legend>
					<select class="select w-full bg-base-200 dark:border-none">
					  <option disabled selected>Pilih tingkat pendidikan</option>
						<!-- Penambahan logika jika: -->
						<!-- Kelas 1 dan kelas 2 maka Fase A  -->
					  <option>Kelas 1</option>
					  <option>Kelas 2</option>
						<!-- Kelas 3 dan kelas 4 maka Fase B -->
					  <option>Kelas 3</option>
						<option>Kelas 4</option>
						<!-- Kelas 5 dan kelas 6 maka Fase C -->
					  <option>Kelas 5</option>
					  <option>Kelas 6</option>
						<!-- Kelas 7, Kelas 8 dan Kelas 9 maka Fase D -->
						<option>Kelas 7</option>
					  <option>Kelas 8</option>
					  <option>Kelas 9</option>
						<!-- Kelas 10 maka Fase E -->
						<option>Kelas 10</option>
						<!-- Kelas 11 maka Fase F -->
					  <option>Kelas 11</option>
						<!-- Kelas 12 maka Fase G -->
					  <option>Kelas 12</option>
					</select>
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
			<div class="mt-6 flex justify-end gap-2">
				<a class="btn shadow-none" href="/kelas" aria-label="kembali">
					<Icon name="left" />
					Kembali
				</a>
				<button
					class="btn shadow-none {data.kelas?.id ? 'btn-secondary' : 'btn-primary'}"
					disabled={submitting}
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
