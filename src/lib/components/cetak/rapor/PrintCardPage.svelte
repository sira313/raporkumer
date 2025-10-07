<script lang="ts">
	import type { ActionReturn } from 'svelte/action';

	type SplitTrigger = (node: Element) => ActionReturn | void;

	let {
		breakAfter = false,
		contentRef = $bindable<HTMLElement | null>(),
		splitTrigger,
		cardClass = '',
		contentClass = '',
		orientation = 'portrait',
		paddingClass = 'p-[20mm]',
		children
	} = $props<{
		breakAfter?: boolean;
		contentRef?: HTMLElement | null;
		splitTrigger?: SplitTrigger;
		cardClass?: string;
		contentClass?: string;
		orientation?: 'portrait' | 'landscape';
	 	paddingClass?: string;
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
		return [
			'bg-base-100 text-base-content mx-auto flex flex-col',
			dimensions,
			paddingClass
		]
			.filter(Boolean)
			.join(' ');
	});

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
