<script lang="ts">
	import Task from '$lib/components/tasks.svelte';

	let dialogEl: HTMLDialogElement;

	export function open() {
		dialogEl?.showModal();
	}

	export function close() {
		dialogEl?.close();
	}
</script>

<dialog class="modal" bind:this={dialogEl}>
	<div class="modal-box max-w-lg p-4">
		<Task variant="modal" />
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
