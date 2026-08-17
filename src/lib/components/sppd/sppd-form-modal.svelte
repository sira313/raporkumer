<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { hideModal, updateModal } from '$lib/components/global-modal.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { onMount, untrack } from 'svelte';

	interface GuruItem {
		id: number;
		nama: string;
	}

	interface PengikutItem {
		key: number;
		nama: string;
		tempatLahir: string;
		tanggalLahir: string;
	}

	interface EditSppdData {
		id: number;
		nomorSuratTugas: string | null;
		tanggalSuratTugas: string | null;
		dasarSuratTugas: string | null;
		maksud: string;
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
		pegawai: { authUserId: number | null }[];
		pengikut: { nama: string; tempatLahir: string; tanggalLahir: string }[];
	}

	interface Props {
		guruList: GuruItem[];
		sppd?: EditSppdData;
		prefill?: {
			maksud: string;
			authUserId: number;
			permohonanId: number;
		};
	}

	let { guruList, sppd, prefill }: Props = $props();

	const editSppd = $state<EditSppdData | null>(untrack(() => sppd ?? null));
	const isEdit = !!editSppd;

	const prefillAuthUserId = prefill?.authUserId;
	const prefillUserIdInGuruList =
		prefillAuthUserId != null && untrack(() => guruList).some((g) => g.id === prefillAuthUserId)
			? prefillAuthUserId
			: null;

	let selectedPegawaiIds = $state<number[]>(
		editSppd
			? editSppd.pegawai.map((p) => p.authUserId).filter((v): v is number => v !== null)
			: prefillUserIdInGuruList
				? [prefillUserIdInGuruList]
				: []
	);
	let nomorSuratTugas = $state(editSppd?.nomorSuratTugas ?? '');
	let tanggalSuratTugas = $state(editSppd?.tanggalSuratTugas ?? '');
	let dasarSuratTugas = $state(editSppd?.dasarSuratTugas ?? '');
	let maksud = $state(editSppd?.maksud ?? prefill?.maksud ?? '');
	let alatAngkut = $state(editSppd?.alatAngkut ?? '');
	let tempatBerangkat = $state(editSppd?.tempatBerangkat ?? '');
	let tempatTujuan = $state(editSppd?.tempatTujuan ?? '');
	let lamanya = $state(editSppd?.lamanya ?? '');
	let tanggalBerangkat = $state(editSppd?.tanggalBerangkat ?? '');
	let tanggalKembali = $state(editSppd?.tanggalKembali ?? '');
	let pengikut = $state<PengikutItem[]>(
		editSppd
			? editSppd.pengikut.map((p, i) => ({
					key: i + 1,
					nama: p.nama,
					tempatLahir: p.tempatLahir,
					tanggalLahir: p.tanggalLahir
				}))
			: []
	);
	let keteranganPengikut = $state(editSppd?.keteranganPengikut ?? '');
	let kodeRekening = $state(editSppd?.kodeRekening ?? '');
	let tingkatBiaya = $state(editSppd?.tingkatBiaya ?? '');
	let keteranganLain = $state(editSppd?.keteranganLain ?? '');
	let submitting = $state(false);

	let pengikutKey = editSppd?.pengikut.length ?? 0;

	function togglePegawai(id: number, checked: boolean) {
		if (checked) {
			if (!selectedPegawaiIds.includes(id)) {
				selectedPegawaiIds = [...selectedPegawaiIds, id];
			}
		} else {
			selectedPegawaiIds = selectedPegawaiIds.filter((v) => v !== id);
		}
	}

	function addPengikut() {
		pengikut = [...pengikut, { key: ++pengikutKey, nama: '', tempatLahir: '', tanggalLahir: '' }];
	}

	function removePengikut(index: number) {
		pengikut = pengikut.filter((_, i) => i !== index);
	}

	onMount(() => {
		updateModal({
			onPositive: {
				label: 'Simpan',
				class: 'btn-primary',
				action: () => void submit()
			},
			onNegative: undefined,
			onNeutral: { label: 'Batal', action: () => hideModal() }
		});
	});

	function pengikutHasContent(p: PengikutItem) {
		return !!(p.nama.trim() || p.tempatLahir.trim() || p.tanggalLahir);
	}

	async function submit() {
		if (submitting) return;

		if (selectedPegawaiIds.length === 0) {
			toast('Pilih minimal satu pegawai yang melaksanakan perjalanan dinas', 'warning');
			return;
		}
		if (!maksud.trim()) {
			toast('Maksud Perjalanan Dinas wajib diisi', 'warning');
			return;
		}
		if (!tanggalBerangkat) {
			toast('Tanggal berangkat wajib diisi', 'warning');
			return;
		}
		if (!tanggalKembali) {
			toast('Tanggal kembali wajib diisi', 'warning');
			return;
		}
		if (tanggalKembali < tanggalBerangkat) {
			toast('Tanggal kembali tidak boleh sebelum tanggal berangkat', 'warning');
			return;
		}
		for (const p of pengikut) {
			if (!pengikutHasContent(p)) continue;
			if (!p.nama.trim()) {
				toast('Nama pengikut wajib diisi', 'warning');
				return;
			}
			if (!p.tempatLahir.trim()) {
				toast('Tempat lahir pengikut wajib diisi', 'warning');
				return;
			}
			if (!p.tanggalLahir) {
				toast('Tanggal lahir pengikut wajib diisi', 'warning');
				return;
			}
		}

		submitting = true;
		try {
			const res = await fetch(isEdit ? `/api/sppd?id=${editSppd.id}` : '/api/sppd', {
				method: isEdit ? 'PATCH' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...(prefill?.permohonanId ? { permohonanId: prefill.permohonanId } : {}),
					nomorSuratTugas: nomorSuratTugas.trim() || null,
					tanggalSuratTugas: tanggalSuratTugas || null,
					dasarSuratTugas: dasarSuratTugas.trim() || null,
					maksud: maksud.trim(),
					alatAngkut: alatAngkut.trim() || null,
					tempatBerangkat: tempatBerangkat.trim() || null,
					tempatTujuan: tempatTujuan.trim() || null,
					lamanya: lamanya.trim() || null,
					tanggalBerangkat,
					tanggalKembali,
					pegawaiIds: selectedPegawaiIds,
					pengikut: pengikut
						.filter((p) => pengikutHasContent(p))
						.map((p) => ({
							nama: p.nama.trim(),
							tempatLahir: p.tempatLahir.trim(),
							tanggalLahir: p.tanggalLahir
						})),
					keteranganPengikut: keteranganPengikut.trim() || null,
					kodeRekening: kodeRekening.trim() || null,
					tingkatBiaya: tingkatBiaya.trim() || null,
					keteranganLain: keteranganLain.trim() || null
				})
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(
					(data as { message?: string }).message ?? `Terjadi kesalahan (${res.status})`
				);
			}
			hideModal();
			await invalidate('app:sppd');
			toast(
				(data as { message?: string }).message ??
					(isEdit ? 'Dinas luar berhasil diperbarui' : 'Dinas luar berhasil disimpan'),
				'success'
			);
		} catch (e) {
			toast(e instanceof Error ? e.message : 'Gagal menyimpan data', 'error');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="not-prose flex flex-col gap-4">
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Nomor Surat Tugas</legend>
			<input
				type="text"
				class="input bg-base-200 w-full border-base-300 dark:border-none"
				bind:value={nomorSuratTugas}
				placeholder="contoh: 422/12/SD.19/Adm/2026"
				disabled={submitting}
			/>
		</fieldset>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Tanggal Surat Tugas</legend>
			<input
				type="date"
				class="input bg-base-200 w-full border-base-300 dark:border-none"
				bind:value={tanggalSuratTugas}
				disabled={submitting}
			/>
		</fieldset>
	</div>

	<fieldset class="fieldset">
		<legend class="fieldset-legend">Dasar Surat Tugas</legend>
		<textarea
			class="textarea bg-base-200 w-full border-base-300 dark:border-none"
			bind:value={dasarSuratTugas}
			placeholder="Contoh: berdasarkan undangan dari Dinas nomor xxx tanggal xxx"
			rows={3}
			disabled={submitting}></textarea>
	</fieldset>

	<fieldset class="fieldset">
		<legend class="fieldset-legend">
			Nama yang melaksanakan perjalanan dinas
			<span class="text-error">*</span>
		</legend>
		{#if guruList.length === 0}
			<p class="text-base-content/60 text-sm">Belum ada guru/staff yang terdaftar.</p>
		{:else}
			<div
				class="border-base-300 max-h-48 space-y-0.5 overflow-y-auto rounded-md border p-2 bg-base-200"
			>
				{#each guruList as guru (guru.id)}
					<label class="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-base-200">
						<input
							type="checkbox"
							class="checkbox checkbox-sm checkbox-primary"
							checked={selectedPegawaiIds.includes(guru.id)}
							onchange={(e) =>
								togglePegawai(guru.id, (e.currentTarget as HTMLInputElement).checked)}
						/>
						<span class="text-sm">{guru.nama}</span>
					</label>
				{/each}
			</div>
			<p class="label-text-alt text-base-content/60">Pilih satu atau lebih pegawai.</p>
		{/if}
	</fieldset>

	<fieldset class="fieldset">
		<legend class="fieldset-legend">
			Maksud Perjalanan Dinas
			<span class="text-error">*</span>
		</legend>
		<textarea
			class="textarea bg-base-200 w-full border-base-300 dark:border-none"
			bind:value={maksud}
			placeholder="Contoh: Menghadiri seminar, rapat, dsb."
			rows={3}
			disabled={submitting}></textarea>
	</fieldset>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Alat angkut yang digunakan</legend>
			<input
				type="text"
				class="input bg-base-200 w-full border-base-300 dark:border-none"
				bind:value={alatAngkut}
				placeholder="Contoh: Mobil, Motor, Sepeda, dsb."
				disabled={submitting}
			/>
		</fieldset>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Lamanya Perjalanan Dinas</legend>
			<input
				type="text"
				class="input bg-base-200 w-full border-base-300 dark:border-none"
				bind:value={lamanya}
				placeholder="Contoh: 1 hari, 2 hari, dsb."
				disabled={submitting}
			/>
		</fieldset>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Tempat Berangkat</legend>
			<input
				type="text"
				class="input bg-base-200 w-full border-base-300 dark:border-none"
				bind:value={tempatBerangkat}
				placeholder="Contoh: Kantor, Rumah, dsb."
				disabled={submitting}
			/>
		</fieldset>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Tempat Tujuan</legend>
			<input
				type="text"
				class="input bg-base-200 w-full border-base-300 dark:border-none"
				bind:value={tempatTujuan}
				placeholder="Contoh: Kantor BKPSDM, Kantor Bupati, dsb."
				disabled={submitting}
			/>
		</fieldset>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<fieldset class="fieldset">
			<legend class="fieldset-legend">
				Tanggal Berangkat
				<span class="text-error">*</span>
			</legend>
			<input
				type="date"
				class="input bg-base-200 w-full border-base-300 dark:border-none"
				bind:value={tanggalBerangkat}
				disabled={submitting}
			/>
		</fieldset>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">
				Tanggal Kembali
				<span class="text-error">*</span>
			</legend>
			<input
				type="date"
				class="input bg-base-200 w-full border-base-300 dark:border-none"
				bind:value={tanggalKembali}
				disabled={submitting}
			/>
		</fieldset>
	</div>

	<div class="border-base-300 rounded-md border p-3">
		<div class="mb-2 flex items-center justify-between gap-2">
			<span class="text-sm font-semibold">Pengikut Perjalanan Dinas</span>
			<button
				type="button"
				class="btn btn-soft btn-sm shadow-none"
				onclick={addPengikut}
				disabled={submitting}
			>
				<Icon name="plus" />
				Tambah Pengikut
			</button>
		</div>

		{#if pengikut.length === 0}
			<p class="text-base-content/60 text-sm">Belum ada pengikut.</p>
		{:else}
			<div class="space-y-3">
				{#each pengikut as p, i (p.key)}
					<div class="border-base-300 space-y-3 rounded-md border p-3">
						<div class="flex items-center justify-between gap-2">
							<span class="text-sm font-semibold">Pengikut {i + 1}</span>
							<button
								type="button"
								class="btn btn-soft btn-error btn-sm shadow-none"
								onclick={() => removePengikut(i)}
								disabled={submitting}
								title="Hapus pengikut"
							>
								<Icon name="del" />
							</button>
						</div>
						<fieldset class="fieldset">
							<legend class="fieldset-legend">Nama Pengikut</legend>
							<input
								type="text"
								class="input bg-base-200 w-full border-base-300 dark:border-none"
								bind:value={p.nama}
								placeholder="Contoh: Budi Santoso, Siti Aminah, dsb."
								disabled={submitting}
							/>
						</fieldset>
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Tempat Lahir Pengikut</legend>
								<input
									type="text"
									class="input bg-base-200 w-full border-base-300 dark:border-none"
									bind:value={p.tempatLahir}
									placeholder="Contoh: Jakarta, Bandung, dsb."
									disabled={submitting}
								/>
							</fieldset>
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Tanggal Lahir Pengikut</legend>
								<input
									type="date"
									class="input bg-base-200 w-full border-base-300 dark:border-none"
									bind:value={p.tanggalLahir}
									disabled={submitting}
								/>
							</fieldset>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<fieldset class="fieldset mt-3">
			<legend class="fieldset-legend">Keterangan Pengikut</legend>
			<input
				type="text"
				class="input bg-base-200 w-full border-base-300 dark:border-none"
				bind:value={keteranganPengikut}
				placeholder="Contoh: Keluarga, Sopir, dsb."
				disabled={submitting}
			/>
		</fieldset>
	</div>

	<fieldset class="fieldset">
		<legend class="fieldset-legend">Kode rekening pembebanan anggaran</legend>
		<input
			type="text"
			class="input bg-base-200 w-full border-base-300 dark:border-none"
			bind:value={kodeRekening}
			placeholder="Masukkan kode rekening di arkas jika ada"
			disabled={submitting}
		/>
	</fieldset>

	<fieldset class="fieldset">
		<legend class="fieldset-legend">Tingkat biaya perjalanan dinas</legend>
		<input
			type="text"
			class="input bg-base-200 w-full border-base-300 dark:border-none"
			bind:value={tingkatBiaya}
			placeholder="Contoh: Perjalanan dinas dalam kota/daerah"
			disabled={submitting}
		/>
	</fieldset>

	<fieldset class="fieldset">
		<legend class="fieldset-legend">Keterangan lain-lain</legend>
		<textarea
			class="textarea bg-base-200 w-full border-base-300 dark:border-none"
			rows="3"
			bind:value={keteranganLain}
			placeholder="Masukkan keterangan yang diperlukan"
			disabled={submitting}></textarea>
	</fieldset>
</div>
