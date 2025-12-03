import { redirect } from '@sveltejs/kit';

export async function load({ parent }) {
	const { kelasAktif } = await parent();

	if (!kelasAktif?.id) {
		throw redirect(303, `/forbidden?required=kelas_id`);
	}

	return {
		meta: { title: 'Daftar Nilai Keasramaan' }
	};
}
