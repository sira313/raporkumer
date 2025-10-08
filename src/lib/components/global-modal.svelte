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

	export function updateModal(props: Partial<ModalProps>) {
		if (!modalProps) return;
		const nextBodyProps = props.bodyProps
			? { ...(modalProps.bodyProps ?? {}), ...(props.bodyProps ?? {}) }
			: modalProps.bodyProps;
		modalProps = { ...modalProps, ...props, bodyProps: nextBodyProps };
	}

	export function hideModal() {
		if (!modal) return;
		modal.close();
		clearModal();
	}
</script>

<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
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
					{@const BodyComponent = props.body as import('svelte').Component<any, any, any>}
					<BodyComponent {...props.bodyProps ?? {}} />
				{/if}
			</p>

			{#if props.onPositive || props.onNeutral || props.onNegative}
				<div class="modal-action">
					{#if props.onNegative}
						<button
							class="btn btn-error gap-2 shadow-none"
							type="button"
							onclick={() => props.onNegative?.action?.({ close: hideModal })}
						>
							{#if props.onNegative.icon}
								<Icon name={props.onNegative.icon} />
							{/if}
							{props.onNegative.label}
						</button>
					{/if}

					{#if props.onNeutral}
						<button
							class="btn gap-2 shadow-none"
							type="button"
							onclick={() => props.onNeutral?.action?.({ close: hideModal })}
						>
							{#if props.onNeutral.icon}
								<Icon name={props.onNeutral.icon} />
							{/if}
							{props.onNeutral.label}
						</button>
					{/if}

					{#if props.onPositive}
						<button
							class="btn btn-primary gap-2 shadow-none"
							type="button"
							onclick={() => props.onPositive?.action?.({ close: hideModal })}
						>
							{#if props.onPositive.icon}
								<Icon name={props.onPositive.icon} />
							{/if}
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
