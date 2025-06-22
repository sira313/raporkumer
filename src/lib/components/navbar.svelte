<script lang="ts">
	import { page } from '$app/state';
	import DarkMode from '$lib/components/dark-mode.svelte';
	import IconMenuDrawer from '$lib/icons/menu-drawer.svg?raw';
	import IconQuestion from '$lib/icons/question.svg?raw';
	import { pageMeta } from '$lib/state.svelte';
	import { showModal } from './modal/state.svelte';

	const helps: Record<string, string> = {
		// path: body
		'/sekolah':
			'<h3 class="font-bold text-lg mb-4">Petunjuk Penggunaan</h3><p>Isi data sekolah dengan lengkap dan benar. Pastikan untuk mengunggah logo sekolah dalam format PNG.</p>',
		'/siswa':
			'<h3 class="font-bold text-lg mb-4">Petunjuk Penggunaan</h3><ul class="space-y-3"><li class="flex items-start gap-3"><p><code class="bg-primary text-primary-content rounded-md px-2">Tambah Siswa</code> Berfungsi untuk menambahkan siswa secara manual ke dalam daftar.</p></li><li class="flex items-start gap-3"><p><code class="bg-success text-success-content px-2 rounded-md">Download Template</code> Berfungsi untuk mengunduh template Excel yang digunakan saat mengisi data siswa.</p></li><li class="flex items-start gap-3"><p><code class="bg-warning text-warning-content px-2 rounded-md">Import</code> Berfungsi untuk mengunggah data siswa dari file Excel. Gunakan template yang sudah disediakan!</p></li><li class="flex items-start gap-3"><p><code class="bg-accent text-accent-content px-2 rounded-md">Export</code> Berfungsi untuk mengunduh daftar siswa yang telah dimasukkan dalam format Excel.</p></li></ul>'
	};

	function showHelp() {
		const body = helps[page.url.pathname.replace(/\/+$/, '')] || 'Noting match to `helps`';
		showModal({
			// body can be string or Snippet
			body: body,
			dismissible: true,
			onNeutral: {
				label: 'OK',
				action({ close }) {
					// do something here
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
