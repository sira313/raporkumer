import tailwindcss from '@tailwindcss/vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
	const isProd = mode === 'production';

	return {
		plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
		build: {
			minify: isProd ? 'esbuild' : false,
			cssMinify: isProd,
			rollupOptions: {
				output: {
					compact: isProd
				}
			}
		},
		esbuild: isProd
			? {
				// Strip debugger statements from production bundles; keep console for server logging.
				drop: ['debugger']
			}
			: undefined
	};
});
