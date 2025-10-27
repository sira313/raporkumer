import db from '$lib/server/db/index.js';
import { tableAuthUser } from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { authority } from '../utils.server.js';

const u = tableAuthUser;

export async function load({ params }) {
	authority('user_detail');

	const [userDetail] = await db
		.select({ id: u.id, username: u.username, permissions: u.permissions, createdAt: u.createdAt })
		.from(u)
		.where(eq(u.id, +params.id));
	if (!userDetail) error(404, `Data pengguna tidak ditemukan`);

	return { meta: { title: `Pengguna: "${userDetail.username}"` }, userDetail };
}

export const actions = {
	set_permissions: async ({ params, request }) => {
		authority('user_set_permissions');

		const permissions = <UserPermission[]>Array.from((await request.formData()).keys());
		await db.update(u).set({ permissions }).where(eq(u.id, +params.id));
		return { message: `Izin pengguna berhasil diperbarui` };
	}
};
