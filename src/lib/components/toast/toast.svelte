<script lang="ts">
	import IconError from '$lib/icons/error.svg?raw';
	import IconInfo from '$lib/icons/info.svg?raw';
	import IconSuccess from '$lib/icons/success.svg?raw';
	import IconWarning from '$lib/icons/warning.svg?raw';
	import { flip } from 'svelte/animate';
	import { toasts } from './state.svelte';

	const autoCloseAfter = 5; // seconds
	const typesMaps: Record<NonNullable<Toast['type']>, [string, string]> = {
		info: ['alert-info', IconInfo],
		success: ['alert-success', IconSuccess],
		warning: ['alert-warning', IconWarning],
		error: ['alert-error', IconError]
	};

	function close(toast: Toast) {
		const target = toasts.indexOf(toast);
		if (target > -1) toasts.splice(target, 1);
	}

	$effect(() => {
		if (!toasts.length) return;
		const timer = setTimeout(() => toasts.shift(), autoCloseAfter * 1000);
		return () => clearInterval(timer);
	});
</script>

<div class="toast toast-top toast-center z-50 max-w-md">
	{#each toasts as t (t)}
		{@const [color, icon] = typesMaps[t.type || 'info']}
		<div animate:flip={{ duration: 200, delay: 80 }} class="alert {color}" role="alert">
			{@html icon}
			<span>{@html t.message}</span>

			<button class="btn btn-xs" type="button" title="Tutup" onclick={() => close(t)}>
				Tutup
			</button>
		</div>
	{/each}
</div>
