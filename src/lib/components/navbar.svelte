<script lang="ts">
	import { page } from '$app/state';
	import DarkMode from '$lib/components/dark-mode.svelte';
	import IconMenuDrawer from '$lib/icons/menu-drawer.svg?raw';
	import IconQuestion from '$lib/icons/question.svg?raw';
	import { pageMeta } from '$lib/state.svelte';
	import type { Component } from 'svelte';
	import { showModal } from './modal/state.svelte';
	import { toast } from './toast/state.svelte';

	const helpMaps: Record<string, string> = {
		// path: fileName (without extension)
		'/sekolah': 'sekolah',
		'/murid': 'murid'
	};

	async function getHelpPage(fileName: string) {
		const page = await import(`../../docs/help/${fileName}.md`);
		return {
			meta: page.metadata as { title: string },
			ContentPage: page.default as Component
		};
	}

	async function showHelp() {
		const fileName = helpMaps[page.url.pathname.replace(/\/+$/, '')];
		if (!fileName)
			return toast(
				`Tombol ini berfungsi untuk menampilkan petunjuk penggunaan.<br />Silahkan klik salah satu menu lalu klik lagi tombol ini.`
			);

		const result = await getHelpPage(fileName);
		showModal({
			body: result.ContentPage,
			title: result.meta.title,
			dismissible: true,
			onNeutral: {
				label: 'OK',
				action({ close }) {
					close();
				}
			}
		});
	}
</script>

<div
	class="navbar bg-base-100 border-base-200 sticky top-0 z-50 border-b lg:border-b-0 lg:border-l"
>
	<div class="flex-none lg:hidden">
		<label for="my-drawer-2" class="btn btn-square btn-ghost drawer-button">
			{@html IconMenuDrawer}
		</label>
	</div>
	<div class="mx-2 flex-1 px-2">
		<span class="text-lg font-bold">{pageMeta?.title}</span>
	</div>
	<div class="flex-none">
		<ul class="menu menu-horizontal px-1">
			<!-- tombol dark/light -->
			<li class="menu-item">
				<DarkMode />
			</li>
			<li class="menu-item">
				<button class="btn btn-ghost btn-circle" aria-label="Bantuan" onclick={showHelp}>
					{@html IconQuestion}
				</button>
			</li>
		</ul>
	</div>
</div>
