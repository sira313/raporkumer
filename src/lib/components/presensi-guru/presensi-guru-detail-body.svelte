<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	let {
		nama,
		tanggal,
		status,
		statusLabel,
		statusClass,
		waktu,
		keterangan,
		tandaTangan
	}: {
		nama: string;
		tanggal: string;
		status: string | null;
		statusLabel: string | null;
		statusClass: string;
		waktu: string | null;
		keterangan: string | null;
		tandaTangan: string | null;
	} = $props();

	const hariList = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
	const bulanList = [
		'Januari',
		'Februari',
		'Maret',
		'April',
		'Mei',
		'Juni',
		'Juli',
		'Agustus',
		'September',
		'Oktober',
		'November',
		'Desember'
	];

	const STATUS_ICON: Record<string, IconName> = {
		hadir: 'check',
		izin: 'info',
		sakit: 'alert',
		dinas_luar: 'briefcase',
		cuti: 'coffee'
	};

	function formatTanggal(dateStr: string): string {
		const d = new Date(`${dateStr}T00:00:00`);
		if (Number.isNaN(d.getTime())) return dateStr;
		return `${hariList[d.getDay()]}, ${d.getDate()} ${bulanList[d.getMonth()]} ${d.getFullYear()}`;
	}

	function formatJam(value: string): string {
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return value;
		return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
	}

	const statusIcon = $derived(status ? (STATUS_ICON[status] ?? 'info') : 'info');
</script>

<div class="not-prose space-y-4">
	<div class="bg-base-200/70 dark:bg-base-300/50 rounded-box p-4">
		<p class="text-base-content/50 text-[11px] font-semibold uppercase tracking-widest">Guru</p>
		<p class="mt-1 text-[15px] font-semibold leading-snug">{nama}</p>
		<div class="mt-3 flex flex-wrap gap-2">
			{#if statusLabel}
				<span class="badge gap-1 {statusClass}">
					<Icon name={statusIcon} class="h-3.5 w-3.5" />
					{statusLabel}
				</span>
			{:else}
				<span class="badge badge-soft gap-1">
					<Icon name="info" class="h-3.5 w-3.5" />
					Belum presensi
				</span>
			{/if}
		</div>
	</div>

	<section>
		<h4
			class="text-base-content/50 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest"
		>
			<Icon name="calendar" class="h-4 w-4" />
			Waktu Presensi
		</h4>
		<dl class="divide-base-200 dark:divide-base-300 mt-1 divide-y text-sm">
			<div class="flex items-start justify-between gap-4 py-2">
				<dt class="text-base-content/60">Tanggal</dt>
				<dd class="text-right font-medium">{formatTanggal(tanggal)}</dd>
			</div>
			{#if waktu}
				<div class="flex items-start justify-between gap-4 py-2">
					<dt class="text-base-content/60">Jam</dt>
					<dd class="text-right font-medium">{formatJam(waktu)}</dd>
				</div>
			{/if}
			{#if keterangan}
				<div class="flex items-start justify-between gap-4 py-2">
					<dt class="text-base-content/60">Keterangan</dt>
					<dd class="text-right font-medium">{keterangan}</dd>
				</div>
			{/if}
		</dl>
	</section>

	{#if tandaTangan}
		<section>
			<h4
				class="text-base-content/50 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest"
			>
				<Icon name="pen" class="h-4 w-4" />
				Paraf
			</h4>
			<div class="bg-white mt-2 inline-block rounded-box border p-2">
				<img src={tandaTangan} alt="Paraf" class="max-h-32" />
			</div>
		</section>
	{/if}
</div>
