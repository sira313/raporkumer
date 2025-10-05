<script lang="ts" module>
	let modal = $state<HTMLDialogElement | null>(null);
	let modalProps = $state<ModalProps | null>(null);

	function clearModal() {
		modalProps = null;
	}

	export function showModal(props: ModalProps) {
		modalProps = props;
		requestAnimationFrame(() => modal?.showModal());
	}

	export function hideModal() {
		if (!modal) return;
		modal.close();
		clearModal();
	}
</script>

{#if modalProps}
	{@const props = modalProps}
	<dialog bind:this={modal} class="modal" oncancel={clearModal} onclose={clearModal}>
		<div class="modal-box sm:w-full sm:max-w-2xl">
			{#if props.title}
				<h3 class="text-lg font-bold">{props.title}</h3>
			{/if}

			<p class="prose w-full max-w-none py-4">
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
							class="btn btn-error shadow-none"
							type="button"
							onclick={() => props.onNegative?.action?.({ close: hideModal })}
						>
							{props.onNegative.label}
						</button>
					{/if}

					{#if props.onNeutral}
						<button
							class="btn shadow-none"
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
	</dialog>
{/if}
