<script lang="ts" module>
	let modal = $state<HTMLDialogElement | null>(null);
	type ModalState = ModalProps<Record<string, unknown>>;
	let modalProps = $state<ModalState | null>(null);

	function clearModal() {
		const handler = modalProps?.onClose;
		modalProps = null;
		handler?.();
	}

	export function showModal<BodyProps extends Record<string, unknown>>(
		props: ModalProps<BodyProps>
	) {
		modalProps = props as ModalState;
		requestAnimationFrame(() => modal?.showModal());
	}

	export function updateModal<BodyProps extends Record<string, unknown>>(
		props: Partial<ModalProps<BodyProps>>
	) {
		if (!modalProps) return;
		const nextBodyProps = props.bodyProps
			? {
					...(modalProps.bodyProps ?? {}),
					...((props.bodyProps as Record<string, unknown>) ?? {})
				}
			: modalProps.bodyProps;
		modalProps = {
			...modalProps,
			...(props as Partial<ModalState>),
			bodyProps: nextBodyProps
		};
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

			<div class="prose w-full max-w-none py-4">
				{#if typeof props.body == 'string'}
					{@html props.body}
				{:else}
					{@const BodyComponent = props.body as ModalBodyComponent}
					<BodyComponent {...props.bodyProps ?? {}} />
				{/if}
			</div>

			{#if props.onPositive || props.onNeutral || props.onNegative}
				<div class="modal-action">
					{#if props.onNegative}
						<button
							class="btn btn-soft gap-2 shadow-none"
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
							class="btn btn-primary btn-soft gap-2 shadow-none"
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
