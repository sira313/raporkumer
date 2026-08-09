<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	interface SppdPegawaiRow {
		id: number;
		authUserId: number | null;
		nama: string;
	}

	interface SppdPengikutRow {
		id: number;
		nama: string;
		tempatLahir: string;
		tanggalLahir: string;
	}

	interface SppdDetailData {
		maksud: string;
		nomorSuratTugas: string | null;
		tanggalSuratTugas: string | null;
		dasarSuratTugas: string | null;
		alatAngkut: string | null;
		tempatBerangkat: string | null;
		tempatTujuan: string | null;
		lamanya: string | null;
		tanggalBerangkat: string;
		tanggalKembali: string;
		keteranganPengikut: string | null;
		kodeRekening: string | null;
		tingkatBiaya: string | null;
		keteranganLain: string | null;
		jumlah: number;
		pegawai: SppdPegawaiRow[];
		pengikut: SppdPengikutRow[];
	}

	let { sppd }: { sppd: SppdDetailData } = $props();

	function formatTanggal(value: string | null | undefined): string {
		if (!value) return '—';
		const d = new Date(`${value}T00:00:00`);
		if (Number.isNaN(d.getTime())) return value;
		return d.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function initials(nama: string): string {
		return nama
			.replace(/[^a-zA-Z ]/g, '')
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('');
	}

	interface InfoRow {
		label: string;
		value: string;
	}

	const perjalananRows = $derived<InfoRow[]>([
		{ label: 'Tempat Berangkat', value: sppd.tempatBerangkat ?? '—' },
		{ label: 'Tempat Tujuan', value: sppd.tempatTujuan ?? '—' },
		{ label: 'Tanggal Berangkat', value: formatTanggal(sppd.tanggalBerangkat) },
		{ label: 'Tanggal Kembali', value: formatTanggal(sppd.tanggalKembali) }
	]);

	const suratRows = $derived<InfoRow[]>([
		{ label: 'Nomor Surat Tugas', value: sppd.nomorSuratTugas ?? '—' },
		{ label: 'Tanggal Surat Tugas', value: formatTanggal(sppd.tanggalSuratTugas) },
		{ label: 'Dasar Surat Tugas', value: sppd.dasarSuratTugas ?? '—' }
	]);
</script>

<div class="not-prose space-y-4">
	<div class="bg-base-200/70 dark:bg-base-300/50 rounded-box p-4">
		<p class="text-base-content/50 text-[11px] font-semibold uppercase tracking-widest">
			Maksud Perjalanan Dinas
		</p>
		<p class="mt-1 text-[15px] font-semibold leading-snug">{sppd.maksud}</p>
		<div class="mt-3 flex flex-wrap gap-2">
			<span class="badge badge-primary badge-soft gap-1">
				<Icon name="users" class="h-3.5 w-3.5" />
				{sppd.jumlah} Pegawai
			</span>
			{#if sppd.alatAngkut}
				<span class="badge badge-info badge-soft gap-1">
					<Icon name="briefcase" class="h-3.5 w-3.5" />
					{sppd.alatAngkut}
				</span>
			{/if}
			{#if sppd.lamanya}
				<span class="badge badge-success badge-soft gap-1">
					<Icon name="calendar" class="h-3.5 w-3.5" />
					{sppd.lamanya}
				</span>
			{/if}
		</div>
	</div>

	<section>
		<h4
			class="text-base-content/50 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest"
		>
			<Icon name="briefcase" class="h-4 w-4" />
			Perjalanan
		</h4>
		<dl class="divide-base-200 dark:divide-base-300 mt-1 divide-y text-sm">
			{#each perjalananRows as row (row.label)}
				<div class="flex items-start justify-between gap-4 py-2">
					<dt class="text-base-content/60">{row.label}</dt>
					<dd class="text-right font-medium">{row.value}</dd>
				</div>
			{/each}
		</dl>
	</section>

	<section>
		<h4
			class="text-base-content/50 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest"
		>
			<Icon name="book" class="h-4 w-4" />
			Surat Tugas
		</h4>
		<dl class="divide-base-200 dark:divide-base-300 mt-1 divide-y text-sm">
			{#each suratRows as row (row.label)}
				<div class="flex items-start justify-between gap-4 py-2">
					<dt class="text-base-content/60">{row.label}</dt>
					<dd class="text-right font-medium">{row.value}</dd>
				</div>
			{/each}
		</dl>
	</section>

	<section>
		<h4
			class="text-base-content/50 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest"
		>
			<Icon name="users" class="h-4 w-4" />
			Pegawai Pelaksana ({sppd.jumlah})
		</h4>
		<ul class="mt-2 space-y-2">
			{#each sppd.pegawai as p (p.id)}
				<li
					class="border-base-200 dark:border-none bg-base-200 flex items-center gap-3 rounded-box border p-2"
				>
					<span
						class="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
					>
						{initials(p.nama)}
					</span>
					<span class="text-sm font-medium">{p.nama}</span>
				</li>
			{/each}
		</ul>
	</section>

	{#if sppd.pengikut.length > 0}
		<section>
			<h4
				class="text-base-content/50 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest"
			>
				<Icon name="user" class="h-4 w-4" />
				Pengikut ({sppd.pengikut.length})
			</h4>
			<ul class="mt-2 space-y-2">
				{#each sppd.pengikut as p (p.id)}
					<li
						class="border-base-200 dark:border-base-300 flex items-center justify-between gap-3 rounded-box border p-2"
					>
						<div class="flex min-w-0 items-center gap-3">
							<span
								class="bg-secondary/10 text-secondary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
							>
								{initials(p.nama)}
							</span>
							<span class="truncate text-sm font-medium">{p.nama}</span>
						</div>
						<span class="text-base-content/50 shrink-0 text-xs">
							{p.tempatLahir}, {formatTanggal(p.tanggalLahir)}
						</span>
					</li>
				{/each}
			</ul>
			{#if sppd.keteranganPengikut}
				<p class="text-base-content/70 mt-2 text-xs">
					<span class="font-semibold">Keterangan:</span>
					{sppd.keteranganPengikut}
				</p>
			{/if}
		</section>
	{/if}

	{#if sppd.kodeRekening || sppd.tingkatBiaya || sppd.keteranganLain}
		<section>
			<h4
				class="text-base-content/50 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest"
			>
				<Icon name="info" class="h-4 w-4" />
				Lain-lain
			</h4>
			<dl class="divide-base-200 dark:divide-base-300 mt-1 divide-y text-sm">
				{#if sppd.kodeRekening}
					<div class="flex items-start justify-between gap-4 py-2">
						<dt class="text-base-content/60">Kode Rekening</dt>
						<dd class="text-right font-medium">{sppd.kodeRekening}</dd>
					</div>
				{/if}
				{#if sppd.tingkatBiaya}
					<div class="flex items-start justify-between gap-4 py-2">
						<dt class="text-base-content/60">Tingkat Biaya Perjalanan Dinas</dt>
						<dd class="text-right font-medium">{sppd.tingkatBiaya}</dd>
					</div>
				{/if}
				{#if sppd.keteranganLain}
					<div class="flex items-start justify-between gap-4 py-2">
						<dt class="text-base-content/60">Keterangan Lain-lain</dt>
						<dd class="text-right font-medium">{sppd.keteranganLain}</dd>
					</div>
				{/if}
			</dl>
		</section>
	{/if}
</div>
