<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- undangan link opens in a new tab */
	import Icon from '$lib/components/icon.svelte';

	interface DinasLuarPermohonanDetail {
		nama: string;
		maksud: string;
		undanganFile: string | null;
		tanggal: string;
	}

	let { permohonan }: { permohonan: DinasLuarPermohonanDetail } = $props();

	function formatTanggal(value: string | null | undefined): string {
		if (!value) return '—';
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return value;
		return d.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	const undanganUrl = $derived(
		permohonan.undanganFile?.startsWith('undangan/')
			? `/api/dinas-luar/undangan/${permohonan.undanganFile.slice('undangan/'.length)}`
			: null
	);

	const undanganName = $derived(permohonan.undanganFile?.split('/').pop() ?? null);
</script>

<div class="not-prose space-y-4">
	<div class="bg-base-200/70 dark:bg-base-300/50 rounded-box p-4">
		<p class="text-base-content/50 text-[11px] font-semibold uppercase tracking-widest">
			Maksud Perjalanan Dinas
		</p>
		<p class="mt-1 text-[15px] font-semibold leading-snug">{permohonan.maksud}</p>
		<div class="mt-3 flex flex-wrap gap-2">
			<span class="badge badge-info badge-soft gap-1">
				<Icon name="user" class="h-3.5 w-3.5" />
				{permohonan.nama}
			</span>
			<span class="badge badge-success badge-soft gap-1">
				<Icon name="calendar" class="h-3.5 w-3.5" />
				{formatTanggal(permohonan.tanggal)}
			</span>
		</div>
	</div>

	<section>
		<h4
			class="text-base-content/50 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest"
		>
			<Icon name="book" class="h-4 w-4" />
			Undangan Kegiatan
		</h4>
		{#if undanganUrl && undanganName}
			<div
				class="border-base-200 dark:border-base-300 flex items-center justify-between gap-3 rounded-box border p-3"
			>
				<div class="flex min-w-0 items-center gap-3">
					<span
						class="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
					>
						<Icon name="book" class="h-4 w-4" />
					</span>
					<span class="truncate text-sm font-medium">{undanganName}</span>
				</div>
				<a
					class="btn btn-primary btn-soft btn-sm shadow-none"
					href={undanganUrl}
					target="_blank"
					rel="noopener"
					title="Lihat file undangan"
				>
					<Icon name="download" />
					Lihat
				</a>
			</div>
		{:else}
			<p class="text-base-content/60 text-sm">Tidak ada file undangan.</p>
		{/if}
	</section>
</div>
