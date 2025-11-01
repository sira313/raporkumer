<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	type DashboardStatistik = App.DashboardStatistik;

	let { rombel, murid } = $props<{
		rombel: DashboardStatistik['rombel'];
		murid: DashboardStatistik['murid'];
	}>();

	const rombelBadges = $derived.by(() => rombel.perFase);
</script>

<div class="stats stats-vertical lg:stats-horizontal bg-base-100 rounded-box w-full shadow-md">
	<div class="stat justify-center">
		<div class="stat-figure">
			<span class="text-accent text-3xl">
				<Icon name="user" />
			</span>
		</div>
		<div class="stat-title">Jumlah Total Rombel</div>
		<div class="stat-value">{rombel.total}</div>
		<div class="stat-desc flex flex-wrap gap-1">
			{#if rombelBadges.length}
				{#each rombelBadges as badge (badge.label)}
					<div class="badge badge-sm badge-soft whitespace-nowrap">
						{badge.jumlah}
						{badge.label}
					</div>
				{/each}
			{:else}
				<div class="badge badge-sm badge-soft whitespace-nowrap">Belum ada data</div>
			{/if}
		</div>
	</div>

	<div class="stat">
		<div class="stat-figure text-secondary">
			<span class="text-3xl">
				<Icon name="users" />
			</span>
		</div>
		<div class="stat-title">Jumlah Total Murid</div>
		<div class="stat-value">{murid.total}</div>
		<div class="stat-desc">{murid.total ? 'Aktif' : 'Belum ada data'}</div>
	</div>
</div>
