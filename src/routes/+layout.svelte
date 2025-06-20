<script lang="ts">
	import { page } from '$app/state';
	import Menu from '$lib/components/menu.svelte';
	import ModalDialog from '$lib/components/modal/modal-dialog.svelte';
	import Navbar from '$lib/components/navbar.svelte';
	import { appName, pageMeta, setPageTitle } from '$lib/state.svelte';
	import { findTitleByPath } from '$lib/utils';
	import '../app.css';

	let { children } = $props();

	$effect(() => {
		const title = findTitleByPath(page.url.pathname);
		title && setPageTitle(title);
	});
</script>

<svelte:head>
	<title>{appName}{pageMeta.title ? ' - ' + pageMeta.title : ''}</title>
</svelte:head>

<main class="drawer lg:drawer-open">
	<input id="my-drawer-2" type="checkbox" class="drawer-toggle" />
	<div class="drawer-content">
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
		<ul class="menu bg-base-200 text-base-content min-h-full w-80 p-4">
			<div class="mt-20 pb-4 pl-3 lg:mt-0">
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
