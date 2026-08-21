<script lang="ts">
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';

	let showAdminPassword = $state(false);

	function handleAdminUsernameSuccess({ form }: { form: HTMLFormElement }) {
		form.reset();
	}
</script>

<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
	<!-- Change Admin Username -->
	<FormEnhance action="?/change-admin-username" onsuccess={handleAdminUsernameSuccess}>
		{#snippet children({ submitting, invalid })}
			<header class="mb-4 space-y-2">
				<h2 class="text-xl font-semibold">Ganti Nama Pengguna</h2>
				<p class="text-base-content/70 text-sm">
					Perbarui nama pengguna untuk menjaga keamanan akses aplikasi.
				</p>
			</header>
			<div class="flex flex-col gap-2">
				<div class="w-full">
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Nama Pengguna</legend>
						<div class="form-control">
							<label
								class="input bg-base-200 dark:bg-base-300 validator w-full border-base-300 dark:border-none"
							>
								<span class="pl-2"><Icon name="users" /></span>
								<input
									type="text"
									id="adminUsername"
									name="adminUsername"
									required
									pattern="^[A-Za-z0-9._-]&#123;3,&#125;$"
									title="Gunakan huruf, angka, titik, underscore atau minus. Minimal 3 karakter."
									placeholder="contoh: laila2"
								/>
							</label>
							<p class="text-base-content/70 mt-1 text-xs">Masukkan nama pengguna baru.</p>
						</div>
					</fieldset>
				</div>

				<div class="w-full">
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Konfirmasi Dengan Kata Sandi</legend>
						<div class="form-control">
							<label
								class="input bg-base-200 dark:bg-base-300 validator w-full border-base-300 dark:border-none"
							>
								<span class="pl-2"><Icon name="lock" /></span>
								<input
									type={showAdminPassword ? 'text' : 'password'}
									id="adminPassword"
									name="adminPassword"
									required
									placeholder="Masukkan kata sandi"
									autocomplete="current-password"
								/>
								<button
									type="button"
									class="cursor-pointer pr-2"
									onclick={() => (showAdminPassword = !showAdminPassword)}
									aria-label="Toggle password visibility"
								>
									<Icon name={showAdminPassword ? 'eye-off' : 'eye'} />
								</button>
							</label>
							<p class="text-base-content/70 mt-1 text-xs">
								Masukkan kata sandi saat ini untuk konfirmasi perubahan nama pengguna.
							</p>
						</div>
					</fieldset>
				</div>
			</div>

			<div class="mt-6 flex justify-end">
				<button class="btn btn-primary shadow-none" type="submit" disabled={submitting || invalid}>
					<Icon name="save" />
					{submitting ? 'Menyimpan…' : 'Terapkan'}
				</button>
			</div>
		{/snippet}
	</FormEnhance>
</section>
