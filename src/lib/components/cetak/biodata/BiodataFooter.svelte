<script lang="ts">
	import { formatValue } from './format';

	const props = $props<{
		ttd: BiodataPrintData['ttd'] | null;
		murid?: BiodataPrintData['murid'] | null;
		class?: string;
	}>();

	let { ttd, murid = null, class: className = '' } = props;

	const footerClass = $derived.by(() =>
		['flex justify-end gap-8 text-sm', className].filter(Boolean).join(' ')
	);

	const photoSrc = $derived.by(() => {
		const m = murid;
		if (!m || !m.foto) return null;
		const f = m.foto as string;
		if (!f) return null;
		if (f.startsWith('http') || f.startsWith('data:') || f.startsWith('/')) return f;
		return `/api/murid-photo/${m.id}?v=${encodeURIComponent(f)}`;
	});
</script>

<footer class={footerClass}>
	<div class="flex flex-col items-center gap-3 text-center">
		<div
			class="border-base-content flex h-[40mm] w-[30mm] flex-col items-center justify-center gap-1 overflow-hidden border"
		>
			{#if photoSrc}
				<img src={photoSrc} alt="Pas Foto" class="h-full w-full object-cover" />
			{:else}
				<div class="flex h-full w-full flex-col items-center justify-center">
					<span class="text-xs tracking-wide uppercase">Pas Foto</span>
					<span class="text-xs">3 x 4</span>
				</div>
			{/if}
		</div>
	</div>
	<div class="text-left leading-relaxed">
		<p>{formatValue(ttd?.tempat)}, {formatValue(ttd?.tanggal)}</p>
		<p>Kepala Sekolah</p>
		<div class="mt-12 font-semibold tracking-wide">
			{formatValue(ttd?.kepalaSekolah)}
		</div>
		<div class="mt-1">{formatValue(ttd?.nip)}</div>
	</div>
</footer>
