<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import type { IndikatorCategory } from './utils';

	interface Props {
		nilaiIndikator: number | null;
		indikatorCategory: IndikatorCategory | null;
		indikatorNama: string;
		formatScore: (value: number | null) => string;
		tpCount?: number;
	}

	let {
		nilaiIndikator,
		indikatorCategory,
		indikatorNama,
		formatScore,
		tpCount = 0
	}: Props = $props();

	const fallbackClass = 'alert-soft alert-warning';
</script>

<div
	class={`alert rounded-box ${indikatorCategory ? indikatorCategory.className : fallbackClass} mt-4`}
>
	<span class="text-2xl">
		<Icon name={indikatorCategory ? indikatorCategory.icon : 'alert'} />
	</span>
	<span>
		<p class="text-lg font-semibold">{indikatorNama}</p>
		<p class="text-2xl font-bold">
			{indikatorCategory?.huruf || '–'} ({formatScore(nilaiIndikator)})
			{#if indikatorCategory}
				— {indikatorCategory.label}
			{/if}
		</p>
		<p class="text-sm">
			{#if tpCount > 0}
				Rata-rata dari {tpCount} Tujuan Pembelajaran
			{:else}
				Belum ada nilai tujuan pembelajaran
			{/if}
		</p>
		{#if indikatorCategory}
			<p class="text-sm">{indikatorCategory.description}</p>
		{:else}
			<p class="text-sm font-semibold">— Lengkapi penilaian untuk menghitung nilai indikator</p>
		{/if}
	</span>
</div>
