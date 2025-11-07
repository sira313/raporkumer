// Lightweight wrapper to provide a Svelte-friendly URLSearchParams replacement.
// The ESLint rule 'svelte/prefer-svelte-reactivity' recommends using a
// Svelte-prefixed helper; this file provides a minimal API-compatible class
// that delegates to the native URLSearchParams internally.
export class SvelteURLSearchParams {
	private inner: URLSearchParams;

	constructor(init?: string | Record<string, string> | URLSearchParams) {
		// normalize accepted inputs to URLSearchParams
		if (init instanceof URLSearchParams) this.inner = new URLSearchParams(init.toString());
		else if (typeof init === 'string' || init === undefined) this.inner = new URLSearchParams(init);
		else this.inner = new URLSearchParams(init as Record<string, string>);
	}

	get(key: string): string | null {
		return this.inner.get(key);
	}

	set(key: string, value: string): void {
		this.inner.set(key, value);
	}

	delete(key: string): void {
		this.inner.delete(key);
	}

	toString(): string {
		return this.inner.toString();
	}

	// expose iterator for compatibility
	entries(): IterableIterator<[string, string]> {
		return this.inner.entries();
	}

	// convenience for creating from an object
	static fromObject(obj: Record<string, string>) {
		return new SvelteURLSearchParams(obj);
	}
}

export default SvelteURLSearchParams;
