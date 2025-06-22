export const appMenuItems: MenuItem[] = [
	{
		title: 'Informasi Umum',
		subMenu: [
			{
				title: 'Data Sekolah',
				path: '/sekolah'
			},
			{
				title: 'Data Siswa',
				path: '/siswa'
			},
			{
				title: 'Data Kelas',
				path: '/kelas'
			}
		]
	},
	{
		title: 'Mata Pelajaran',
		subMenu: [
			{
				title: 'Daftar Mata Pelajaran',
				path: '/mata-pelajaran'
			},
			{
				title: 'Ekstrakurikuler',
				path: '/ekstrakurikuler'
			}
		]
	},
	{
		title: 'Input Nilai',
		subMenu: [
			{
				title: 'Kurikulum Merdeka',
				subMenu: [
					{
						title: 'Tujuan Pembelajaran',
						path: '/tujuan-pembelajaran'
					},
					{
						title: 'Lingkup Materi',
						path: '/lingkup-materi'
					},
					{
						title: 'Asesmen Formatif',
						path: '/asesmen-formatif'
					},
					{
						title: 'Asesmen Sumatif',
						path: '/asesmen-sumatif'
					},
					{
						title: 'Nilai Akhir',
						path: '/nilai-akhir'
					}
				]
			},
			{
				title: 'Absen',
				path: '/absen'
			},
			{
				title: 'Nilai Ekstrakurikuler',
				path: '/nilai-ekstrakurikuler'
			}
		]
	},
	{
		title: 'Cetak Dokumen',
		subMenu: [
			{
				title: 'Cetak Rapor',
				path: '/cetak/rapor'
			},
			{
				title: 'Cetak Cover',
				path: '/cetak/cover'
			},
			{
				title: 'Cetak Biodata',
				path: '/cetak/biodata'
			}
		]
	}
];

export function findTitleByPath(path: string, items = appMenuItems): string | undefined {
	path = path.replace(/\/+$/, '');
	for (const item of items) {
		if (item.path === path) {
			return item.title;
		}
		if (item.subMenu) {
			const found = findTitleByPath(path, item.subMenu);
			if (found) return found;
		}
	}
	return undefined;
}

export function unflatten<T = Record<string, unknown>>(obj: Record<string, unknown>): T {
	const result: Record<string, unknown> = {};
	for (const key in obj) {
		const parts = key.split('.');
		let current = result;
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (i === parts.length - 1) {
				current[part] = obj[key];
			} else {
				if (!(part in current)) {
					current[part] = {};
				}
				current = current[part] as typeof current;
			}
		}
	}
	return result as T;
}

export function flatten<T = Record<string, unknown>>(obj: T, prefix = ''): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const key in obj) {
		if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
		const value = obj[key];
		const prefixedKey = prefix ? `${prefix}.${key}` : key;
		if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			Object.assign(result, flatten(value as Record<string, unknown>, prefixedKey));
		} else {
			result[prefixedKey] = value;
		}
	}
	return result;
}

export function populateForm<T = Record<string, unknown>>(form: HTMLFormElement, data: T) {
	for (const key in data) {
		const field = form.elements.namedItem(key);
		if (!field) continue;
		const value = data[key];

		if (field instanceof HTMLInputElement) {
			if (field.type === 'checkbox') {
				field.checked = !!value;
			} else if (field.type === 'radio') {
				const radios = form.querySelectorAll<HTMLInputElement>(`input[name="${key}"]`);
				radios.forEach((radio) => {
					radio.checked = radio.value === value;
				});
			} else if (field.type === 'file') {
				// Can't set value programmatically for security reasons
				continue;
			} else {
				field.value = value as typeof field.value;
			}
		} else if (field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
			field.value = value as typeof field.value;
		}
	}
}
