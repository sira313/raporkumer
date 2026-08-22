import { fail } from '@sveltejs/kit';
import { getDapodikSettings, runDapodikSync, type DapodikMode } from '$lib/server/dapodik';
import { cookieNames } from '$lib/utils';
import { authority } from '../../../../pengguna/utils.server';

export async function load({ locals }) {
	authority('informasi_umum_sekolah');

	const sekolahId = locals.sekolah?.id ?? null;
	const settings = sekolahId ? await getDapodikSettings(sekolahId) : null;

	return {
		meta: { title: 'Sinkronisasi Dapodik' },
		settings,
		// NPSN tersimpan dari sinkronisasi sebelumnya menang dibanding data sekolah.
		npsn: settings?.npsn || locals.sekolah?.npsn || ''
	};
}

const MODES: DapodikMode[] = ['tes-koneksi', 'semester', 'semua'];

export const actions = {
	async sync({ request, locals, cookies }) {
		authority('informasi_umum_sekolah');

		const formData = await request.formData();
		const mode = ((formData.get('mode') as string | null) ?? '').trim();
		if (!MODES.includes(mode as DapodikMode)) {
			return fail(400, { fail: 'Pilih salah satu mode sinkronisasi.' });
		}

		const urlInput = ((formData.get('url') as string | null) ?? '').trim() || null;
		const tokenInput = ((formData.get('token') as string | null) ?? '').trim() || null;
		const npsn =
			((formData.get('npsn') as string | null) ?? '').trim() ||
			locals.sekolah?.npsn?.trim() ||
			null;
		if (!npsn) {
			return fail(400, { fail: 'NPSN wajib diisi.' });
		}

		try {
			const result = await runDapodikSync({
				sekolahId: locals.sekolah?.id ?? null,
				mode: mode as DapodikMode,
				urlInput,
				tokenInput,
				npsn
			});

			// Sekolah baru dibuat dari Dapodik pada mode init — jadikan sekolah aktif.
			if (!locals.sekolah && result.sekolahId) {
				cookies.set(cookieNames.ACTIVE_SEKOLAH_ID, String(result.sekolahId), {
					path: '/',
					secure: locals.requestIsSecure ?? false
				});
			}

			return { message: result.message, sections: result.sections };
		} catch (e) {
			console.error('[dapodik] sinkronisasi gagal:', e);
			return fail(502, { fail: (e as Error).message || 'Sinkronisasi Dapodik gagal.' });
		}
	}
};
