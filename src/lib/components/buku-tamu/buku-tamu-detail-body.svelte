<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	let {
		nama,
		asalInstansi,
		nip,
		keperluan,
		pesanKesan,
		tandaTangan,
		createdAt
	}: {
		nama: string;
		asalInstansi: string;
		nip: string | null;
		keperluan: string;
		pesanKesan: string | null;
		tandaTangan: string | null;
		createdAt: string;
	} = $props();

	function formatWaktu(value: string): string {
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
</script>

<div class="not-prose space-y-4">
	<div class="bg-base-200/70 dark:bg-base-300/50 rounded-box p-4">
		<p class="text-base-content/50 text-[11px] font-semibold uppercase tracking-widest">Tamu</p>
		<p class="mt-1 text-[15px] font-semibold leading-snug">{nama}</p>
		<div class="mt-3 flex flex-wrap gap-2">
			<span class="badge badge-primary badge-soft gap-1">
				<Icon name="school" class="h-3.5 w-3.5" />
				{asalInstansi}
			</span>
			<span class="badge badge-info badge-soft gap-1">
				<Icon name="calendar" class="h-3.5 w-3.5" />
				{formatWaktu(createdAt)}
			</span>
		</div>
	</div>

	<section>
		<h4
			class="text-base-content/50 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest"
		>
			<Icon name="user" class="h-4 w-4" />
			Kunjungan
		</h4>
		<dl class="divide-base-200 dark:divide-base-300 mt-1 divide-y text-sm">
			<div class="flex items-start justify-between gap-4 py-2">
				<dt class="text-base-content/60">Asal/Instansi</dt>
				<dd class="text-right font-medium">{asalInstansi}</dd>
			</div>
			{#if nip}
				<div class="flex items-start justify-between gap-4 py-2">
					<dt class="text-base-content/60">NIP</dt>
					<dd class="text-right font-medium">{nip}</dd>
				</div>
			{/if}
		</dl>
	</section>

	<section>
		<h4
			class="text-base-content/50 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest"
		>
			<Icon name="info" class="h-4 w-4" />
			Keperluan
		</h4>
		<p class="text-base-content/80 mt-1 text-sm leading-snug">{keperluan}</p>
	</section>

	{#if pesanKesan}
		<section>
			<h4
				class="text-base-content/50 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest"
			>
				<Icon name="book" class="h-4 w-4" />
				Pesan &amp; Kesan
			</h4>
			<p class="text-base-content/80 mt-1 text-sm leading-snug">{pesanKesan}</p>
		</section>
	{/if}

	{#if tandaTangan}
		<section>
			<h4
				class="text-base-content/50 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest"
			>
				<Icon name="pen" class="h-4 w-4" />
				Tanda Tangan
			</h4>
			<div class="bg-white mt-2 inline-block rounded-box border p-2">
				<img src={tandaTangan} alt="Tanda tangan" class="max-h-32" />
			</div>
		</section>
	{/if}
</div>
