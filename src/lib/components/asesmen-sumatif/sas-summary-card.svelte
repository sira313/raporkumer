<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	interface Props {
		nilaiSas: number | null;
		formatScore: (value: number | null) => string;
		/** optional title for the card */
		title?: string;
		/** optional subtitle for the card */
		subtitle?: string;
	}

	let {
		nilaiSas,
		formatScore,
		title = 'NA Sumatif Akhir Semester',
		subtitle = 'Rata-rata dari nilai Tes dan Non Tes SAS'
	}: Props = $props();
</script>

<div role="alert" class="alert rounded-box alert-soft alert-info mt-4">
	<span class="text-2xl">
		<Icon name="info" />
	</span>
	<span>
		<p class="text-lg">{title}</p>
		<p class="text-2xl font-bold">{formatScore(nilaiSas)}</p>
		<p class="text-sm">{subtitle}</p>
	</span>
</div>
