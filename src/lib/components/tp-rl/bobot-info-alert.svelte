<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	interface Props {
		message: string;
		onDismiss: () => void;
	}

	let { message, onDismiss }: Props = $props();
</script>

<div class="alert alert-warning alert-soft mb-4 flex items-center gap-2">
	<Icon name="warning" />
	<div class="flex-1 text-sm">{message}</div>
	<button
		class="btn btn-ghost btn-circle btn-sm"
		type="button"
		aria-label="Tutup notifikasi bobot"
		onclick={onDismiss}
	>
		<Icon name="close" />
	</button>
</div>
