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

<div class="navbar bg-base-100 border-base-200 sticky top-0 z-50">
	<div class="flex-none lg:hidden">
		<label for="my-drawer-2" class="btn btn-square btn-ghost drawer-button">
			<span class="text-lg">
				<Icon name="menu-drawer" />
			</span>
		</label>
	</div>
	<!-- dropdown settings -->
	<button
		title="Pengaturan"
		class="btn btn-ghost btn-circle md:hidden"
		popovertarget="popover-1"
		style="anchor-name:--anchor-1"
	>
		<Icon name="gear" class="text-lg" />
	</button>
	<div
		class="dropdown menu rounded-box bg-base-100 mt-6 w-52 shadow-sm"
		popover
		id="popover-1"
		style="position-anchor:--anchor-1"
	>
		<!-- pilih kelas -->
		<select class="select bg-base-200 dark:border-none">
			<option disabled selected>Pilih kelas</option>
			<option>Kelas I</option>
			<option>Kelas II</option>
			<option>Kelas III</option>
		</select>
		<!-- pilih semester -->
		<select class="select bg-base-200 mt-2 dark:border-none">
			<option disabled selected>Pilih semester</option>
			<option>Semester Ganjil</option>
			<option>Semester Genap</option>
		</select>
	</div>

	<div class="ml-2 hidden gap-2 md:flex">
		<!-- pilih kelas -->
		<select class="select bg-base-200 min-w-fit dark:border-none">
			<option disabled selected>Pilih kelas</option>
			<option>Kelas I</option>
			<option>Kelas II</option>
			<option>Kelas III</option>
		</select>
		<!-- pilih semester -->
		<select class="select bg-base-200 min-w-fit dark:border-none">
			<option disabled selected>Pilih semester</option>
			<option>Semester Ganjil</option>
			<option>Semester Genap</option>
		</select>
	</div>

	<div class="mx-2 flex-1 px-2">
		<span class="text-lg font-bold">{page.data.meta?.title || ''}</span>
	</div>
	<div class="ml-auto flex-none">
		<ul class="flex items-center px-1">
			<li>
				<DarkMode />
			</li>
			<li>
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
