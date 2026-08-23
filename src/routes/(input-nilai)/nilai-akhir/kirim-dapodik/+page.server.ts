import { fail } from '@sveltejs/kit';
import { getDapodikSettings, runDapodikKirim, type DapodikKirimMode } from '$lib/server/dapodik';
import { authority } from '../../../pengguna/utils.server';

export async function load({ locals, parent }) {
	authority('administrasi_rekap_nilai');

	const sekolahId = locals.sekolah?.id ?? null;
	const settings = sekolahId ? await getDapodikSettings(sekolahId) : null;
	const { kelasAktif } = await parent();

	return {
		meta: { title: 'Kirim Nilai ke Dapodik' },
		settings,
		npsn: settings?.npsn || locals.sekolah?.npsn || '',
		kelasId: kelasAktif?.id ?? null,
		kelasNama: kelasAktif?.nama ?? null
	};
}

const MODES: DapodikKirimMode[] = ['tes-koneksi', 'kirim-matev', 'kirim-nilai'];

export const actions = {
	async kirim({ request, locals }) {
		authority('administrasi_rekap_nilai');

		const formData = await request.formData();
		const mode = ((formData.get('mode') as string | null) ?? '').trim();
		if (!MODES.includes(mode as DapodikKirimMode)) {
			return fail(400, { fail: 'Pilih salah satu mode pengiriman.' });
		}
		if (mode !== 'tes-koneksi' && !Number(formData.get('kelas_id'))) {
			return fail(400, { fail: 'Pilih kelas aktif terlebih dahulu.' });
		}

		try {
			const result = await runDapodikKirim({
				sekolahId: locals.sekolah?.id ?? null,
				mode: mode as DapodikKirimMode,
				urlInput: ((formData.get('url') as string | null) ?? '').trim() || null,
				tokenInput: ((formData.get('token') as string | null) ?? '').trim() || null,
				npsn:
					((formData.get('npsn') as string | null) ?? '').trim() ||
					locals.sekolah?.npsn?.trim() ||
					null,
				kelasId: Number(formData.get('kelas_id')) || null,
				updaterCandidates: [locals.sekolah?.email ?? '', locals.user?.username ?? '']
			});
			return { message: result.message, sections: result.sections };
		} catch (e) {
			console.error('[dapodik] kirim nilai gagal:', e);
			return fail(502, { fail: (e as Error).message || 'Kirim nilai ke Dapodik gagal.' });
		}
	}
};
