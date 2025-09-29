// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			sekolah?: Omit<Sekolah, 'logo'>;
			sekolahDirty?: boolean;
		}
		interface PageData {
			meta: PageMeta;
			sekolah?: Omit<Sekolah, 'logo'>;
			daftarKelas?: Array<
				Pick<Kelas, 'id' | 'nama' | 'fase'> & { waliKelas?: Pick<Pegawai, 'id' | 'nama'> | null }
			>;
			kelasAktif?: (Pick<Kelas, 'id' | 'nama' | 'fase'> & {
				waliKelas?: Pick<Pegawai, 'id' | 'nama'> | null;
			}) | null;
		}
		interface PageState {
			modal: {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				data: any;
				name: string;
			};
		}
		// interface Platform {}
	}
}

export {};
