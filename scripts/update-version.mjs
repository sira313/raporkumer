import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');
const BOM = '\uFEFF';

async function updateFile(path, transform) {
	const original = await readFile(path, 'utf8');
	const updated = transform(original);
	if (updated === original) {
		return false;
	}
	await writeFile(path, updated, 'utf8');
	return true;
}

async function updateFileIfExists(path, transform) {
	try {
		return await updateFile(path, transform);
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
			return false;
		}
		throw error;
	}
}

async function main() {
	const packagePath = resolve(rootDir, 'package.json');
	const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
	const version = packageJson.version;
	if (typeof version !== 'string' || version.trim().length === 0) {
		throw new Error('Package version is not defined in package.json');
	}
	const versionTag = `v${version}`;

	const installerPath = resolve(rootDir, 'installer/raporkumer.iss');
	const installerRegex = /(#define\s+AppVersion\s+")([^"]+)(")/;

	const stagePackagePath = resolve(rootDir, 'dist/windows/stage/Rapkumer/package.json');
	const stageVersionRegex = /("version"\s*:\s*")([^"]+)(")/;

	const updatedFiles = [];

	if (
		await updateFileIfExists(installerPath, (content) =>
			content.replace(
				installerRegex,
				(_match, prefix, _oldVersion, suffix) => `${prefix}${version}${suffix}`
			)
		)
	) {
		updatedFiles.push('installer/raporkumer.iss');
	}

	if (
		await updateFileIfExists(stagePackagePath, (content) => {
			const maybeBom = content.startsWith(BOM);
			const withoutBom = maybeBom ? content.slice(BOM.length) : content;
			const trimmed = withoutBom.trimStart();
			try {
				const parsed = JSON.parse(trimmed);
				if (parsed.version === version) {
					return content;
				}
				parsed.version = version;
				const serialized = `${JSON.stringify(parsed, null, 2)}\n`;
				return maybeBom ? `${BOM}${serialized}` : serialized;
			} catch (error) {
				const replaced = withoutBom.replace(stageVersionRegex, (_match, prefix, _old, suffix) => {
					return `${prefix}${version}${suffix}`;
				});
				if (replaced !== withoutBom) {
					return maybeBom ? `${BOM}${replaced}` : replaced;
				}
				console.warn(
					`Skipping ${stagePackagePath}: failed to update version automatically. Please update manually.`,
					error
				);
				return content;
			}
		})
	) {
		updatedFiles.push('dist/windows/stage/Rapkumer/package.json');
	}

	if (updatedFiles.length === 0) {
		console.log(`No files needed updates for version ${version}`);
	} else {
		console.log(`Updated version ${versionTag} in:\n- ${updatedFiles.join('\n- ')}`);
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
