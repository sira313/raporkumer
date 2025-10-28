export const groupedUserPermissions = {
	user: {
		values: [
			['list', 'Lihat daftar pengguna'],
			['detail', 'Lihat detail pengguna'],
			['add', 'Tambah pengguna'],
			['delete', 'Hapus pengguna'],
			['suspend', 'Tangguhkan pengguna'],
			['set_permissions', 'Atur izin pengguna']
		],
		description: 'Manajemen Pengguna'
	},

	dashboard: {
		values: [['manage', 'Kelola Tindakan Cepat']],
		description: 'Dashboard'
	},
	sekolah: {
		values: [['manage', 'Kelola Data Sekolah']],
		description: 'Sekolah'
	},
	app: {
		values: [['check_update', 'Cek Pembaruan Aplikasi']],
		description: 'Aplikasi'
	},
	rapor: {
		values: [['manage', 'Kelola Data Rapor']],
		description: 'Data Rapor'
	},
	kelas: {
		values: [
			['manage', 'Kelola Data Kelas'],
			['pindah', 'Pindah dan akses kelas lain']
		],
		description: 'Data Kelas'
	}
} as const;

export const userPermissions = Object.entries(groupedUserPermissions) //
	.flatMap(([key, { values }]) => values.map((value) => <UserPermission>`${key}_${value[0]}`));

export function isAuthorizedUser(
	allowedPermissions: UserPermission[],
	user?: Pick<AuthUser, 'permissions'>
) {
	if (!user) return false;
	const userPermissions = user.permissions || [];
	return allowedPermissions.some((r) => userPermissions.includes(r));
}
