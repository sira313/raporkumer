let modalProps = $state<ModalProps | undefined>(undefined);

export const getModalProps = () => modalProps;

export function showModal(props: ModalProps) {
	modalProps = props;
}

export function hideModal() {
	modalProps = undefined;
}
