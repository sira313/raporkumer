<script lang="ts">
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import type { EkstrakurikulerNilaiKategori } from '$lib/ekstrakurikuler';

	type PageData = {
		murid: { id: number; nama: string };
		ekstrakurikuler: { id: number; nama: string };
		tujuan: Array<{ id: number; deskripsi: string }>;
		nilaiByTujuan: Record<number, EkstrakurikulerNilaiKategori>;
		kategoriOptions: Array<{ value: EkstrakurikulerNilaiKategori; label: string }>;
		backUrl: string;
	};

	let { data }: { data: PageData } = $props();

	const hasTujuan = $derived.by(() => data.tujuan.length > 0);
	const initValue = $derived.by(() => ({
		muridId: data.murid.id,
		ekstrakurikulerId: data.ekstrakurikuler.id,
		nilai: data.nilaiByTujuan
	}));

	function capitalizeSentence(value: string | null | undefined) {
		if (!value) return '';
		const trimmed = value.trimStart();
		if (!trimmed) return '';
		return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
	}

	function formatTujuan(value: string) {
		return value.trim();
	}
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<FormEnhance action="?/save" init={initValue} id="form-asesmen-ekstrakurikuler">
		{#snippet children({ submitting, invalid })}
			<input type="hidden" name="muridId" value={data.murid.id} />
			<input type="hidden" name="ekstrakurikulerId" value={data.ekstrakurikuler.id} />

			<div class="flex flex-col gap-2 sm:flex-row">
				<a href={data.backUrl} class="btn shadow-none">
					<Icon name="left" />
					Kembali
				</a>
				<button
					type="submit"
					class="btn btn-primary shadow-none sm:ml-auto"
					disabled={!hasTujuan || invalid || submitting}
				>
					{#if submitting}
						<span class="loading loading-spinner"></span>
					{:else}
						<Icon name="save" />
					{/if}
					Simpan
				</button>
			</div>

			<h3 class="mt-4 pb-2 text-lg font-bold">
				Isi nilai untuk tiap tujuan pembelajaran ekstrakurikuler di bawah ini untuk Ananda
				<span class="text-primary">{capitalizeSentence(data.murid.nama)}</span>.
			</h3>
			<p class="text-base-content/70 text-sm">
				Ekstrakurikuler: <strong>{capitalizeSentence(data.ekstrakurikuler.nama)}</strong>
			</p>

			{#if !hasTujuan}
				<div class="alert alert-soft alert-warning mt-6">
					<Icon name="alert" />
					<span>
						Belum ada tujuan pembelajaran untuk ekstrakurikuler ini. Tambahkan tujuan terlebih
						dahulu melalui menu <strong>Ekstrakurikuler &gt; Tujuan</strong>.
					</span>
				</div>
			{:else}
				<div
					class="bg-base-100 dark:bg-base-200 border-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none"
				>
					<table class="border-base-200 table border dark:border-none">
						<thead>
							<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
								<th style="width: 48px;">No</th>
								<th class="w-full" style="min-width: 240px;">Tujuan Pembelajaran</th>
								<th class="min-w-44">Pilih Nilai</th>
							</tr>
						</thead>
						<tbody>
							{#each data.tujuan as tujuan, index (tujuan.id)}
								<tr>
									<td class="align-top">{index + 1}</td>
									<td class="text-base-content align-top text-sm">
										{formatTujuan(tujuan.deskripsi)}
									</td>
									<td class="align-top">
										<select
											class="select bg-base-200 w-full dark:border-none"
											name={`nilai.${tujuan.id}`}
										>
											<option value="">Belum dinilai</option>
											{#each data.kategoriOptions as option (option.value)}
												<option value={option.value}>{option.label}</option>
											{/each}
										</select>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{/snippet}
	</FormEnhance>
</div>
