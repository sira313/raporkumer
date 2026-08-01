import db from '$lib/server/db/index.js';
import { tableAuthUser } from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { authority } from '../utils.server.js';
import { defaultPermissionsByType } from '../permissions';

const u = tableAuthUser;

export async function load({ params }) {
	authority('user_detail');

	const [userDetail] = await db
		.select({
			id: u.id,
			username: u.username,
			type: u.type,
			permissions: u.permissions,
			createdAt: u.createdAt
		})
		.from(u)
		.where(eq(u.id, +params.id));
	if (!userDetail) error(404, `Data pengguna tidak ditemukan`);

	return { meta: { title: 'Pengaturan Izin Pengguna' }, userDetail };
}

export const actions = {
	set_permissions: async ({ params, request }) => {
		authority('user_set_permissions');

		const permissions = <UserPermission[]>Array.from((await request.formData()).keys());
		await db.update(u).set({ permissions }).where(eq(u.id, +params.id));
		// Return the updated permissions so the client can update UI without a full reload
		return { message: `Izin pengguna berhasil diperbarui`, permissions };
	},
	reset_permissions: async ({ params }) => {
		authority('user_set_permissions');

		const [target] = await db
			.select({ id: u.id, type: u.type })
			.from(u)
			.where(eq(u.id, +params.id));
		if (!target) error(404, `Data pengguna tidak ditemukan`);

		// Admin tidak punya default — izinnya tidak relevan (selalu full akses).
		// Untuk non-admin, kembalikan ke set default sesuai tipe akun.
		const permissions = defaultPermissionsByType[target.type] ?? [];
		await db.update(u).set({ permissions }).where(eq(u.id, target.id));
		return {
			message: `Izin pengguna direset ke default (${target.type})`,
			permissions
		};
	}
};
