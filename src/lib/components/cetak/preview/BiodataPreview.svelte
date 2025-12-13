<script lang="ts">
	import PrintCardPage from '$lib/components/cetak/rapor/PrintCardPage.svelte';
	import BiodataFooter from '$lib/components/cetak/biodata/BiodataFooter.svelte';
	import BiodataHeader from '$lib/components/cetak/biodata/BiodataHeader.svelte';
	import BiodataIdentityTable from '$lib/components/cetak/biodata/BiodataIdentityTable.svelte';

	type BiodataData = NonNullable<App.PageData['biodataData']>;
	type ComponentData = {
		biodataData?: BiodataData | null;
		meta?: { title?: string | null } | null;
	};

	let {
		data = {},
		onPrintableReady = () => {},
		showBgLogo = false,
		muridProp = null
	} = $props<{
		data?: ComponentData;
		onPrintableReady?: (node: HTMLDivElement | null) => void;
		showBgLogo?: boolean;
		muridProp?: { id?: number | null } | null;
	}>();

	const biodata = $derived.by(() => data?.biodataData ?? null);
	const sekolah = $derived.by(() => biodata?.sekolah ?? null);
	const murid = $derived.by(() => biodata?.murid ?? null);
	const orangTua = $derived.by(() => biodata?.orangTua ?? null);
	const wali = $derived.by(() => biodata?.wali ?? null);
	const ttd = $derived.by(() => biodata?.ttd ?? null);

	const logoUrl = $derived.by(() => sekolah?.logoUrl ?? '/tutwuri.png');
	const backgroundStyle = $derived.by(() => {
		if (!showBgLogo) return '';
		// Escape single quotes in URL for CSS
		const escapedUrl = logoUrl.replace(/'/g, "\\'");
		return `background-image: url('${escapedUrl}'); background-position: center center; background-repeat: no-repeat; background-size: 45%; background-attachment: local; position: relative;`;
	});

	let printable: HTMLDivElement | null = null;

	$effect(() => {
		onPrintableReady?.(printable);
	});
</script>

<div
	class="bg-base-300 dark:bg-base-200 card preview w-full overflow-x-auto rounded-md border border-black/20 shadow-md print:border-none print:bg-transparent print:p-0"
>
	<div class="mx-auto flex w-fit flex-col gap-6 print:gap-0" bind:this={printable}>
		<PrintCardPage contentClass="gap-6 text-[13px] leading-relaxed" {backgroundStyle}>
			<BiodataHeader {sekolah} />
			<BiodataIdentityTable {murid} {orangTua} {wali} class="mt-2 flex-1" />
			<BiodataFooter {ttd} {murid} {sekolah} class="mt-auto pt-12" />
		</PrintCardPage>
	</div>
</div>
