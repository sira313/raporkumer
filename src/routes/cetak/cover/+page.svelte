<script lang="ts">
	import { onMount } from 'svelte';
	import { printElement } from '$lib/utils';
	import { toast } from '$lib/components/toast.svelte';
	import PrintTip from '$lib/components/alerts/print-tip.svelte';

	let printable: HTMLDivElement | null = null;

	function handlePrint() {
		const ok = printElement(printable, {
			title: 'Cover Rapor',
			pageMargin: '0'
		});
		if (!ok) {
			toast('Elemen cover belum siap untuk dicetak. Coba muat ulang halaman.', 'warning');
		}
	}

	onMount(() => {
		function onKeydown(event: KeyboardEvent) {
			if (!(event.ctrlKey || event.metaKey)) return;
			if (event.key.toLowerCase() !== 'p') return;
			event.preventDefault();
			handlePrint();
		}

		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

<PrintTip onPrint={handlePrint} />

<div class="card bg-base-100 rounded-lg border border-none shadow-md print:bg-transparent print:shadow-none print:border-none">
  <div
    class="min-w-[210mm] max-w-[210mm] min-h-[297mm] max-h-[297mm] mx-auto bg-base-100 text-base-content flex flex-col"
    bind:this={printable}
  >
    <div class="m-[20mm] flex-1 overflow-auto flex flex-col">
      <div class="flex justify-center mb-2">
        <div class="w-50">
          <img src="/tutwuri-bw.png" alt="logo" class="object-contain" />
        </div>
      </div>

      <div class="flex flex-col gap-4 mt-6">
        <h1 class="text-center text-4xl font-bold">LAPORAN</h1>
        <h2 class="text-center text-2xl font-bold">HASIL CAPAIAN PEMBELAJARAN MURID</h2>
				<!-- nama sekolah -->
        <h3 class="text-center text-2xl font-bold">SD NEGERI 19 PERIJI</h3>
      </div>

      <div class="flex flex-col gap-4 mt-auto">
				<div class="flex flex-col gap-2">
        	<p class="text-center text-lg font-bold">Nama Murid</p>
					<!-- nama murid gunakan huruf kapital semua -->
					<p class="text-center text-lg font-bold border py-2">MUHAMMAD ALI</p>
				</div>
        <div class="flex flex-col gap-2">
        	<p class="text-center text-lg font-bold">NISN / NIS</p>
					<!-- NISN dan NIS murid -->
					<p class="text-center text-lg font-bold border py-2">1234567890 / 0239</p>
				</div>
				<div class="flex flex-col gap-2">
        	<p class="text-center text-lg font-bold">
						KEMENTRIAN PENEDIDIKAN DASAR DAN MENENGAH
					</p>
					<p class="text-center text-lg font-bold">
						REPUBLIK INDONESIA
					</p>
				</div>
      </div>
    </div>
  </div>
</div>


