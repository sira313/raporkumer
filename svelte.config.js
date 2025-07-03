import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [mdsvex({ extensions: ['.md'] }), vitePreprocess()],
	kit: { adapter: adapter() },
	extensions: ['.svelte', '.md']
};

export default config;
