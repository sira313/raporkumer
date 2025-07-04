<script lang="ts">
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';

	let { data } = $props();
</script>

<FormEnhance action="?/save" init={data.kelas}>
	{#snippet children({ submitting })}
		<fieldset
			class="fieldset bg-base-100 mx-auto w-full max-w-4xl rounded-lg border border-none p-4 shadow-md"
		>
			<legend class="fieldset-legend"> Formulir Isian Data Kelas </legend>
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
				class="btn mt-6 ml-auto shadow-none {data.kelas?.id ? 'btn-secondary' : 'btn-primary'}"
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
		</fieldset>
	{/snippet}
</FormEnhance>
