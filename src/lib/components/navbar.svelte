<script lang="ts">
	import { page } from '$app/state';
	import DarkMode from '$lib/components/dark-mode.svelte';
	import { showModal } from '$lib/components/global-modal.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import type { Component } from 'svelte';

	const helpMaps: Record<string, string> = {
		'/': 'umum',
		'/sekolah': 'sekolah',
		'/sekolah/form': 'sekolah',
		'/murid': 'murid',
		'/intrakurikuler': 'intrakurikuler',
		'/ekstrakurikuler': 'ekstrakurikuler',
		'/kelas': 'data-kelas',
		'/kelas/form': 'data-kelas',
		'/intrakurikuler/tp-rl': 'tp-rl',
		'/asesmen-formatif': 'asesmen-formatif',
		'/asesmen-formatif/formulir-asesmen': 'form-formatif',
		'/asesmen-sumatif': 'asesmen-sumatif',
		'/asesmen-sumatif/formulir-asesmen': 'form-sumatif',
		'/nilai-akhir': 'nilai-akhir',
		'/nilai-akhir/daftar-nilai': 'daftar-nilai',
		'/absen': 'absen',
		'/nilai-ekstrakurikuler': 'nilai-ekstrakurikuler',
		'/cetak': 'cetak'
	};

	async function getHelpPage(fileName: string) {
		const page = await import(`../../docs/help/${fileName}.md`);
		return {
			meta: page.metadata as { title: string },
			ContentPage: page.default as Component
		};
	}

	async function showHelp() {
		const pathname = page.url.pathname.replace(/\/+$/, '') || '/';
		const fileName = helpMaps[pathname];
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
			<span class="text-lg">
				<Icon name="menu-drawer" />
			</span>
		</label>
	</div>
	<!-- select disabled di menu /sekolah dan /kelas -->
	<!-- jika kelas hanya ada satu, maka otomatis terpilih kelas yang ada -->
	<select class="select dark:bg-base-200 dark:border-none">
		<option disabled selected>Pilih Kelas</option>
		<option>Kelas I</option>
		<option>Kelas IV</option>
		<option>Kelas VI</option>
	</select>
	<div class="mx-2 hidden flex-1 px-2 md:block">
		<span class="text-lg font-bold">{page.data.meta?.title || ''}</span>
	</div>
	<div class="ml-auto flex-none">
		<ul class="menu menu-horizontal px-1">
			<!-- tombol dark/light -->
			<li class="menu-item">
				<DarkMode />
			</li>
			<li class="menu-item">
				<button
					class="btn btn-ghost btn-circle"
					aria-label="Bantuan"
					title="Petunjuk"
					onclick={showHelp}
				>
					<span class="text-xl">
						<Icon name="question" />
					</span>
				</button>
			</li>
		</ul>
	</div>
</div>
