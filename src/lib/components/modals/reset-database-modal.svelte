<script lang="ts">
	import { hideModal } from '$lib/components/global-modal.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { toast } from '$lib/components/toast.svelte';

	let submitting = $state(false);
	let showPassword = $state(false);
	let password = $state('');

	async function handleReset() {
		if (!password || submitting) return;

		submitting = true;
		try {
			const formData = new FormData();
			formData.append('password', password);

			const response = await fetch('/api/database/reset', { method: 'POST', body: formData });
			// The auth guard may answer with a redirect that resolves to an HTML
			// page; only treat an actual JSON API response as success.
			const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
			if (!response.ok || !isJson) {
				const err = isJson ? await response.json().catch(() => null) : null;
				throw new Error(err?.message ?? 'Gagal mereset database.');
			}

			hideModal();
			toast({
				message: 'Database berhasil direset. Mengalihkan ke halaman login…',
				type: 'success'
			});
			setTimeout(() => {
				window.location.href = '/login';
			}, 1400);
		} catch (e) {
			toast({
				message: e instanceof Error ? e.message : 'Gagal mereset database.',
				type: 'error'
			});
		} finally {
			submitting = false;
		}
	}
</script>

<form
	class="space-y-4"
	onsubmit={(event) => {
		event.preventDefault();
		handleReset();
	}}
>
	<div class="space-y-4">
		<p class="text-sm">
			Seluruh isi database akan <strong>dikosongkan</strong> — data sekolah, siswa, nilai, presensi, pengguna,
			dan pengaturan lainnya dihapus dan aplikasi kembali ke kondisi awal.
		</p>

		<div role="alert" class="alert alert-error alert-soft">
			<Icon name="warning" />
			<span
				>Tindakan ini tidak dapat dibatalkan. Pastikan Anda sudah melakukan Backup Data terlebih
				dahulu.</span
			>
		</div>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Konfirmasi kata sandi</legend>
			<div class="form-control">
				<label class="input bg-base-200 dark:bg-base-300 validator w-full dark:border-none">
					<span class="pl-2"><Icon name="lock" /></span>
					<input
						bind:value={password}
						type={showPassword ? 'text' : 'password'}
						name="password"
						required
						placeholder="Masukkan kata sandi saat ini"
						autocomplete="current-password"
						disabled={submitting}
					/>
					<button
						type="button"
						class="cursor-pointer pr-2"
						onclick={() => (showPassword = !showPassword)}
						aria-label="Toggle password visibility"
					>
						<Icon name={showPassword ? 'eye-off' : 'eye'} />
					</button>
				</label>
				<p class="text-base-content/70 mt-1 text-xs">
					Masukkan kata sandi akun Anda saat ini untuk mengonfirmasi reset.
				</p>
			</div>
		</fieldset>
	</div>

	<div class="flex justify-end gap-2 pt-2">
		<button type="button" class="btn btn-soft shadow-none" onclick={hideModal} disabled={submitting}
			>Batal</button
		>
		<button type="submit" class="btn btn-error shadow-none" disabled={submitting || !password}>
			{#if submitting}
				<span class="loading loading-spinner loading-sm"></span>
			{/if}
			{submitting ? 'Mereset…' : 'Reset'}
		</button>
	</div>
</form>
