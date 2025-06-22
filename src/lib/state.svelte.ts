/*
Global state is just fine for adapter-static
see: 
- https://github.com/sveltejs/kit/issues/8614
- https://kit.svelte.dev/docs/state-management
*/

import { browser } from '$app/environment';
import db from './data/db';

export const appName = 'Rapor Kumer';
export const pageMeta = $state<PageMeta>({ title: '' });

export function setPageTitle(title?: string) {
	pageMeta.title = title || '';
}

export async function loadSekolah() {
	if (!browser) return;
	const result = await db.sekolah.get(1);
	pageMeta.sekolah = result;

	if (!result?.logo?.size) return;
	const url = URL.createObjectURL(result.logo);
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
