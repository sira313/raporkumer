<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	interface Props {
		nilaiSas: number | null;
		formatScore: (value: number | null) => string;
	}

	let { nilaiSas, formatScore }: Props = $props();
</script>

<div role="alert" class="alert rounded-box alert-soft alert-info mt-4">
	<span class="text-2xl">
		<Icon name="info" />
	</span>
	<span>
		<p class="text-lg">NA Sumatif Akhir Semester</p>
		<p class="text-2xl font-bold">{formatScore(nilaiSas)}</p>
		<p class="text-sm">Rata-rata dari nilai Tes dan Non Tes SAS</p>
	</span>
</div>
