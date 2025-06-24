/// @ts-check

import { readdir, watch, writeFile } from 'node:fs/promises';
import path from 'node:path';

const icons_dir = `./src/lib/icons`;
const watch_ctrl = new AbortController();

async function generate_types() {
	const files = await readdir(icons_dir);
	const svg_files_union = files
		.filter((f) => path.extname(f).toLocaleLowerCase() == '.svg')
		.map((t) => `'${path.parse(t).name}'\n`)
		.join('\t| ');
	const raw = `type IconName =\n\t| ${svg_files_union.trimEnd()};\n`;
	await writeFile('./src/lib/components/icon.d.ts', raw, 'utf8');
}

async function run_watcher() {
	try {
		const watcher = watch(icons_dir, { signal: watch_ctrl.signal });
		for await (const event of watcher) {
			console.log(event);
		}
	} catch (err) {
		if (err.name === 'AbortError') {
			console.log('Icon type-gen aborted gracefully.');
		} else {
			console.error('Icon type-gen error:', err);
		}
	}
}

const shutdown = () => {
	console.log('\nShutting down Icon type-gen...');
	watch_ctrl.abort();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

generate_types();
run_watcher();
