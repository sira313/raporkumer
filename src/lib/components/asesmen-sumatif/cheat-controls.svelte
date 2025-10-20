<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import CheatModal from '$lib/components/asesmen-sumatif/cheat-modal.svelte';
	import CheatUnlockModal from '$lib/components/asesmen-sumatif/cheat-unlock-modal.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { showModal, updateModal } from '$lib/components/global-modal.svelte';
	import { generateCheatResult } from '$lib/components/asesmen-sumatif/cheat-generator';
	import type { EntryDraft } from '$lib/components/asesmen-sumatif/types';
	import { normalizeScoreText, toInputText } from '$lib/components/asesmen-sumatif/utils';

	type CheatControlsProps = {
		entries: EntryDraft[];
		hasTujuan: boolean;
		initialNilaiAkhir: number | null;
		nilaiAkhir: number | null;
		disabled: boolean;
		cheatUnlocked: boolean;
		onapply?: (event: CustomEvent<CheatApplyDetail>) => void;
		onunlockChange?: (event: CustomEvent<CheatUnlockDetail>) => void;
	};

	type CheatApplyDetail = {
		entries: EntryDraft[];
		sasTesText: string;
		sasNonTesText: string;
	};

	type CheatUnlockDetail = {
		cheatUnlocked: boolean;
	};

	let {
		entries,
		hasTujuan,
		initialNilaiAkhir,
		nilaiAkhir,
		disabled: isDisabled,
		cheatUnlocked
	}: CheatControlsProps = $props();
	const dispatch = createEventDispatcher<{
		apply: CheatApplyDetail;
		unlockChange: CheatUnlockDetail;
	}>();

	const CHEAT_FEATURE_KEY = 'cheat-asesmen-sumatif';

	let cheatNilaiAkhirText = $state('');
	let cheatModalError = $state<string | null>(null);
	let cheatUnlockTokenText = $state('');
	let cheatUnlockError = $state<string | null>(null);
	let cheatUnlockBusy = false;
	let cheatUnlockedOverride = $state<boolean | null>(null);
	const cheatUnlockedState = $derived.by(() => cheatUnlockedOverride ?? cheatUnlocked);

	$effect(() => {
		if (!cheatUnlocked) {
			cheatUnlockedOverride = null;
		}
	});

	function syncCheatModalBody(): void {
		updateModal({
			bodyProps: {
				nilaiAkhirText: cheatNilaiAkhirText,
				errorMessage: cheatModalError,
				onInput: handleCheatInput
			}
		});
	}

	function handleCheatInput(value: string): void {
		cheatNilaiAkhirText = value;
		cheatModalError = null;
		syncCheatModalBody();
	}

	function syncCheatUnlockModalBody(): void {
		updateModal({
			bodyProps: {
				tokenText: cheatUnlockTokenText,
				errorMessage: cheatUnlockError,
				onInput: handleCheatUnlockInput
			}
		});
	}

	function setCheatUnlockBusyState(busy: boolean): void {
		cheatUnlockBusy = busy;
		updateModal({
			onPositive: {
				label: busy ? 'Memverifikasi...' : 'Verifikasi Token',
				icon: 'check',
				action: ({ close }) => handleCheatUnlockConfirm(close)
			}
		});
	}

	function handleCheatUnlockInput(value: string): void {
		cheatUnlockTokenText = value;
		cheatUnlockError = null;
		syncCheatUnlockModalBody();
	}

	async function requestCheatUnlock(
		token: string
	): Promise<{ success: boolean; message?: string }> {
		try {
			const response = await fetch('/api/feature-unlocks', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ featureKey: CHEAT_FEATURE_KEY, token })
			});
			if (!response.ok) {
				const errorResult = (await response.json().catch(() => null)) as {
					message?: string;
				} | null;
				return {
					success: false,
					message: errorResult?.message ?? 'Token tidak valid atau terjadi kesalahan.'
				};
			}
			const result = (await response.json().catch(() => null)) as {
				data?: { unlocked?: boolean };
				message?: string;
			} | null;
			return {
				success: Boolean(result?.data?.unlocked),
				message: result?.message
			};
		} catch (error) {
			console.error('Gagal memanggil API unlock cheat', error);
			return { success: false, message: 'Tidak dapat terhubung ke server. Coba lagi.' };
		}
	}

	async function handleCheatUnlockConfirm(close: () => void): Promise<void> {
		if (cheatUnlockBusy) return;
		setCheatUnlockBusyState(true);
		const token = cheatUnlockTokenText.trim();
		if (!token) {
			cheatUnlockError = 'Token tidak boleh kosong.';
			syncCheatUnlockModalBody();
			setCheatUnlockBusyState(false);
			return;
		}
		try {
			const result = await requestCheatUnlock(token);
			if (!result.success) {
				cheatUnlockError =
					result.message ?? 'Token tidak valid. Pastikan token sesuai setelah donasi.';
				syncCheatUnlockModalBody();
				setCheatUnlockBusyState(false);
				return;
			}
			cheatUnlockedOverride = true;
			dispatch('unlockChange', { cheatUnlocked: true });
			cheatUnlockTokenText = '';
			cheatUnlockError = null;
			setCheatUnlockBusyState(false);
			close();
			queueMicrotask(() => {
				openCheatModal();
			});
		} catch (error) {
			console.error('Gagal memverifikasi token cheat', error);
			cheatUnlockError = 'Terjadi kesalahan saat memverifikasi token. Coba lagi.';
			syncCheatUnlockModalBody();
			setCheatUnlockBusyState(false);
		}
	}

	function openCheatUnlockModal(): void {
		cheatUnlockTokenText = '';
		cheatUnlockError = null;
		cheatUnlockBusy = false;
		showModal({
			title: 'Buka Kunci Isi Sekaligus',
			body: CheatUnlockModal,
			bodyProps: {
				tokenText: cheatUnlockTokenText,
				errorMessage: cheatUnlockError,
				onInput: handleCheatUnlockInput
			},
			dismissible: true,
			onNegative: {
				label: 'Tutup',
				icon: 'close',
				action: ({ close }) => close()
			},
			onPositive: {
				label: 'Verifikasi Token',
				icon: 'check',
				action: ({ close }) => handleCheatUnlockConfirm(close)
			}
		});
	}

	function handleCheatConfirm(close: () => void): void {
		const normalized = normalizeScoreText(cheatNilaiAkhirText);
		if (normalized == null) {
			cheatModalError = 'Masukkan angka antara 0 sampai 100 dengan maksimal dua angka desimal.';
			syncCheatModalBody();
			return;
		}
		if (!entries.length) {
			cheatModalError = 'Tidak ada tujuan pembelajaran yang dapat diisi otomatis.';
			syncCheatModalBody();
			return;
		}
		const result = generateCheatResult(entries, normalized);
		if (!result) {
			cheatModalError = 'Gagal menghasilkan nilai acak yang valid. Coba lagi.';
			syncCheatModalBody();
			return;
		}
		dispatch('apply', {
			entries: result.drafts,
			sasTesText: toInputText(result.sasTes),
			sasNonTesText: toInputText(result.sasNonTes)
		});
		cheatModalError = null;
		close();
	}

	function openCheatModal(): void {
		if (!cheatUnlockedState) {
			openCheatUnlockModal();
			return;
		}
		if (!hasTujuan) return;
		cheatNilaiAkhirText = toInputText(initialNilaiAkhir ?? nilaiAkhir ?? null);
		cheatModalError = null;
		showModal({
			title: 'Fitur Cheat Nilai Sumatif',
			body: CheatModal,
			bodyProps: {
				nilaiAkhirText: cheatNilaiAkhirText,
				errorMessage: cheatModalError,
				onInput: handleCheatInput
			},
			dismissible: true,
			onNegative: {
				label: 'Batal',
				icon: 'close',
				action: ({ close }) => close()
			},
			onPositive: {
				label: 'Terapkan',
				icon: 'check',
				action: ({ close }) => handleCheatConfirm(close)
			}
		});
	}
</script>

<button
	type="button"
	class="btn btn-soft shadow-none"
	onclick={openCheatModal}
	disabled={(!hasTujuan && cheatUnlockedState) || isDisabled}
>
	<Icon name={cheatUnlockedState ? 'copy' : 'lock'} />
	{cheatUnlockedState ? 'Isi Sekaligus' : 'Isi Sekaligus (Terkunci)'}
</button>
