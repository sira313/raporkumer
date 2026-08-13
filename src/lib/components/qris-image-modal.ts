import { mount, unmount } from 'svelte';
import QrisImageOverlay from './qris-image-overlay.svelte';

export function openQrisImage(): void {
	const target = document.body;
	let detach = () => {};
	const overlay = mount(QrisImageOverlay, {
		target,
		props: {
			onclose: () => detach()
		}
	});
	detach = () => unmount(overlay);
}
