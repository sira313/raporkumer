<script lang="ts">
	import type { ActionReturn } from 'svelte/action';

	type SplitTrigger = (node: Element) => ActionReturn | void;

	let {
		breakAfter = false,
		contentRef = $bindable<HTMLElement | null>(),
		splitTrigger,
		cardClass = '',
		contentClass = '',
		children
	} = $props<{
		breakAfter?: boolean;
		contentRef?: HTMLElement | null;
		splitTrigger?: SplitTrigger;
		cardClass?: string;
		contentClass?: string;
		children?: () => unknown;
	}>();

	function applySplit(node: Element) {
		if (!splitTrigger) return;
		return splitTrigger(node);
	}

	const cardClasses = $derived.by(() =>
		[
			'card bg-base-100 rounded-lg border border-none shadow-md print:border-none print:bg-transparent print:shadow-none',
			breakAfter ? 'print:break-after-page' : '',
			cardClass
		]
			.filter(Boolean)
			.join(' ')
	);

	const contentContainerClasses =
		'bg-base-100 text-base-content mx-auto flex max-h-[297mm] min-h-[297mm] max-w-[210mm] min-w-[210mm] flex-col p-[20mm]';

	const bodyClasses = $derived.by(() =>
		['flex min-h-0 flex-1 flex-col text-[12px]', contentClass].filter(Boolean).join(' ')
	);
</script>

<div class={cardClasses} style="break-inside: avoid-page;">
	<div class={contentContainerClasses}>
		<div class={bodyClasses} bind:this={contentRef} use:applySplit>
			{@render children?.()}
		</div>
	</div>
</div>
