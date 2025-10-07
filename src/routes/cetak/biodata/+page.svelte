<script lang="ts">
	import { onMount } from 'svelte';
	import PrintTip from '$lib/components/alerts/print-tip.svelte';
	import PrintCardPage from '$lib/components/cetak/rapor/PrintCardPage.svelte';
	import BiodataFooter from '$lib/components/cetak/biodata/BiodataFooter.svelte';
	import BiodataHeader from '$lib/components/cetak/biodata/BiodataHeader.svelte';
	import BiodataIdentityTable from '$lib/components/cetak/biodata/BiodataIdentityTable.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import { printElement } from '$lib/utils';

	let { data } = $props();
	let printable: HTMLDivElement | null = null;

	const biodata = $derived.by(() => data.biodataData ?? null);
	const sekolah = $derived.by(() => biodata?.sekolah ?? null);
	const murid = $derived.by(() => biodata?.murid ?? null);
	const orangTua = $derived.by(() => biodata?.orangTua ?? null);
	const wali = $derived.by(() => biodata?.wali ?? null);
	const ttd = $derived.by(() => biodata?.ttd ?? null);
	const printTitle = $derived.by(() => data.meta?.title ?? 'Biodata Murid');

	function handlePrint() {
		const ok = printElement(printable, {
			title: printTitle,
			pageMargin: '0'
		});
		if (!ok) {
			toast('Elemen biodata belum siap untuk dicetak. Coba muat ulang halaman.', 'warning');
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

<PrintTip onPrint={handlePrint} buttonLabel="Cetak biodata" />

<section>
	<div class="bg-base-300 border border-black/20 rounded-md card shadow-md w-full overflow-x-auto print:border-none print:bg-transparent print:p-0">
		<div class="mx-auto flex w-fit flex-col gap-6 print:gap-0" bind:this={printable}>
			<PrintCardPage contentClass="gap-6 text-[13px] leading-relaxed">
				<BiodataHeader {sekolah} />
				<BiodataIdentityTable
					murid={murid}
					orangTua={orangTua}
					wali={wali}
					class="mt-2 flex-1"
				/>
				<BiodataFooter ttd={ttd} class="mt-auto pt-12" />
			</PrintCardPage>
		</div>
	</div>
</section>
