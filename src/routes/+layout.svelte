<script lang="ts">
	import { page } from '$app/state';
	import Menu from '$lib/components/menu.svelte';
	import ModalDialog from '$lib/components/modal/modal-dialog.svelte';
	import Navbar from '$lib/components/navbar.svelte';
	import Toast from '$lib/components/toast/toast.svelte';
	import { appName, loadSekolah, pageMeta, setPageTitle } from '$lib/state.svelte';
	import { findTitleByPath } from '$lib/utils';
	import { onMount } from 'svelte';
	import '../app.css';

	let { children } = $props();

	$effect(() => {
		const title = findTitleByPath(page.url.pathname);
		if (title) setPageTitle(title);
	});

	onMount(() => {
		loadSekolah();
	});
</script>

<svelte:head>
	<script>
		(function () {
			try {
				var dark = localStorage.getItem('dark-mode');
				if (dark) dark = JSON.parse(dark);
				else dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
				document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
			} catch (e) {
				console.error('failed initialize dark mode:', e);
			}
		})();
	</script>
	<title>{appName}{pageMeta.title ? ' - ' + pageMeta.title : ''}</title>
</svelte:head>

<main class="drawer lg:drawer-open">
	<input id="my-drawer-2" type="checkbox" class="drawer-toggle" />
	<div class="drawer-content bg-base-300 dark:bg-base-200">
		<Navbar />

		<!-- Page content -->
		<div class="card-body">
			<div class="prose max-w-none">
				{@render children()}
			</div>
		</div>
	</div>
	<div class="drawer-side">
		<label for="my-drawer-2" aria-label="close sidebar" class="drawer-overlay"></label>
		<ul class="menu bg-base-100 text-base-content min-h-full w-80 p-4">
			<div class="mt-20 flex items-center gap-2 pb-4 pl-3 lg:mt-1">
				{#if pageMeta.logoURL}
					<img
						class="h-8 rounded"
						src={pageMeta.logoURL}
						onload={() => {
							// release the object URL after the image loads to free memory
							if (pageMeta.logoURL) URL.revokeObjectURL(pageMeta.logoURL);
						}}
						alt="Brand logo"
					/>
				{/if}
				<a href="/"><h2 class="mb-2 text-xl font-bold">Dashboard</h2></a>
			</div>

			<Menu />

			<div class="pl-3">
				<a href="/tentang"><h2 class="mb-2 font-bold">Tentang Aplikasi</h2></a>
			</div>
		</ul>
	</div>
</main>

<ModalDialog />
<Toast />
