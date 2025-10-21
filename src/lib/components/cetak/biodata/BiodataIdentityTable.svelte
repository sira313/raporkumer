<script lang="ts">
	import { combinePlaceDate, formatMuridAlamat, formatUpper, formatValue } from './format';

	const props = $props<{
		murid: BiodataPrintData['murid'] | null;
		orangTua: BiodataPrintData['orangTua'] | null;
		wali: BiodataPrintData['wali'] | null;
		class?: string;
	}>();

	let { murid, orangTua, wali, class: className = '' } = props;

	const sectionClass = $derived.by(() =>
		['text-base leading-relaxed', className].filter(Boolean).join(' ')
	);

	const orangTuaNamaFields = $derived.by(() => [
		{ label: 'Ayah', value: formatUpper(orangTua?.ayah?.nama) },
		{ label: 'Ibu', value: formatUpper(orangTua?.ibu?.nama) }
	]);

	const orangTuaJobFields = $derived.by(() => [
		{ label: 'Ayah', value: formatValue(orangTua?.ayah?.pekerjaan) },
		{ label: 'Ibu', value: formatValue(orangTua?.ibu?.pekerjaan) }
	]);

	const orangTuaAlamatFields = $derived.by(() => [
		{ label: 'Jalan', value: formatValue(orangTua?.alamat?.jalan) },
		{ label: 'Kelurahan/Desa', value: formatValue(orangTua?.alamat?.kelurahan) },
		{ label: 'Kecamatan', value: formatValue(orangTua?.alamat?.kecamatan) },
		{ label: 'Kabupaten/Kota', value: formatValue(orangTua?.alamat?.kabupaten) },
		{ label: 'Provinsi', value: formatValue(orangTua?.alamat?.provinsi, '-') }
	]);

	const waliFields = $derived.by(() => [
		{ label: 'Nama Wali', value: formatUpper(wali?.nama, '-') },
		{ label: 'Pekerjaan Wali', value: formatValue(wali?.pekerjaan, '-') },
		{ label: 'Alamat Wali', value: formatValue(wali?.alamat, '-') }
	]);

	const muridAlamat = $derived.by(() => formatMuridAlamat(murid?.alamat));
	const pendidikanSebelumnya = $derived.by(() => {
		const value = formatValue(murid?.pendidikanSebelumnya);
		if (value === '—') return value;
		return value.trim().toLowerCase() === 'belum diisi' ? '-' : value;
	});
</script>

<section class={sectionClass}>
	<table class="w-full border-collapse text-[13px]">
		<tbody>
			<tr>
				<td class="align-top" style="width: 1.75rem;">1.</td>
				<td class="align-top" style="width: 220px;">Nama Murid</td>
				<td class="align-top" style="width: 0.75rem;">:</td>
				<td class="font-semibold uppercase">{formatUpper(murid?.nama)}</td>
			</tr>
			<tr>
				<td class="align-top">2.</td>
				<td class="align-top">NIS / NISN</td>
				<td class="align-top">:</td>
				<td class="font-semibold">{formatValue(murid?.nis)} / {formatValue(murid?.nisn)}</td>
			</tr>
			<tr>
				<td class="align-top">3.</td>
				<td class="align-top">Tempat / Tanggal Lahir</td>
				<td class="align-top">:</td>
				<td class="font-semibold">{combinePlaceDate(murid?.tempatLahir, murid?.tanggalLahir)}</td>
			</tr>
			<tr>
				<td class="align-top">4.</td>
				<td class="align-top">Jenis Kelamin</td>
				<td class="align-top">:</td>
				<td class="font-semibold">{formatValue(murid?.jenisKelamin)}</td>
			</tr>
			<tr>
				<td class="align-top">5.</td>
				<td class="align-top">Agama</td>
				<td class="align-top">:</td>
				<td class="font-semibold">{formatValue(murid?.agama)}</td>
			</tr>
			<tr>
				<td class="align-top">6.</td>
				<td class="align-top">Pendidikan Sebelumnya</td>
				<td class="align-top">:</td>
				<td class="font-semibold">{pendidikanSebelumnya}</td>
			</tr>
			<tr>
				<td class="align-top">7.</td>
				<td class="align-top">Alamat Murid</td>
				<td class="align-top">:</td>
				<td class="font-semibold">{muridAlamat}</td>
			</tr>
			<tr>
				<td class="align-top">8.</td>
				<td class="align-top" style="width: 220px;">Nama Orang Tua</td>
				<td class="align-top" style="width: 0.75rem;"></td>
				<td></td>
			</tr>
			{#each orangTuaNamaFields as field, index (index)}
				<tr>
					<td></td>
					<td class="align-top" style="width: 220px;">{field.label}</td>
					<td class="align-top" style="width: 0.75rem;">:</td>
					<td class="font-semibold uppercase">{field.value}</td>
				</tr>
			{/each}
			<tr>
				<td class="align-top">9.</td>
				<td class="align-top" style="width: 220px;">Pekerjaan Orang Tua</td>
				<td class="align-top" style="width: 0.75rem;"></td>
				<td></td>
			</tr>
			{#each orangTuaJobFields as field, index (index)}
				<tr>
					<td></td>
					<td class="align-top" style="width: 220px;">{field.label}</td>
					<td class="align-top" style="width: 0.75rem;">:</td>
					<td class="font-semibold">{field.value}</td>
				</tr>
			{/each}
			<tr>
				<td class="align-top">10.</td>
				<td class="align-top" style="width: 220px;">Alamat Orang Tua</td>
				<td class="align-top" style="width: 0.75rem;"></td>
				<td></td>
			</tr>
			{#each orangTuaAlamatFields as field, index (index)}
				<tr>
					<td></td>
					<td class="align-top" style="width: 220px;">{field.label}</td>
					<td class="align-top" style="width: 0.75rem;">:</td>
					<td class="font-semibold">{field.value}</td>
				</tr>
			{/each}
			<tr>
				<td class="align-top">11.</td>
				<td class="align-top" style="width: 220px;">Wali Murid</td>
				<td class="align-top" style="width: 0.75rem;"></td>
				<td></td>
			</tr>
			{#each waliFields as field, index (index)}
				<tr>
					<td></td>
					<td class="align-top" style="width: 220px;">{field.label}</td>
					<td class="align-top" style="width: 0.75rem;">:</td>
					<td class="font-semibold" class:uppercase={field.label === 'Nama Wali'}>
						{field.value}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</section>
