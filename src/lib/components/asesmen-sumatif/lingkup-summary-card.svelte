<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import type { LingkupSummary } from './types';

	interface Props {
		naSumatifLingkup: number | null;
		lingkupSummaries: LingkupSummary[];
		totalBobot: number;
		formatScore: (value: number | null) => string;
	}

	let { naSumatifLingkup, lingkupSummaries, totalBobot, formatScore }: Props = $props();
</script>

<div role="alert" class="alert rounded-box alert-soft alert-info mt-4">
	<span class="text-2xl">
		<Icon name="info" />
	</span>
	<span class="w-full">
		<p class="text-lg">NA Sumatif Lingkup Materi</p>
		<p class="text-2xl font-bold">{formatScore(naSumatifLingkup)}</p>
		<p class="text-sm">
			Rata-rata dari {lingkupSummaries.length} lingkup materi
			{#if totalBobot > 0}
				(dengan total bobot {totalBobot}%)
			{/if}
		</p>
		{#if lingkupSummaries.length}
			<ul class="text-base-content/70 mt-2 space-y-1 text-xs">
				{#each lingkupSummaries as summary (summary.lingkupMateri)}
					<li>
						<strong>{summary.lingkupMateri}</strong> — {formatScore(summary.rataRata)}
						{#if summary.bobot != null}
							<span class="ml-1">(Bobot {formatScore(summary.bobot)}%)</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</span>
</div>
