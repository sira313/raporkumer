<script lang="ts">
	import { invalidate } from '$app/navigation';
	import Icon from '$lib/components/icon.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import FormEnhance from '$lib/components/form-enhance.svelte';

	let { data }: { data: Record<string, unknown> } = $props();

	interface MataEvaluasi {
		id: number;
		nama: string;
		indikator: Array<{
			id: number;
			deskripsi: string;
		}>;
	}

	const mataEvaluasi = $derived((data.mataPelajaran as MataEvaluasi[]) ?? []);
	const tableReady = $derived((data.tableReady as boolean) ?? true);
	const kelasAktif = $derived(
		data.kelasAktif as { id: number; nama: string; fase?: string } | null
	);

	let editingGroupId = $state<number | null>(null);
	let editingGroupData = $state<{
		nama: string;
		indikator: Array<{ id?: number; deskripsi: string }>;
	} | null>(null);
	let deleteConfirmId = $state<number | null>(null);

	const isEditMode = $derived(editingGroupId !== null);

	function openEdit(group: MataEvaluasi) {
		editingGroupId = group.id;
		editingGroupData = {
			nama: group.nama,
			indikator: [...group.indikator]
		};
	}

	function closeEdit() {
		editingGroupId = null;
		editingGroupData = null;
	}

	function removeIndicatorField(index: number) {
		if (!editingGroupData) return;
		editingGroupData.indikator = editingGroupData.indikator.filter((_, i) => i !== index);
	}

	function updateIndicatorField(index: number, value: string) {
		if (!editingGroupData) return;
		editingGroupData.indikator[index].deskripsi = value;

		// Auto-add new field if user types in the last field and it's empty before
		const lastIndex = editingGroupData.indikator.length - 1;
		if (
			index === lastIndex &&
			value.trim().length > 0 &&
			editingGroupData.indikator.every((ind, i) => i < lastIndex || ind.deskripsi.trim().length > 0)
		) {
			editingGroupData.indikator = [...editingGroupData.indikator, { deskripsi: '' }];
		}
	}

	async function deleteGroup(id: number) {
		const form = new FormData();
		form.append('id', String(id));

		try {
			const response = await fetch('?/delete', {
				method: 'POST',
				body: form
			});

			const result = await response.json();

			if (!response.ok) {
				toast(result.fail || 'Gagal menghapus mata evaluasi', 'error');
			} else {
				toast(result.message || 'Berhasil menghapus mata evaluasi', 'success');
				deleteConfirmId = null;
				await invalidate('app:keasramaan');
			}
		} catch (error) {
			toast('Terjadi kesalahan saat menghapus', 'error');
			console.error(error);
		}
	}

	const kelasLabel = $derived(
		kelasAktif ? (kelasAktif.fase ? `${kelasAktif.nama} - ${kelasAktif.fase}` : kelasAktif.nama) : '-'
	);
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<!-- Header -->
	<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<h2 class="text-xl font-bold">Daftar Mata Evaluasi Keasramaan</h2>
			<p class="text-base-content/70 text-sm">Kelas aktif: {kelasLabel}</p>
		</div>
	</div>

	{#if !tableReady}
		<div class="alert border-error/60 bg-error/10 text-error-content mt-4 border border-dashed">
			<Icon name="warning" />
			<span>
				Database keasramaan belum siap. Jalankan <code>pnpm db:push</code> untuk menerapkan migrasi terbaru.
			</span>
		</div>
	{/if}

	<!-- Mata Evaluasi Groups -->
	<div class="mt-6 space-y-4">
		{#each mataEvaluasi as group (group.id)}
			{#if isEditMode && editingGroupId === group.id && editingGroupData}
				<!-- Edit Mode -->
				<div class="fieldset border border-primary/30 bg-primary/5 rounded-lg p-4">
					<legend class="fieldset-legend px-2 text-base font-semibold text-primary">
						Edit Mata Evaluasi
					</legend>

					<FormEnhance
						action="?/save"
						onsuccess={() => {
							closeEdit();
							invalidate('app:keasramaan');
						}}
						submitStateChange={() => {
							/* no-op */
						}}
					>
						{#snippet children({ submitting })}
							{#if editingGroupData}
								<!-- Input Nama Mata Evaluasi -->
								<div class="form-control">
									<label class="label" for={`mata-evaluasi-name-${group.id}`}>
										<span class="label-text font-semibold">Nama Mata Evaluasi</span>
									</label>
									<input
										id={`mata-evaluasi-name-${group.id}`}
										type="text"
										name="mataEvaluasiNama"
										class="input input-bordered validator"
										bind:value={editingGroupData.nama}
										required
										disabled={submitting}
									/>
								</div>

								<!-- Hidden ID -->
								<input type="hidden" name="mataEvaluasiId" value={group.id} />

								<!-- Indikator Fields -->
								<div class="space-y-2">
									<span class="label-text font-semibold">Indikator</span>

									{#each editingGroupData.indikator as indicator, idx (idx)}
										<div class="flex gap-2">
											<input
												type="hidden"
												name={`indikator.${idx}.id`}
												value={indicator.id ?? ''}
											/>
											<textarea
												class="textarea input-bordered validator w-full"
												name={`indikator.${idx}.deskripsi`}
												placeholder="Tuliskan indikator"
												value={indicator.deskripsi}
												oninput={(e) =>
													updateIndicatorField(idx, (e.target as HTMLTextAreaElement).value)}
												disabled={submitting}
											></textarea>
											{#if editingGroupData.indikator.length > 1 || indicator.deskripsi.trim().length > 0}
												<button
													type="button"
													class="btn btn-sm btn-error btn-soft"
													onclick={() => removeIndicatorField(idx)}
													disabled={submitting}
													title="Hapus indikator"
												>
													<Icon name="del" />
												</button>
											{/if}
										</div>
									{/each}
								</div>

								<!-- Action Buttons -->
								<div class="flex gap-2 pt-2">
									<button
										type="button"
										class="btn btn-sm btn-soft"
										onclick={closeEdit}
										disabled={submitting}
									>
										<Icon name="close" />
										Batal
									</button>
									<button
										type="submit"
										class="btn btn-sm btn-primary"
										disabled={submitting}
										aria-busy={submitting}
									>
										<Icon name="save" />
										Simpan
									</button>
								</div>
							{/if}
						{/snippet}
					</FormEnhance>
				</div>
			{:else}
				<!-- Display Mode -->
				<div class="fieldset border border-base-200 rounded-lg p-4 dark:border-base-700">
					<legend class="fieldset-legend px-2 text-base font-semibold">{group.nama}</legend>

					<div class="space-y-2">
						{#each group.indikator as indicator (indicator.id)}
							<div class="flex items-start gap-2 rounded bg-base-100/50 p-2 dark:bg-base-800/30">
								<span class="mt-1 inline-block h-2 w-2 rounded-full bg-base-content/40 shrink-0"></span>
								<span class="text-sm">{indicator.deskripsi}</span>
							</div>
						{/each}
						{#if group.indikator.length === 0}
							<p class="text-sm text-base-content/50 italic">Belum ada indikator</p>
						{/if}
					</div>

					<!-- Action Buttons -->
					<div class="mt-3 flex gap-2">
						<button
							type="button"
							class="btn btn-sm btn-soft"
							onclick={() => openEdit(group)}
							disabled={isEditMode || !tableReady}
							title="Edit mata evaluasi"
						>
							<Icon name="edit" />
							Edit
						</button>
						<button
							type="button"
							class="btn btn-sm btn-error btn-soft"
							onclick={() => (deleteConfirmId = group.id)}
							disabled={isEditMode || !tableReady}
							title="Hapus mata evaluasi"
						>
							<Icon name="del" />
							Hapus
						</button>
					</div>
				</div>
			{/if}

			<!-- Delete Confirmation Modal -->
			{#if deleteConfirmId === group.id}
				<div class="modal modal-open">
					<div class="modal-box">
						<h3 class="text-lg font-bold">Hapus Mata Evaluasi?</h3>
						<p class="py-4">
							Anda akan menghapus mata evaluasi <strong>{group.nama}</strong> beserta semua indikatornya.
							Tindakan ini tidak dapat dibatalkan.
						</p>
						<div class="modal-action">
							<button
								type="button"
								class="btn"
								onclick={() => (deleteConfirmId = null)}
								title="Batal menghapus"
							>
								Batal
							</button>
							<button
								type="button"
								class="btn btn-error"
								onclick={() => deleteGroup(group.id)}
								title="Konfirmasi penghapusan"
							>
								Hapus
							</button>
						</div>
					</div>
					<button
						type="button"
						class="modal-backdrop"
						onclick={() => (deleteConfirmId = null)}
						title="Tutup modal"
					></button>
				</div>
			{/if}
		{/each}
	</div>

	{#if mataEvaluasi.length === 0 && tableReady}
		<div class="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-base-300 bg-base-50 p-8">
			<Icon name="info" class="mb-2 text-2xl opacity-50" />
			<p class="text-center text-sm text-base-content/60">
				Belum ada mata evaluasi keasramaan. Tambahkan dari halaman <strong>Daftar Nilai Keasramaan</strong>.
			</p>
		</div>
	{/if}
</div>
