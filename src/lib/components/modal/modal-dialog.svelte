<script lang="ts">
	import { getModalProps, hideModal } from './state.svelte';

	let modal: HTMLDialogElement;
	let props = $derived(getModalProps());

	$effect(() => {
		if (!modal) return;
		if (props) modal.showModal();
		else modal.close();
	});
</script>

<dialog bind:this={modal} class="modal" onclose={() => setTimeout(hideModal, 800)}>
	{#if props}
		<div class="modal-box">
			{#if props.title}
				<h3 class="text-lg font-bold">{props.title}</h3>
			{/if}

			<p class="py-4">
				{#if typeof props.body == 'string'}
					{@html props.body}
				{:else}
					<props.body />
				{/if}
			</p>

			{#if props.onPositive || props.onNeutral || props.onNegative}
				<div class="modal-action">
					{#if props.onNegative}
						<button
							class="btn btn-error"
							type="button"
							onclick={() => props.onNegative?.action?.({ close: hideModal })}
						>
							{props.onNegative.label}
						</button>
					{/if}

					{#if props.onNeutral}
						<button
							class="btn btn-neutral"
							type="button"
							onclick={() => props.onNeutral?.action?.({ close: hideModal })}
						>
							{props.onNeutral.label}
						</button>
					{/if}

					{#if props.onPositive}
						<button
							class="btn btn-primary"
							type="button"
							onclick={() => props.onPositive?.action?.({ close: hideModal })}
						>
							{props.onPositive.label}
						</button>
					{/if}
				</div>
			{/if}
		</div>
		{#if props.dismissible}
			<form method="dialog" class="modal-backdrop">
				<button>close</button>
			</form>
		{/if}
	{/if}
</dialog>
