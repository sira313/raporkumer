export const toasts = $state<Toast[]>([]);

export function toast(data: Toast | string) {
	if (typeof data == 'string') {
		data = { message: data };
	}
	toasts.push(data);
}
