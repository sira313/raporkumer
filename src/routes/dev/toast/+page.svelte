<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/icon.svelte';
	import { toast } from '$lib/components/toast.svelte';

	type ToastKind = 'info' | 'success' | 'warning' | 'error';

	const triggerToast = (type: ToastKind) => {
		const messageMap = {
			info: 'Ini contoh notifikasi informasi',
			success: 'Operasi berhasil dijalankan',
			warning: 'Periksa kembali data yang dimasukkan',
			error: 'Terjadi kesalahan sistem'
		} as const;
		toast({ message: messageMap[type], type, persist: type === 'error' });
	};

	onMount(() => {
		const w = window as typeof window & { __toast?: (message: string, type?: ToastKind) => void };
		w.__toast = (message: string, type: ToastKind = 'info') => toast({ message, type });
	});
</script>

<div class="grid gap-6">
	<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
		<div class="space-y-6">
			<header class="space-y-2">
				<h1 class="text-2xl font-bold">Simulasi Toast Notifikasi</h1>
				<p class="text-base-content/70 text-sm">
					Halaman percobaan untuk menampilkan variasi toast info, success, warning, dan error.
				</p>
			</header>

			<div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
				<button class="btn btn-info btn-soft shadow-none" type="button" onclick={() => triggerToast('info')}>
					<Icon name="info" />
					Info
				</button>
				<button class="btn btn-success btn-soft shadow-none" type="button" onclick={() => triggerToast('success')}>
					<Icon name="success" />
					Success
				</button>
				<button class="btn btn-warning btn-soft shadow-none" type="button" onclick={() => triggerToast('warning')}>
					<Icon name="warning" />
					Warning
				</button>
				<button class="btn btn-error btn-soft shadow-none" type="button" onclick={() => triggerToast('error')}>
					<Icon name="error" />
					Error
				</button>
			</div>
		</div>
	</section>

	<section class="card bg-base-100 rounded-lg border border-none p-6 shadow">
		<h2 class="text-lg font-semibold">Trigger melalui console</h2>
		<p class="text-sm text-base-content/70">
			Buka DevTools &rarr; Console, jalankan perintah seperti <code>window.__toast('Pesan','success')</code> untuk
			menguji langsung. Halaman ini menyiapkan helper yang sama.
		</p>
	</section>
</div>
