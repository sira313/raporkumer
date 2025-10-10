interface ModalAction {
	label: string;
	icon?: IconName;
	action?: (params: { close: () => void }) => MaybePromise<void>;
}

type ModalBodyComponent = import('svelte').Component<
	Record<string, unknown>,
	Record<string, unknown>,
	string
>;

interface ModalProps {
	title?: string;
	body: string | ModalBodyComponent;
	bodyProps?: Record<string, unknown>;
	dismissible?: boolean;
	onPositive?: ModalAction;
	onNeutral?: ModalAction;
	onNegative?: ModalAction;
	onClose?: () => void;
}

interface Toast {
	id?: string;
	message: string;
	type?: 'info' | 'success' | 'warning' | 'error';
	/** if true, toast will not close automatically */
	persist?: boolean;
}
