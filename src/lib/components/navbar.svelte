<script lang="ts">
	import { page } from '$app/state';
	import DarkMode from '$lib/components/dark-mode.svelte';
	import Icon from '$lib/components/icon.svelte';
	import TasksModal from '$lib/components/modal-tasks.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import { showModal } from '$lib/components/global-modal.svelte';
	import type { Component } from 'svelte';

	type NavbarProps = {
		stopServer?: () => void;
		stoppingServer?: boolean;
	};

	let { stopServer = () => {}, stoppingServer = false }: NavbarProps = $props();

	let tasksModalRef: { open: () => void } | null = null;
	const daftarKelas = $derived(page.data.daftarKelas ?? []);
	const kelasAktif = $derived(page.data.kelasAktif ?? null);
	const user = $derived(page.data.user ?? null);
	const kelasAktifLabel = $derived.by(() => {
		if (!kelasAktif) return 'Pilih Kelas';
		return kelasAktif.fase ? `${kelasAktif.nama} - ${kelasAktif.fase}` : kelasAktif.nama;
	});

	function buildKelasHref(kelasId: number) {
		const params = new URLSearchParams(page.url.search);
		params.set('kelas_id', String(kelasId));
		const query = params.toString();
		return query ? `${page.url.pathname}?${query}` : page.url.pathname;
	}

	type HelpMapEntry = { matcher: string | RegExp; file: string };

	const helpMaps: HelpMapEntry[] = [
		{ matcher: '/', file: 'umum' },
		{ matcher: '/sekolah', file: 'sekolah' },
		{ matcher: '/sekolah/form', file: 'sekolah-form' },
		{ matcher: '/sekolah/tahun-ajaran', file: 'tahun-ajaran' },
		{ matcher: '/rapor', file: 'rapor' },
		{ matcher: '/murid', file: 'murid' },
		{ matcher: '/intrakurikuler', file: 'intrakurikuler' },
		{ matcher: /^\/intrakurikuler\/\d+\/tp-rl$/, file: 'tp-rl' },
		{ matcher: '/kokurikuler', file: 'kokurikuler' },
		{ matcher: '/asesmen-kokurikuler', file: 'asesmen-kokurikuler' },
		{ matcher: '/ekstrakurikuler', file: 'ekstrakurikuler' },
		{ matcher: '/ekstrakurikuler/tp-ekstra', file: 'tp-ekstra' },
		{ matcher: '/kelas', file: 'data-kelas' },
		{ matcher: '/kelas/form', file: 'data-kelas' },
		{ matcher: '/asesmen-formatif', file: 'asesmen-formatif' },
		{ matcher: '/asesmen-formatif/formulir-asesmen', file: 'form-formatif' },
		{ matcher: '/asesmen-sumatif', file: 'asesmen-sumatif' },
		{ matcher: '/asesmen-sumatif/formulir-asesmen', file: 'form-sumatif' },
		{ matcher: '/nilai-akhir', file: 'nilai-akhir' },
		{ matcher: '/nilai-akhir/daftar-nilai', file: 'daftar-nilai' },
		{ matcher: '/absen', file: 'absen' },
		{ matcher: '/nilai-ekstrakurikuler/form-asesmen', file: 'form-ekstra' },
		{ matcher: '/nilai-ekstrakurikuler', file: 'nilai-ekstra' },
		{ matcher: '/catatan-wali-kelas', file: 'catatan-wali' },
		{ matcher: '/cetak', file: 'cetak' }
	];

	function resolveHelpFile(pathname: string): string | null {
		for (const entry of helpMaps) {
			if (typeof entry.matcher === 'string') {
				if (pathname === entry.matcher) return entry.file;
				continue;
			}
			if (entry.matcher.test(pathname)) {
				return entry.file;
			}
		}
		return null;
	}

	async function getHelpPage(fileName: string) {
		const page = await import(`../../docs/help/${fileName}.md`);
		return {
			meta: page.metadata as { title: string },
			ContentPage: page.default as Component
		};
	}

	async function showHelp() {
		const pathname = page.url.pathname.replace(/\/+$/, '') || '/';
		const fileName = resolveHelpFile(pathname);
		if (!fileName) {
			toast(
				`Tombol ini berfungsi untuk menampilkan petunjuk penggunaan.<br />` +
					`Silahkan klik salah satu menu lalu klik lagi tombol ini.`
			);
			return;
		}
		const result = await getHelpPage(fileName);
		showModal({
			title: result.meta.title,
			body: result.ContentPage,
			dismissible: true
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

	<span class="mx-2 flex-1 truncate px-2 text-lg font-bold">{page.data.meta?.title || ''}</span>
	<div class="ml-auto flex-none">
		<ul class="flex items-center px-1">
			<!-- tasks modal for mobile -->
			<li>
				<button
					class="btn btn-ghost btn-circle xl:hidden"
					aria-label="Daftar Tugas"
					title="Daftar Tugas"
					onclick={() => tasksModalRef?.open()}
				>
					<Icon name="check" class="text-lg" />
				</button>
			</li>

			<!-- Dark Mode -->
			<li>
				<DarkMode />
			</li>

			<!-- Help -->
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

			<!-- Dropdown ganti kelas -->
			<li class="ml-2">
				<div class="dropdown dropdown-end">
					<div tabindex="0" role="button" title="Ganti kelas" class="btn btn-soft rounded-full">
						<span class="hidden sm:block">{kelasAktifLabel}</span>
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
								<!-- Nama wali kelas -->
								<p class="text-base-content text-sm font-semibold">
									{kelasAktif?.waliKelas?.nama ?? 'Belum ada wali kelas'}
								</p>
								<!-- Nama kelas -->
								<p class="text-base-content/70 text-xs">{kelasAktifLabel}</p>
							</div>
						</div>

						{#if daftarKelas.length}
							<details class="bg-base-300 dark:bg-base-200 collapse mt-6">
								<!-- opsi pindah kelas -->
								<summary class="collapse-title font-semibold">Pindah Kelas</summary>
								<div class="collapse-content flex flex-col px-2">
									{#each daftarKelas as kelas (kelas.id)}
										{@const label = kelas.fase ? `${kelas.nama} - ${kelas.fase}` : kelas.nama}
										<a
											class="btn btn-ghost btn-sm justify-start"
											href={buildKelasHref(kelas.id)}
											class:active={kelasAktif?.id === kelas.id}
										>
											{label}
										</a>
									{/each}
								</div>
							</details>
						{:else}
							<p class="text-base-content/70 mt-6 text-sm">
								Belum ada data kelas yang dapat dipilih.
							</p>
						{/if}

						<li class="mt-2">
							<a href="/pengaturan">
								<Icon name="gear" />
								Pengaturan
							</a>
						</li>
						{#if user}
						{/if}
						<li>
							<form method="POST" action="/logout" class="w-full">
								<Icon name="export" />
								Keluar
							</form>
						</li>
						<li>
							<button
								type="button"
								title="Hentikan server"
								onclick={stopServer}
								disabled={stoppingServer}
							>
								<Icon name="warning" />
								{stoppingServer ? 'Menghentikan server…' : 'Hentikan Server'}
							</button>
						</li>
					</ul>
				</div>
			</li>
		</ul>
	</div>
</div>

<!-- Tempel instance modal di bawah navbar dan bind ref -->
<TasksModal bind:this={tasksModalRef} />
