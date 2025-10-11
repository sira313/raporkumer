import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [mdsvex({ extensions: ['.md'] }), vitePreprocess()],
	kit: {
		adapter: adapter(),
		csrf: {
			// Disable the built-in same-origin guard and enforce a custom, runtime-aware check via hooks.server.ts
			checkOrigin: false
		}
	},
	extensions: ['.svelte', '.md']
};

export default config;
