<script lang="ts" module>
	export const toasts = $state<Toast[]>([]);

	export function toast(data: Toast | string, type?: Toast['type']) {
		if (typeof data == 'string') {
			data = { message: data, type };
		}
		toasts.push(data);
	}
</script>

<script lang="ts">
	import { flip } from 'svelte/animate';
	import Icon from './icon.svelte';

	let interact = $state(false);

	const autoCloseAfter = 5; // seconds
	const typesMaps: Record<NonNullable<Toast['type']>, [string, IconName]> = {
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
		let timer;
		if (interact) {
			clearTimeout(timer);
			return;
		}
		timer = setTimeout(() => toasts.shift(), autoCloseAfter * 1000);
		return () => clearInterval(timer);
	});
</script>

<div class="toast toast-top toast-center toast-center z-50">
	{#each toasts as t (t)}
		{@const [color, icon] = typesMaps[t.type || 'info']}
		<div
			animate:flip={{ duration: 200, delay: 80 }}
			class="alert relative {color}"
			role="alert"
			onmouseover={() => (interact = true)}
			onfocus={() => (interact = true)}
			onmouseleave={() => (interact = false)}
			onblur={() => (interact = false)}
		>
			<span class="text-lg">
				<Icon name={icon} />
			</span>
			<span>{@html t.message}</span>
			<button class="btn btn-circle btn-ghost" type="button" title="Tutup" onclick={() => close(t)}>
				<span class="text-lg">
					<Icon name="close" />
				</span>
				<span class="sr-only">Tutup</span>
			</button>
		</div>
	{/each}
</div>
