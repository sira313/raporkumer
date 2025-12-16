<script lang="ts">
	import type { ActionReturn } from 'svelte/action';
	import FooterPage from '$lib/components/cetak/preview/FooterPage.svelte';

	type SplitTrigger = (node: Element) => ActionReturn | void;

	let {
		breakAfter = false,
		contentRef = $bindable<HTMLElement | null>(),
		murid = null,
		rombel = null,
		pageNumber = null,
		splitTrigger,
		cardClass = '',
		contentClass = '',
		orientation = 'portrait',
		paddingClass = 'p-[20mm]',
		backgroundStyle = '',
		children
	} = $props<{
		breakAfter?: boolean;
		contentRef?: HTMLElement | null;
		murid?: unknown;
		rombel?: unknown;
		pageNumber?: number | null;
		splitTrigger?: SplitTrigger;
		cardClass?: string;
		contentClass?: string;
		orientation?: 'portrait' | 'landscape';
		paddingClass?: string;
		backgroundStyle?: string;
		children?: () => unknown;
	}>();

	function applySplit(node: Element) {
		if (!splitTrigger) return;
		return splitTrigger(node);
	}

	const cardClasses = $derived.by(() =>
		[
			'card bg-base-100 print:border-none print:bg-transparent print:shadow-none',
			breakAfter ? 'print:break-after-page' : '',
			cardClass
		]
			.filter(Boolean)
			.join(' ')
	);

	const contentContainerClasses = $derived.by(() => {
		const dimensions =
			orientation === 'landscape'
				? 'max-h-[210mm] min-h-[210mm] max-w-[297mm] min-w-[297mm]'
				: 'max-h-[297mm] min-h-[297mm] max-w-[210mm] min-w-[210mm]';
		return ['bg-base-100 text-base-content mx-auto flex flex-col', dimensions, paddingClass]
			.filter(Boolean)
			.join(' ');
	});

	const bodyClasses = $derived.by(() =>
		['flex min-h-0 flex-1 flex-col text-[12px] relative z-10', contentClass]
			.filter(Boolean)
			.join(' ')
	);
</script>

<!-- removed page-edge visual guide: no extra border at page edge -->

<div class={cardClasses} style="break-inside: avoid-page;">
	<div id="paperA4" class={contentContainerClasses} style="position: relative;">
		{#if backgroundStyle}
			<div
				style={backgroundStyle +
					'; position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 0; pointer-events: none; opacity: 0.2;'}
				class="print:opacity-100"
			></div>
		{/if}
		<div class={bodyClasses} bind:this={contentRef} use:applySplit data-content-ref>
			{@render children?.()}
			<!-- Garis merah debug di padding bottom -->
			<div
				id="sensorTrigger"
				class="debug-red-border"
				style="position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background-color: red; z-index: 999;"
			></div>
		</div>

		<!-- Per-page footer placed outside of the measured contentRef so it doesn't affect pagination -->
		<FooterPage {murid} {rombel} {pageNumber} />

		<!-- Garis kuning di akhir bawah kertas -->
		<div
			id="paperEnd"
			class="debug-yellow-border"
			style="position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background-color: yellow; z-index: 999;"
		></div>
	</div>
</div>

<style>
	/* Debug borders - tidak muncul saat print */
	:global(.debug-red-border),
	:global(.debug-yellow-border) {
		display: block;
	}

	@media print {
		:global(.debug-red-border),
		:global(.debug-yellow-border) {
			display: none !important;
		}
	}
</style>
