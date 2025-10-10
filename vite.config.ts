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
					// Strip debugging helpers from production bundles to shrink output.
					drop: ['console', 'debugger']
				}
			: undefined
	};
});
