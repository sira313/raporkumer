<script lang="ts">
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';

	let { onsuccess }: { onsuccess?: () => void } = $props();

	// Password visibility toggles
	let showCurrentPassword = $state(false);
	let showNewPassword = $state(false);
	let showConfirmPassword = $state(false);

	function handlePasswordSuccess({ form }: { form: HTMLFormElement }) {
		form.reset();
		onsuccess?.();
	}
</script>

<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md" id="ganti-password">
	<div class="space-y-4">
		<header class="space-y-2">
			<h2 class="text-xl font-semibold">Ganti Kata Sandi</h2>
			<p class="text-base-content/70 text-sm">
				Perbarui kata sandi untuk menjaga keamanan akses aplikasi.
			</p>
		</header>

		<FormEnhance action="?/change-password" onsuccess={handlePasswordSuccess}>
			{#snippet children({ submitting, invalid })}
				<div>
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Kata sandi saat ini</legend>
						<label
							class="input bg-base-200 dark:bg-base-300 validator w-full dark:border-none"
						>
							<span class="pl-2"><Icon name="lock" /></span>
							<input
								type={showCurrentPassword ? 'text' : 'password'}
								id="currentPassword"
								name="currentPassword"
								required
								autocomplete="current-password"
								placeholder="Masukkan kata sandi lama"
							/>
							<button
								type="button"
								class="cursor-pointer pr-2"
								onclick={() => (showCurrentPassword = !showCurrentPassword)}
								aria-label="Toggle password visibility"
							>
								<Icon name={showCurrentPassword ? 'eye-off' : 'eye'} />
							</button>
						</label>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Kata sandi baru</legend>
						<label
							class="input bg-base-200 dark:bg-base-300 validator w-full dark:border-none"
						>
							<span class="pl-2"><Icon name="lock" /></span>
							<input
								type={showNewPassword ? 'text' : 'password'}
								id="newPassword"
								name="newPassword"
								required
								minlength={8}
								autocomplete="new-password"
								placeholder="Minimal 8 karakter"
							/>
							<button
								type="button"
								class="cursor-pointer pr-2"
								onclick={() => (showNewPassword = !showNewPassword)}
								aria-label="Toggle password visibility"
							>
								<Icon name={showNewPassword ? 'eye-off' : 'eye'} />
							</button>
						</label>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Konfirmasi kata sandi baru</legend>
						<label
							class="input bg-base-200 dark:bg-base-300 validator w-full dark:border-none"
						>
							<span class="pl-2"><Icon name="lock" /></span>
							<input
								type={showConfirmPassword ? 'text' : 'password'}
								id="confirmPassword"
								name="confirmPassword"
								required
								minlength={8}
								autocomplete="new-password"
								placeholder="Ulangi kata sandi baru"
							/>
							<button
								type="button"
								class="cursor-pointer pr-2"
								onclick={() => (showConfirmPassword = !showConfirmPassword)}
								aria-label="Toggle password visibility"
							>
								<Icon name={showConfirmPassword ? 'eye-off' : 'eye'} />
							</button>
						</label>
					</fieldset>

					<p class="text-base-content/70 text-xs">
						Gunakan kombinasi huruf dan angka untuk keamanan maksimal.
					</p>

					<div class="mt-6 flex justify-end">
						<button
							class="btn btn-primary shadow-none"
							type="submit"
							disabled={submitting || invalid}
						>
							<Icon name="save" />
							{submitting ? 'Menyimpan…' : 'Simpan kata sandi'}
						</button>
					</div>
				</div>
			{/snippet}
		</FormEnhance>
	</div>
</section>
