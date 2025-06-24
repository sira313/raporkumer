<script lang="ts">
	import { flip } from 'svelte/animate';
	import Icon from '../icon.svelte';
	import { toasts } from './state.svelte';

	const autoCloseAfter = 5; // seconds
	const typesMaps: Record<NonNullable<Toast['type']>, [string, string]> = {
		info: ['alert-info', 'info'],
		success: ['alert-success', 'success'],
		warning: ['alert-warning', 'warning'],
		error: ['alert-error', 'error']
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

<div class="toast toast-top toast-center toast-center z-50">
	{#each toasts as t (t)}
		{@const [color, icon] = typesMaps[t.type || 'info']}
		<div animate:flip={{ duration: 200, delay: 80 }} class="alert {color}" role="alert">
			<Icon name={icon} />
			<span>{@html t.message}</span>

			<button class="btn btn-circle btn-ghost" type="button" title="Tutup" onclick={() => close(t)}>
				<Icon name="close" />
				<span class="sr-only">Tutup</span>
			</button>
		</div>
	{/each}
</div>
