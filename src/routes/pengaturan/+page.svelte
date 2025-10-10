<script lang="ts">
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';

	function handlePasswordSuccess({ form }: { form: HTMLFormElement }) {
		form.reset();
	}
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
	</div>
</section>

<section class="card bg-base-100 mt-5 rounded-lg border border-none p-6 shadow-md">
	<div class="space-y-6">
		<div role="alert" class="alert alert-warning">
			<Icon name="alert" />
			<span>Simpan sandi dengan aman. Tidak ada garansi lupa sandi!</span>
		</div>
		<header class="space-y-2">
			<h2 class="text-xl font-semibold">Keamanan Akun</h2>
			<p class="text-base-content/70 text-sm">
				Perbarui kata sandi admin untuk menjaga keamanan akses aplikasi.
			</p>
		</header>

		<FormEnhance action="?/change-password" onsuccess={handlePasswordSuccess}>
			{#snippet children({ submitting, invalid })}
				<div class="space-y-4">
					<div class="form-control">
						<label class="label" for="currentPassword">
							<span class="label-text">Kata sandi saat ini</span>
						</label>
						<input
							type="password"
							id="currentPassword"
							name="currentPassword"
							required
							autocomplete="current-password"
							class="input input-bordered w-full dark:border-none dark:bg-base-200"
							placeholder="Masukkan kata sandi lama"
						/>
					</div>

					<div class="form-control">
						<label class="label" for="newPassword">
							<span class="label-text">Kata sandi baru</span>
						</label>
						<input
							type="password"
							id="newPassword"
							name="newPassword"
							required
							minlength={8}
							autocomplete="new-password"
							class="input input-bordered w-full dark:border-none dark:bg-base-200"
							placeholder="Minimal 8 karakter"
						/>
					</div>

					<div class="form-control">
						<label class="label" for="confirmPassword">
							<span class="label-text">Konfirmasi kata sandi baru</span>
						</label>
						<input
							type="password"
							id="confirmPassword"
							name="confirmPassword"
							required
							minlength={8}
							autocomplete="new-password"
							class="input input-bordered w-full dark:border-none dark:bg-base-200"
							placeholder="Ulangi kata sandi baru"
						/>
					</div>

					<p class="text-base-content/70 text-xs">
						Gunakan kombinasi huruf dan angka untuk keamanan maksimal.
					</p>

					<button class="btn btn-primary" type="submit" disabled={submitting || invalid}>
						<Icon name="save" />
						{submitting ? 'Menyimpan…' : 'Simpan kata sandi'}
					</button>
				</div>
			{/snippet}
		</FormEnhance>
	</div>
</section>
