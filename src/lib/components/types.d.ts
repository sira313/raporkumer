interface ModalAction {
	label: string;
	icon?: IconName;
	action?: (params: { close: () => void }) => MaybePromise<void>;
}

interface ModalProps {
	title?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	body: string | import('svelte').Component<any, any, any>;
	bodyProps?: Record<string, unknown>;
	dismissible?: boolean;
	onPositive?: ModalAction;
	onNeutral?: ModalAction;
	onNegative?: ModalAction;
}

interface Toast {
	id?: string;
	message: string;
	type?: 'info' | 'success' | 'warning' | 'error';
	/** if true, toast will not close automatically */
	persist?: boolean;
}
