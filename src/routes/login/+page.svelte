<script lang="ts">
	import FormEnhance from '$lib/components/form-enhance.svelte';
</script>

<section class="card w-full max-w-md bg-base-100 shadow-xl">
	<div class="card-body space-y-6">
		<header class="space-y-2 text-center">
			<h1 class="text-2xl font-bold">Masuk ke Rapkumer</h1>
			<p class="text-base-content/70 text-sm">
				Masukkan kredensial Anda untuk mulai mengelola data sekolah.
			</p>
		</header>

		<FormEnhance action="?/login">
			{#snippet children({ submitting, invalid })}
				<div class="space-y-4">
					<div class="form-control">
						<label class="label" for="username">
							<span class="label-text">Nama Pengguna</span>
						</label>
						<input
							type="text"
							id="username"
							name="username"
							required
							autocomplete="username"
							placeholder="Contoh: Admin"
							class="input input-bordered w-full"
						/>
					</div>

					<div class="form-control">
						<label class="label" for="password">
							<span class="label-text">Kata Sandi</span>
						</label>
						<input
							type="password"
							id="password"
							name="password"
							required
							autocomplete="current-password"
							placeholder="••••••••"
							class="input input-bordered w-full"
						/>
					</div>

					<p class="text-base-content/60 text-xs">
						Akun bawaan: <span class="font-semibold">Admin</span> / <span class="font-semibold">Admin123</span>
					</p>

					<button class="btn btn-primary w-full" type="submit" disabled={submitting || invalid}>
						{submitting ? 'Masuk…' : 'Masuk'}
					</button>
				</div>
			{/snippet}
		</FormEnhance>
	</div>
</section>
