import db from '../src/lib/server/db/index.js';
import { tableAuthUser, tableAuthUserMataPelajaran } from '../src/lib/server/db/schema.js';
import { inArray, sql } from 'drizzle-orm';

console.log('[fix-multi-mapel-users] Starting...');

try {
	// Find all users with 2+ assigned mapel
	const userMapelCounts = await db
		.select({
			authUserId: tableAuthUserMataPelajaran.authUserId,
			count: sql < number > `count(*)`
		})
		.from(tableAuthUserMataPelajaran)
		.groupBy(tableAuthUserMataPelajaran.authUserId)
		.having(sql < boolean > `count(*) > 1`);

	console.log('[fix-multi-mapel-users] Found', userMapelCounts.length, 'users with 2+ mapel');

	if (userMapelCounts.length === 0) {
		console.log('[fix-multi-mapel-users] No users to update');
		process.exit(0);
	}

	// Update these users to have mataPelajaranId = null
	const userIds = userMapelCounts.map((u) => u.authUserId);
	const result = await db
		.update(tableAuthUser)
		.set({ mataPelajaranId: null })
		.where(inArray(tableAuthUser.id, userIds));

	console.log('[fix-multi-mapel-users] Updated', result.rowsAffected, 'users');

	// Verify
	const updated = await db.query.tableAuthUser.findMany({
		where: inArray(tableAuthUser.id, userIds),
		columns: { id: true, username: true, mataPelajaranId: true }
	});

	console.log('[fix-multi-mapel-users] Verification:');
	updated.forEach((u) => {
		console.log(`  User ${u.id} (${u.username}): mataPelajaranId = ${u.mataPelajaranId}`);
	});

	console.log('[fix-multi-mapel-users] Done!');
} catch (err) {
	console.error('[fix-multi-mapel-users] Error:', err);
	process.exit(1);
}
