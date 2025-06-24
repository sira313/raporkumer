import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const files = await readdir('./src/lib/icons');
const svg_files_union = files
	.filter((f) => path.extname(f).toLocaleLowerCase() == '.svg')
	.map((t) => `'${path.parse(t).name}'\n`)
	.join('\t| ');
const raw = `type IconName =\n\t| ${svg_files_union.trimEnd()};\n`;

await writeFile('./src/lib/components/icon.d.ts', raw, 'utf8');
