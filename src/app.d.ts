// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			sekolah?: Sekolah;
		}
		interface PageData {
			meta: PageMeta;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
