import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [mdsvex({ extensions: ['.md'] }), vitePreprocess()],
	kit: {
		adapter: adapter(),
		// NOTE: `kit.csrf.checkOrigin` was deprecated in favour of the
		// `csrf.trustedOrigins` config. We intentionally disable the built-in
		// same-origin guard so the runtime-aware check in `src/hooks.server.ts`
		// can run. Providing a function that returns true for any origin
		// effectively disables the built-in guard (equivalent to
		// `checkOrigin: false`).
		// Disable built-in same-origin guard (preserve previous behavior).
		csrf: {
			// allow all origins so SvelteKit's built-in check doesn't block requests
			// and our custom `csrfGuard` in `hooks.server.ts` can enforce policy.
			// NOTE: SvelteKit expects an array; using ['*'] disables the built-in
			// origin check (equivalent to checkOrigin: false).
			trustedOrigins: ['*']
		}
	},

	extensions: ['.svelte', '.md']
};

export default config;
