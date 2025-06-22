export const toasts = $state<Toast[]>([]);

export function toast(data: Toast | string, type?: Toast['type']) {
	if (typeof data == 'string') {
		data = { message: data, type };
	}
	toasts.push(data);
}
