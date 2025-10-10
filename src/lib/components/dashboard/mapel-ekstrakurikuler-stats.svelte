<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	type MapelStat = {
		total: number;
		wajib: number;
		mulok: number;
		lainnya: number;
	};

	type EkstrakurikulerStat = {
		total: number;
	};

	let { mapel, ekstrakurikuler } = $props<{
		mapel: MapelStat;
		ekstrakurikuler: EkstrakurikulerStat;
	}>();
</script>

<div class="stats stats-vertical lg:stats-horizontal rounded-box bg-base-100 w-full shadow-md">
	<div class="stat">
		<div class="stat-figure text-primary">
			<span class="text-3xl">
				<Icon name="layers" />
			</span>
		</div>
		<div class="stat-title">Mata Pelajaran</div>
		<div class="stat-value">{mapel.total}</div>
		<div class="stat-desc">
			{mapel.wajib} Wajib & {mapel.mulok} Mulok
			{#if mapel.lainnya}
				& {mapel.lainnya} Pilihan
			{/if}
		</div>
	</div>

	<div class="stat">
		<div class="stat-figure text-warning">
			<span class="text-3xl">
				<Icon name="activity" />
			</span>
		</div>
		<div class="stat-title">Ekstrakurikuler</div>
		<div class="stat-value">{ekstrakurikuler.total}</div>
		<div class="stat-desc">
			{#if ekstrakurikuler.total}
				Total di kelas ini
			{:else}
				Belum ada data
			{/if}
		</div>
	</div>
</div>
