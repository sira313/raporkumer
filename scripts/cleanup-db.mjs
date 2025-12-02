import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');

try {
	const files = fs.readdirSync(dataDir);
	const sqliteFiles = files.filter((file) => file.endsWith('.sqlite3'));

	if (sqliteFiles.length === 0) {
		console.log('✓ No SQLite files to clean up');
		process.exit(0);
	}

	sqliteFiles.forEach((file) => {
		const filePath = path.join(dataDir, file);
		try {
			fs.unlinkSync(filePath);
			console.log(`✓ Removed: ${file}`);
		} catch (err) {
			console.error(`✗ Failed to remove ${file}:`, err.message);
		}
	});

	console.log(`✓ Cleanup complete: ${sqliteFiles.length} file(s) removed`);
	process.exit(0);
} catch (err) {
	console.error('✗ Cleanup failed:', err.message);
	process.exit(1);
}
