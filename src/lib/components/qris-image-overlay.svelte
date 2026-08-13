<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/icon.svelte';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();
	let dialogEl = $state<HTMLDialogElement | null>(null);

	onMount(() => {
		dialogEl?.showModal();
	});

	function handleClose(): void {
		dialogEl?.close();
	}
</script>

<dialog
	bind:this={dialogEl}
	class="bg-black p-0 shadow-none"
	style="width: 100vw; height: 100vh; max-width: none; max-height: none; margin: 0;"
	onclose={() => onclose()}
>
	<button
		type="button"
		class="block h-full w-full cursor-zoom-out"
		aria-label="Tutup QRIS"
		onclick={handleClose}
	>
		<img src="/qris.jpeg" alt="QRIS" class="pointer-events-none h-full w-full object-contain" />
		<span
			class="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-base-100 text-base-content shadow-lg"
		>
			<Icon name="close" />
		</span>
	</button>
</dialog>
