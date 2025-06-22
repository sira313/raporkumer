/*
Global state is just fine for adapter-static
see: 
- https://github.com/sveltejs/kit/issues/8614
- https://kit.svelte.dev/docs/state-management
*/

import { browser } from '$app/environment';

export const appName = 'Rapor Kurikulum Merdeka';

export const pageMeta = $state<PageMeta>({ title: '' });

export function setPageTitle(title?: string) {
	pageMeta.title = title || '';
}

export function setPageLogo(logo: Blob) {
	if (!logo) return;
	const url = URL.createObjectURL(logo);
	pageMeta.logoURL = url;
}

export class StorageState<T extends string | number | boolean> {
	private state = $state<T | null>(null);

	constructor(private readonly name: string) {
		if (!browser) return;
		const raw = localStorage.getItem(name);
		this.state = raw ? JSON.parse(raw) : raw;
	}

	set value(value: T) {
		if (browser) {
			const val = value == null ? null : JSON.stringify(value);
			if (!val) localStorage.removeItem(this.name);
			else localStorage.setItem(this.name, val);
		}
		this.state = value;
	}

	get value(): T | null {
		return this.state;
	}
}
