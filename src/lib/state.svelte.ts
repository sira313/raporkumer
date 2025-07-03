import { browser } from '$app/environment';

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
