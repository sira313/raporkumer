<script lang="ts">
	import FormEnhance from '$lib/components/form-enhance.svelte';
</script>

<section class="card bg-base-100 w-full max-w-md shadow-xl">
	<div class="card-body space-y-6">
		<header class="space-y-2 text-center mb-2">
			<h1 class="text-2xl font-bold">Masuk ke Rapkumer</h1>
			<p class="text-base-content/70 text-sm">
				Masukkan kredensial Anda untuk mulai mengelola data sekolah.
			</p>
		</header>

		<FormEnhance action="?/login">
			{#snippet children({ submitting, invalid })}
					<div class="fieldset">
						<label class="fieldset-legend" for="username">
							Nama Pengguna
						</label>
						<input
							type="text"
							id="username"
							name="username"
							required
							autocomplete="username"
							placeholder="Contoh: Admin"
							class="input input-bordered w-full dark:border-none dark:bg-base-200"
						/>
					</div>

					<div class="fieldset">
						<label class="fieldset-legend" for="password">
							Kata Sandi
						</label>
						<input
							type="password"
							id="password"
							name="password"
							required
							autocomplete="current-password"
							placeholder="••••••••"
							class="input input-bordered w-full dark:border-none dark:bg-base-200"
						/>
					</div>

					<button class="btn btn-primary w-full mt-6" type="submit" disabled={submitting || invalid}>
						{submitting ? 'Masuk…' : 'Masuk'}
					</button>
			{/snippet}
		</FormEnhance>
	</div>
</section>
