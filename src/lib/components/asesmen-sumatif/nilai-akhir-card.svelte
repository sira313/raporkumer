<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import type { NilaiAkhirCategory } from './types';

	interface Props {
		nilaiAkhir: number | null;
		nilaiAkhirCategory: NilaiAkhirCategory | null;
		kkm: number;
		formatScore: (value: number | null) => string;
	}

	let { nilaiAkhir, nilaiAkhirCategory, kkm, formatScore }: Props = $props();

	const fallbackClass = 'alert-soft alert-warning';
</script>

<div
	class={`alert rounded-box ${nilaiAkhirCategory ? nilaiAkhirCategory.className : fallbackClass} mt-6`}
>
	<span class="text-2xl">
		<Icon name={nilaiAkhirCategory ? nilaiAkhirCategory.icon : 'alert'} />
	</span>
	<span>
		<p class="text-lg">Nilai Akhir</p>
		<p class="text-2xl font-bold">{formatScore(nilaiAkhir)}</p>
		<p class="text-sm">Rata-rata dari NA Sumatif Lingkup Materi dan NA Sumatif Akhir Semester</p>
		<p class="text-sm font-semibold">
			KKM {kkm}
			{#if nilaiAkhir == null}
				— Lengkapi penilaian untuk menghitung nilai akhir
			{:else}
				— {nilaiAkhirCategory?.label}
			{/if}
		</p>
		{#if nilaiAkhirCategory}
			<p class="text-sm">{nilaiAkhirCategory.description}</p>
		{/if}
	</span>
</div>
