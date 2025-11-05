<script lang="ts">
	const props = $props<{
		murid: RaporPrintData['murid'] | null;
		rombel: RaporPrintData['rombel'] | null;
		sekolah: RaporPrintData['sekolah'] | null;
		periode: RaporPrintData['periode'] | null;
		formatValue: (value: string | null | undefined) => string;
		formatUpper: (value: string | null | undefined) => string;
		class?: string;
	}>();

	let { murid, rombel, sekolah, periode, formatValue, formatUpper, class: className = '' } = props;

	const sectionClass = $derived.by(() => [className].filter(Boolean).join(' '));

	const semesterLabel = $derived.by(() => {
		const value = periode?.semester;
		if (!value) {
			return formatValue(value);
		}
		return formatValue(value.replace(/^Semester\s+/i, ''));
	});
</script>

<section class={sectionClass}>
	<table class="w-full border-collapse">
		<tbody>
			<tr>
				<td class="align-top" style="width: 110px;">Nama Murid</td>
				<td class="align-top" style="width: 0.75rem;">:</td>
				<td class="align-top font-semibold uppercase">{formatUpper(murid?.nama)}</td>
				<td class="align-top" style="width: 110px;">Kelas</td>
				<td class="align-top" style="width: 0.75rem;">:</td>
				<td class="font-semibold">{formatValue(rombel?.nama)}</td>
			</tr>
			<tr>
				<td class="align-top">NISN / NIS</td>
				<td class="align-top">:</td>
				<td class="font-semibold">{formatValue(murid?.nisn)} / {formatValue(murid?.nis)}</td>
				<td class="align-top">Fase</td>
				<td class="align-top">:</td>
				<td class="font-semibold uppercase">{formatUpper(rombel?.fase)}</td>
			</tr>
			<tr>
				<td class="align-top">Sekolah</td>
				<td class="align-top">:</td>
				<td class="align-top font-semibold uppercase">{formatUpper(sekolah?.nama)}</td>
				<td class="align-top">Semester</td>
				<td class="align-top">:</td>
				<td class="font-semibold">{semesterLabel}</td>
			</tr>
			<tr>
				<td class="align-top">Alamat</td>
				<td class="align-top">:</td>
				<td>{formatValue(sekolah?.alamat)}</td>
				<td class="align-top">Tahun Pelajaran</td>
				<td class="align-top">:</td>
				<td class="align-top font-semibold">{formatValue(periode?.tahunPelajaran)}</td>
			</tr>
		</tbody>
	</table>
</section>
