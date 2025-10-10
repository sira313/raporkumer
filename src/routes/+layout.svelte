<script lang="ts">
	import { page } from '$app/state';
	import GlobalModal from '$lib/components/global-modal.svelte';
	import Icon from '$lib/components/icon.svelte';
	import Menu from '$lib/components/menu.svelte';
	import Navbar from '$lib/components/navbar.svelte';
	import Toast, { toast } from '$lib/components/toast.svelte';
	import Task from '$lib/components/tasks.svelte';

	import '../app.css';

	let { data, children } = $props();

	const appName = 'Rapkumer';
	let stoppingServer = $state(false);

	async function stopServer() {
		if (stoppingServer) return;
		stoppingServer = true;

		const showSuccess = () =>
			toast({
				message: 'Server dihentikan. Tutup jendela Rapkumer ini lalu jalankan ulang bila diperlukan.',
				type: 'info',
				persist: true
			});

		try {
			const response = await fetch('/api/runtime/stop', { method: 'POST', keepalive: true });
			if (response.ok) {
				showSuccess();
			} else {
				const details = await response.text().catch(() => '');
				console.error('Gagal menghentikan server', response.status, details);
				toast({ message: 'Gagal menghentikan server. Coba lagi.', type: 'error' });
			}
		} catch (error) {
			console.warn('Permintaan stop server berakhir sebelum respons diterima. Diasumsikan berhasil.', error);
			showSuccess();
		} finally {
			stoppingServer = false;
		}
	}
</script>

<svelte:head>
	<script>
		(function () {
			try {
				var stored = localStorage.getItem('dark-mode');
				var theme;
				if (stored === 'dark' || stored === 'light') {
					theme = stored;
				} else if (stored === 'true' || stored === 'false') {
					theme = stored === 'true' ? 'dark' : 'light';
				} else if (stored) {
					try {
						var parsed = JSON.parse(stored);
						theme = parsed ? 'dark' : 'light';
					} catch (err) {
						theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
					}
				} else {
					theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
				}
				document.documentElement.setAttribute('data-theme', theme);
			} catch (e) {
				console.error('failed initialize dark mode:', e);
			}
		})();
	</script>
	<title>{appName}{page.data.meta.title ? ' - ' + page.data.meta.title : ''}</title>
</svelte:head>

<main class="drawer lg:drawer-open">
	<input id="my-drawer-2" type="checkbox" class="drawer-toggle" />
	<div class="drawer-content flex min-h-screen flex-col">
		<Navbar {stopServer} {stoppingServer} />

		<div
			class="bg-base-300 dark:bg-base-200 dark:border-base-200 border-base-300 flex flex-1 flex-col border lg:mr-2 lg:mb-2 lg:rounded-xl"
		>
			<div
				class="max-h-[calc(100vh-4.2rem)] min-h-[calc(100vh-4.2rem)] max-w-none overflow-y-auto md:max-h-[calc(100vh-4.6rem)] md:min-h-[calc(100vh-4.6rem)] print:overflow-visible"
			>
				<div class="m-4 flex flex-row lg:m-6 xl:gap-5">
					<div class="w-full max-w-5xl min-w-0 flex-1">
						{@render children()}
					</div>
					<div class="sticky top-6 self-start">
						<Task variant="sidebar" />
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="drawer-side">
		<label for="my-drawer-2" aria-label="close sidebar" class="drawer-overlay"></label>
		<ul class="menu bg-base-100 text-base-content min-h-full w-80 p-4">
			<div class="mt-[4rem] flex items-center gap-2 pb-4 lg:mt-1">
				{#if data.meta?.logoUrl}
					<img class="h-8 rounded" src={data.meta.logoUrl} alt="Brand logo" />
				{/if}
				<a href="/"><h2 class="mb-2 text-xl font-bold">Dashboard</h2></a>
			</div>

			<Menu />

			<div class="mt-4 flex flex-col gap-3">
				<a href="/pengaturan" class="flex items-center gap-2">
					<Icon name="gear" />
					<h2 class="font-bold">Pengaturan</h2>
				</a>
				<a href="/tentang" class="flex items-center gap-2">
					<Icon name="info" />
					<h2 class="font-bold">Tentang Aplikasi</h2>
				</a>
			</div>
		</ul>
	</div>
</main>

<Toast />
<GlobalModal />
