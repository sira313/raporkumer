<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
</script>

<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
	<div class="space-y-6">
		<header class="space-y-2">
			<h1 class="text-2xl font-bold">Pengaturan Aplikasi</h1>
			<p class="text-base-content/70 text-sm">
				Pengaturan tambahan untuk lingkungan server lokal Anda.
			</p>
		</header>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Atur port aplikasi</legend>
			<input
				type="text"
				class="input bg-base-200 join-item w-full dark:border-none"
				placeholder="Contoh: 5173"
			/>
			<p class="text-base-content/70 mt-1 text-xs">Kosongkan bila tidak diperlukan</p>
		</fieldset>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Alamat aplikasi</legend>
			<div class="join">
				<input
					type="text"
					disabled
					class="input bg-base-200 join-item w-full dark:border-none"
					placeholder="192.168.8.100:5173"
					value="192.168.8.100:5173"
				/>
				<button class="btn join-item shadow-none" type="button">Copy</button>
			</div>
			<p class="text-base-content/70 mt-1 text-xs">
				Buka alamat ini pada perangkat lain di jaringan lokal yang sama.
			</p>
		</fieldset>

		<div class="flex justify-end">
			<button class="btn btn-primary shadow-none" type="button">
				<Icon name="save" />
				Simpan
			</button>
		</div>
	</div>
</section>
