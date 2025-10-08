type NullableString = string | null | undefined;

type BiodataMuridAddress = {
	jalan?: NullableString;
	kelurahan?: NullableString;
	kecamatan?: NullableString;
	kabupaten?: NullableString;
	provinsi?: NullableString;
};

type BiodataMuridLike = {
	nama?: NullableString;
	alamat?: BiodataMuridAddress | null;
};

export function formatValue(value: NullableString, fallback = '—'): string {
	if (value === null || value === undefined) return fallback;
	const trimmed = value.trim();
	return trimmed.length ? trimmed : fallback;
}

export function formatUpper(value: NullableString, fallback = '—'): string {
	const formatted = formatValue(value, fallback);
	return formatted === fallback ? fallback : formatted.toUpperCase();
}

export function combinePlaceDate(tempat: NullableString, tanggal: NullableString): string {
	const place = formatValue(tempat);
	const date = formatValue(tanggal);
	if (place === '—' && date === '—') return '—';
	if (place === '—') return date;
	if (date === '—') return place;
	return `${place}, ${date}`;
}

export function formatMuridAlamat(alamat: BiodataMuridLike['alamat']): string {
	if (!alamat) return '—';

	const normalize = (value: NullableString): string | null => {
		const formatted = formatValue(value);
		return formatted === '—' ? null : formatted.trim();
	};

	const toTitleCase = (value: string): string =>
		value
			.toLowerCase()
			.split(/\s+/u)
			.map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
			.join(' ')
			.trim();

	const jalan = normalize(alamat.jalan);
	const kelurahan = normalize(alamat.kelurahan);
	const kecamatanRaw = normalize(alamat.kecamatan);
	const kabupatenRaw = normalize(alamat.kabupaten);
	const provinsiRaw = normalize(alamat.provinsi);

	const parts: string[] = [];

	if (jalan) parts.push(jalan);
	if (kelurahan) parts.push(kelurahan);

	if (kecamatanRaw) {
		const stripped = kecamatanRaw.replace(/^(kec(?:\.|amatan)?\s*)+/iu, '').trim();
		if (stripped) {
			parts.push(`Kec. ${toTitleCase(stripped)}`);
		}
	}

	let kabupatenDisplay: string | null = null;
	if (kabupatenRaw) {
		const base = kabupatenRaw.trim();
		const lower = base.toLowerCase();
		if (lower.startsWith('kota')) {
			const strippedKota = base.replace(/^(kota\s*)+/iu, '').trim();
			if (strippedKota) {
				kabupatenDisplay = `Kota ${toTitleCase(strippedKota)}`;
			}
		} else {
			const strippedKab = base.replace(/^(kab(?:\.|upaten)?\s*)+/iu, '').trim();
			if (strippedKab) {
				kabupatenDisplay = `Kabupaten ${toTitleCase(strippedKab)}`;
			}
		}
	} else if (provinsiRaw) {
		const stripped = provinsiRaw.replace(/^(prov(?:\.|insi)?\s*)+/iu, '').trim();
		if (stripped) {
			kabupatenDisplay = `Provinsi ${toTitleCase(stripped)}`;
		}
	}

	if (kabupatenDisplay) {
		parts.push(kabupatenDisplay);
	}

	if (!parts.length) return '—';
	return parts.join(', ');
}
