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

export function formatValue(value: NullableString): string {
	if (value === null || value === undefined) return '—';
	const trimmed = value.trim();
	return trimmed.length ? trimmed : '—';
}

export function formatUpper(value: NullableString): string {
	const formatted = formatValue(value);
	return formatted === '—' ? formatted : formatted.toUpperCase();
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
	const jalan = formatValue(alamat.jalan);
	const kelurahan = formatValue(alamat.kelurahan);
	const kecamatan = formatValue(alamat.kecamatan);
	const kabupaten = formatValue(alamat.kabupaten);
	const provinsi = formatValue(alamat.provinsi);
	const allMissing = [jalan, kelurahan, kecamatan, kabupaten, provinsi].every(
		(segment) => segment === '—'
	);
	if (allMissing) return '—';
	return `${jalan}, ${kelurahan}, Kec. ${kecamatan}, Kab. ${kabupaten}, ${provinsi}`;
}
