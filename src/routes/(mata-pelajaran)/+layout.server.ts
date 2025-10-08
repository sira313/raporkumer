export async function load({ parent }) {
	const data = await parent();
	return {
		daftarKelas: data.daftarKelas,
		kelasAktif: data.kelasAktif
	};
}
