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
			<li class="ml-2">
				<div class="dropdown dropdown-end">
					<div tabindex="0" role="button" title="Ganti kelas" class="btn btn-soft rounded-full">
						<span class="hidden sm:block"> Kelas I </span>
						<Icon name="users" class="sm:hidden" />
						<Icon name="select" class="hidden sm:block" />
					</div>
					<ul
						class="menu dropdown-content bg-base-100 ring-opacity-5 z-[1] mt-6 w-72 origin-top-right rounded-xl p-4 shadow-md focus:outline-none"
					>
						<div class="flex items-center gap-4">
							<div
								class="bg-base-300 dark:bg-base-200 flex h-14 w-14 items-center justify-center rounded-full"
							>
								<Icon name="user" class="text-4xl" />
							</div>
							<div class="flex flex-col gap-1">
								<p class="text-base-content text-sm font-semibold">Aris Wira Pratama, S.Pd.</p>
								<p class="text-base-content/70 text-xs">Kelas IV - Fase B</p>
							</div>
						</div>

						<!-- Pilihan Kelas -->
						<details class="bg-base-200 collapse mt-6">
							<summary class="collapse-title font-semibold">Pindah Kelas</summary>
							<div class="collapse-content text-sm">
								<li>
									<a href="?kelas_id=2"> Kelas I - Fase A </a>
								</li>
								<li>
									<a href="?kelas_id=1"> Kelas IV - Fase B</a>
								</li>
							</div>
						</details>
						<li class="mt-2">
							<a href="/pengaturan">
								<Icon name="gear" />
								Pengaturan
							</a>
						</li>
					</ul>
				</div>
			</li>
		</ul>
	</div>
</div>
