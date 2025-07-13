export async function load({ parent }) {
	const parentData = await parent();
	return {
		meta: {
			title: parentData.meta?.title || 'Rekapitulasi Nilai Akhir Murid'
		}
	};
}
