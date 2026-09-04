<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/icon.svelte';
	import { toast } from '$lib/components/toast.svelte';

	type GeneratedGroup = {
		lingkupMateri: string;
		deskripsi: string[];
	};

	interface Props {
		mapelId: number;
		mapelName: string;
		kelasLabel: string;
		onCancel: () => void;
		onSuccess: (data?: Record<string, unknown>) => void;
	}

	let { mapelId, mapelName, kelasLabel, onCancel, onSuccess }: Props = $props();

	let capaianPembelajaran = $state('');
	let maxLingkupMateri = $state(10);
	let maxTujuanPembelajaran = $state(10);
	let generating = $state(false);
	let saving = $state(false);
	let errorMessage = $state('');
	let groups = $state<GeneratedGroup[]>([]);

	let aiStatus = $state<'checking' | 'ready' | 'unconfigured'>('checking');
	let isAdminUser = $state(false);

	const isFormEnabled = $derived(aiStatus === 'ready');

	const isAgamaFamily = $derived(
		/^pendidikan (agama|kepercayaan)/i.test(mapelName) || /^pendalaman kitab suci/i.test(mapelName)
	);

	const UNCONFIGURED_MESSAGE =
		'Fitur AI belum aktif. Silakan setel kunci API di halaman Pengaturan.';

	onMount(() => {
		(async () => {
			try {
				const response = await fetch('/api/ai/status');
				const body = await response.json().catch(() => ({}));
				aiStatus = response.ok && body?.configured ? 'ready' : 'unconfigured';
				isAdminUser = Boolean(body?.isAdmin);
			} catch {
				aiStatus = 'unconfigured';
			}
		})();
	});

	const hasGenerated = $derived(groups.length > 0);

	function resetError() {
		errorMessage = '';
	}

	async function handleGenerate() {
		resetError();
		if (!isFormEnabled) {
			errorMessage = UNCONFIGURED_MESSAGE;
			return;
		}
		if (!capaianPembelajaran.trim()) {
			errorMessage = 'Capaian Pembelajaran wajib diisi.';
			return;
		}
		if (!Number.isInteger(maxLingkupMateri) || maxLingkupMateri < 1) {
			errorMessage = 'Maksimal Lingkup Materi harus antara 1–20.';
			return;
		}
		if (!Number.isInteger(maxTujuanPembelajaran) || maxTujuanPembelajaran < 1) {
			errorMessage = 'Maksimal Tujuan Pembelajaran harus antara 1–20.';
			return;
		}

		generating = true;
		try {
			const response = await fetch('/api/ai/generate-tp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					mapelId,
					capaianPembelajaran: capaianPembelajaran.trim(),
					maxLingkupMateri,
					maxTujuanPembelajaran
				})
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				errorMessage = body?.message || 'Gagal generate tujuan pembelajaran.';
				return;
			}
			const nextGroups = (body?.data?.groups ?? []) as GeneratedGroup[];
			if (nextGroups.length === 0) {
				errorMessage = 'AI tidak menghasilkan lingkup materi. Coba lagi.';
				return;
			}
			groups = nextGroups;
		} catch {
			errorMessage = 'Terjadi kesalahan saat menghubungi layanan AI. Coba lagi.';
		} finally {
			generating = false;
		}
	}

	function updateLingkupMateri(index: number, value: string) {
		groups = groups.map((group, groupIndex) =>
			groupIndex === index ? { ...group, lingkupMateri: value } : group
		);
	}

	function updateDeskripsi(groupIndex: number, tpIndex: number, value: string) {
		groups = groups.map((group, index) =>
			index === groupIndex
				? {
						...group,
						deskripsi: group.deskripsi.map((tp, tpIndex2) => (tpIndex2 === tpIndex ? value : tp))
					}
				: group
		);
	}

	function removeDeskripsi(groupIndex: number, tpIndex: number) {
		groups = groups.map((group, index) =>
			index === groupIndex
				? { ...group, deskripsi: group.deskripsi.filter((_, tpIndex2) => tpIndex2 !== tpIndex) }
				: group
		);
	}

	function removeGroup(groupIndex: number) {
		groups = groups.filter((_, index) => index !== groupIndex);
	}

	function handleBackToForm() {
		groups = [];
		resetError();
	}

	async function handleSave() {
		resetError();
		const cleaned = groups
			.map((group) => ({
				lingkupMateri: group.lingkupMateri.trim(),
				deskripsi: group.deskripsi.map((tp) => tp.trim()).filter((tp) => tp.length > 0)
			}))
			.filter((group) => group.lingkupMateri.length > 0 && group.deskripsi.length > 0);

		if (cleaned.length === 0) {
			errorMessage = 'Minimal satu lingkup materi dengan tujuan pembelajaran harus diisi.';
			return;
		}

		const formData = new FormData();
		cleaned.forEach((group, groupIndex) => {
			formData.append(`groups.${groupIndex}.lingkupMateri`, group.lingkupMateri);
			group.deskripsi.forEach((tp, tpIndex) => {
				formData.append(`groups.${groupIndex}.deskripsi.${tpIndex}`, tp);
			});
		});

		saving = true;
		try {
			const response = await fetch('?/aigenerate', {
				method: 'POST',
				body: formData
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				toast(body?.data?.fail || 'Gagal menyimpan tujuan pembelajaran.', 'error');
				return;
			}
			const data = (body?.data ?? {}) as Record<string, unknown>;
			toast(
				typeof data.message === 'string' ? data.message : 'Tujuan pembelajaran berhasil disimpan.',
				'success'
			);
			onSuccess(data);
		} catch {
			toast('Terjadi kesalahan saat menyimpan tujuan pembelajaran.', 'error');
		} finally {
			saving = false;
		}
	}

	function handleCancel() {
		onCancel();
	}
</script>

<dialog class="modal" open onclose={handleCancel}>
	{#snippet UnconfiguredMessage()}
		<span>
			Fitur AI belum aktif. Setel kunci API {isAdminUser ? '' : 'pribadi Anda '}di halaman
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- deep link to settings page AI key card -->
			<a class="link" href="/pengaturan#ai-key">Pengaturan</a>.
		</span>
	{/snippet}
	<div class="modal-box flex max-h-[90vh] flex-col p-4 sm:w-full sm:max-w-3xl">
		<h3 class="mb-2 text-xl font-bold">
			Generate Lingkup Materi dan Tujuan Pelajaran {mapelName}
			{kelasLabel}
		</h3>
		<p class="text-base-content/70 mb-4 text-sm">
			Fitur ini menggunakan AI untuk generate Materi beserta Tujuan Pembelajarannya menggunakan
			taksonomi SOLO.
		</p>

		<div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-1">
			{#if aiStatus !== 'unconfigured'}
				<div class="alert alert-info mb-4" role="note">
					<Icon name="info" />
					{#if isAgamaFamily}
						<span>
							Khusus sekolah negeri, pastikan menggunakan Capaian Pembelajaran dari
							<a
								class="link"
								href="https://drive.google.com/file/d/1kZnNYVitjQQqHtqVHGhuiMTdNFDqF3v1/view"
								target="_blank"
								rel="noreferrer">Keputusan Kepala BKPDM Nomor 020 Tahun 2026</a
							>.
						</span>
					{:else}
						<span>
							Khusus sekolah negeri, pastikan menggunakan Capaian Pembelajaran dari
							<a
								class="link"
								href="https://uploads.belajar.id/document/files/Kepka_BSKAP_No_01k17e8396ajn15j3hcw0k773b.pdf"
								target="_blank"
								rel="noreferrer">Keputusan Kepala BSKAP Nomor 046 tahun 2025</a
							>.
						</span>
					{/if}
				</div>
			{/if}

			{#if errorMessage}
				<div class="alert alert-error alert-soft mb-4" role="alert">
					<Icon name="error" />
					{#if errorMessage.startsWith('Fitur AI belum aktif')}
						{@render UnconfiguredMessage()}
					{:else}
						<span>{errorMessage}</span>
					{/if}
				</div>
			{/if}

			{#if aiStatus === 'checking'}
				<div class="alert alert-info alert-soft mb-4">
					<span class="loading loading-spinner loading-sm"></span>
					<span>Memeriksa ketersediaan fitur AI…</span>
				</div>
			{:else if aiStatus === 'unconfigured'}
				<div class="alert alert-warning mb-4" role="alert">
					<Icon name="warning" />
					{@render UnconfiguredMessage()}
				</div>
			{/if}

			{#if !hasGenerated}
				<div class="flex flex-col gap-4">
					<fieldset class="fieldset">
						<legend class="fieldset-legend font-semibold">Capaian Pembelajaran</legend>
						<textarea
							class="textarea validator bg-base-200 dark:bg-base-300 h-40 w-full dark:border-none"
							bind:value={capaianPembelajaran}
							placeholder="Tempel atau tulis Capaian Pembelajaran mata pelajaran ini"
							disabled={!isFormEnabled}></textarea>
					</fieldset>

					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<fieldset class="fieldset">
							<legend class="fieldset-legend font-semibold">Maksimal Lingkup Materi</legend>
							<input
								type="number"
								class="input bg-base-200 dark:bg-base-300 validator w-full dark:border-none"
								bind:value={maxLingkupMateri}
								min="1"
								max="20"
								step="1"
								disabled={!isFormEnabled}
							/>
						</fieldset>

						<fieldset class="fieldset">
							<legend class="fieldset-legend font-semibold">Maksimal Tujuan Pembelajaran</legend>
							<input
								type="number"
								class="input bg-base-200 dark:bg-base-300 validator w-full dark:border-none"
								bind:value={maxTujuanPembelajaran}
								min="1"
								max="20"
								step="1"
								disabled={!isFormEnabled}
							/>
						</fieldset>
					</div>
				</div>
			{:else}
				<div class="flex flex-col gap-4">
					{#each groups as group, groupIndex (groupIndex)}
						<div class="border-base-300 dark:border-none dark:bg-base-300/40 rounded-lg border p-3">
							<div class="mb-2 flex items-center gap-2">
								<span class="text-base-content/70 shrink-0 text-sm font-semibold">
									Lingkup {groupIndex + 1}
								</span>
								<input
									type="text"
									class="input bg-base-200 dark:bg-base-300 w-full dark:border-none"
									value={group.lingkupMateri}
									oninput={(event) =>
										updateLingkupMateri(
											groupIndex,
											(event.currentTarget as HTMLInputElement).value
										)}
									aria-label="Nama lingkup materi"
								/>
								<button
									type="button"
									class="btn btn-soft btn-error btn-sm shadow-none"
									title="Hapus lingkup materi ini"
									onclick={() => removeGroup(groupIndex)}
								>
									<Icon name="del" />
								</button>
							</div>
							<div class="flex flex-col gap-2">
								{#each group.deskripsi as tp, tpIndex (tpIndex)}
									<div class="flex items-start gap-2">
										<textarea
											class="textarea validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
											value={tp}
											maxlength="100"
											oninput={(event) =>
												updateDeskripsi(
													groupIndex,
													tpIndex,
													(event.currentTarget as HTMLTextAreaElement).value
												)}
											aria-label={`Tujuan pembelajaran ${tpIndex + 1}`}></textarea>
										<button
											type="button"
											class="btn btn-soft btn-error btn-sm shadow-none"
											title="Hapus tujuan pembelajaran ini"
											onclick={() => removeDeskripsi(groupIndex, tpIndex)}
										>
											<Icon name="del" />
										</button>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="modal-action justify-between">
			<button
				class="btn btn-soft shadow-none"
				type="button"
				onclick={handleCancel}
				disabled={generating || saving}
			>
				Batal
			</button>

			<div class="flex items-center gap-2">
				{#if hasGenerated}
					<button
						class="btn btn-soft shadow-none"
						type="button"
						onclick={handleBackToForm}
						disabled={generating || saving}
					>
						Kembali
					</button>
					<button
						class="btn btn-primary shadow-none"
						type="button"
						onclick={handleSave}
						disabled={saving}
						aria-busy={saving}
					>
						{#if saving}
							<span class="loading loading-spinner loading-sm"></span>
						{:else}
							<Icon name="save" />
						{/if}
						Simpan ke Halaman
					</button>
				{:else}
					<button
						class="btn btn-primary shadow-none"
						type="button"
						onclick={handleGenerate}
						disabled={generating || !isFormEnabled}
						aria-busy={generating}
					>
						{#if generating}
							<span class="loading loading-spinner loading-sm"></span>
						{:else}
							<Icon name="sparkles" />
						{/if}
						Generate
					</button>
				{/if}
			</div>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
