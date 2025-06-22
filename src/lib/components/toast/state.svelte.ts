export const toasts = $state<Toast[]>([]);

export function toast(data: Toast) {
	toasts.push(data);
}
