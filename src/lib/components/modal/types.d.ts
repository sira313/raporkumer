interface ModalAction {
	label: string;
	icon?: string;
	action?: (params: { close: () => void }) => MaybePromise<void>;
}

interface ModalProps {
	title?: string;
	body: string | import('svelte').Snippet;
	dismissible?: boolean;
	onPositive?: ModalAction;
	onNeutral?: ModalAction;
	onNegative?: ModalAction;
}
