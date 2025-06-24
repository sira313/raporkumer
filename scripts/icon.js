import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/*
This script only running on pre-dev fro now, if there is
new icon file, we need to rerun `pnpm dev` command since
it's not detect file icon change. Need write Vite plugin
for this job. Skip for now.
*/

const files = await readdir('./src/lib/icons');
const svg_files_union = files
	.filter((f) => path.extname(f).toLocaleLowerCase() == '.svg')
	.map((t) => `'${path.parse(t).name}'\n`)
	.join('\t| ');
const raw = `type IconName =\n\t| ${svg_files_union.trimEnd()};\n`;

await writeFile('./src/lib/components/icon.d.ts', raw, 'utf8');
