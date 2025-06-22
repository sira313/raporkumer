<script lang="ts">
	import { toasts } from './state.svelte';

	const typesClasses: Record<NonNullable<Toast['type']>, string> = {
		info: 'alert-info',
		success: 'alert-success',
		warning: 'alert-warning',
		error: 'alert-error'
	};
</script>

<div class="toast">
	{#each toasts as t}
		<div class="alert {typesClasses[t.type || 'info']}" role="alert">
			<span>{t.message}</span>

			<div>
				<button class="btn btn-sm btn-ghost rounded-full"> X </button>
			</div>
		</div>
	{/each}
</div>
