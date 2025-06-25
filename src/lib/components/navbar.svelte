<script lang="ts">
	import { page } from '$app/state';
	import DarkMode from '$lib/components/dark-mode.svelte';
	import { showModal } from '$lib/components/global-modal.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import { pageMeta } from '$lib/state.svelte';
	import type { Component } from 'svelte';

	const helpMaps: Record<string, string> = {
		// path: fileName (without extension)
		'/sekolah': 'sekolah',
		'/murid': 'murid',
		'/mata-pelajaran': 'mata-pelajaran',
		'/ekstrakurikuler': 'ekstrakurikuler'
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
		if (!fileName) {
			toast(
				`Tombol ini berfungsi untuk menampilkan petunjuk penggunaan.<br />` +
					`Silahkan klik salah satu menu lalu klik lagi tombol ini.`
			);
			return;
		}

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
			<Icon name="menu-drawer" />
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
					<Icon name="question" />
				</button>
			</li>
		</ul>
	</div>
</div>
