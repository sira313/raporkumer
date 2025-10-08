<script lang="ts">
	import { formatValue } from './format';

	const props = $props<{
		ttd: BiodataPrintData['ttd'] | null;
		class?: string;
	}>();

	let { ttd, class: className = '' } = props;

	const footerClass = $derived.by(() =>
		['flex justify-end gap-8 text-sm', className].filter(Boolean).join(' ')
	);
</script>

<footer class={footerClass}>
	<div class="flex flex-col items-center gap-3 text-center">
		<div
			class="border-base-content flex h-[40mm] w-[30mm] flex-col items-center justify-center gap-1 border"
		>
			<span class="text-xs tracking-wide uppercase">Pas Foto</span>
			<span class="text-xs">3 x 4</span>
		</div>
	</div>
	<div class="text-left leading-relaxed">
		<p>{formatValue(ttd?.tempat)}, {formatValue(ttd?.tanggal)}</p>
		<p>Kepala Sekolah</p>
		<div class="mt-12 font-semibold tracking-wide">
			{formatValue(ttd?.kepalaSekolah)}
		</div>
		<div class="mt-1">NIP. {formatValue(ttd?.nip)}</div>
	</div>
</footer>
