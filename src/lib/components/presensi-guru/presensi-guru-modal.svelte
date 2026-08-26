<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { hideModal, updateModal } from '$lib/components/global-modal.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { onMount } from 'svelte';

	interface Props {
		jamMasuk?: string | null;
		jamPulang?: string | null;
		tanggalJam?: string | null;
	}

	let { jamMasuk = null, jamPulang = null, tanggalJam = null }: Props = $props();

	type Status = 'hadir' | 'izin' | 'sakit' | 'dinas_luar';

	const STATUS_OPTIONS: Array<{ value: Status; label: string }> = [
		{ value: 'hadir', label: 'Hadir' },
		{ value: 'izin', label: 'Izin' },
		{ value: 'sakit', label: 'Sakit' },
		{ value: 'dinas_luar', label: 'Dinas Luar' }
	];

	let step = $state<'pilih' | 'paraf'>('pilih');
	let selectedStatus = $state<Status>('hadir');
	let submitting = $state(false);

	let canvasEl: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let drawing = $state(false);
	let hasSignature = $state(false);
	let lastX = 0;
	let lastY = 0;

	const CANVAS_W = 400;
	const CANVAS_H = 400;

	function initCanvas(el: HTMLCanvasElement) {
		canvasEl = el;
		const context = el.getContext('2d');
		if (!context) return;
		ctx = context;
		return {
			destroy() {
				ctx = null;
			}
		};
	}

	onMount(() => {
		updateModal({
			onPositive: undefined,
			onNegative: undefined,
			onNeutral: undefined
		});
	});

	function getPos(e: MouseEvent | TouchEvent) {
		const rect = canvasEl.getBoundingClientRect();
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
		return {
			x: ((clientX - rect.left) / rect.width) * CANVAS_W,
			y: ((clientY - rect.top) / rect.height) * CANVAS_H
		};
	}

	function startDraw(e: MouseEvent | TouchEvent) {
		if (!ctx) return;
		drawing = true;
		const pos = getPos(e);
		lastX = pos.x;
		lastY = pos.y;
		ctx.beginPath();
		ctx.moveTo(lastX, lastY);
	}

	function draw(e: MouseEvent | TouchEvent) {
		if (!drawing || !ctx) return;
		e.preventDefault();
		const pos = getPos(e);
		ctx.strokeStyle = '#000000';
		ctx.lineWidth = 18;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.lineTo(pos.x, pos.y);
		ctx.stroke();
		hasSignature = true;
	}

	function endDraw() {
		drawing = false;
	}

	function clearSignature() {
		if (!ctx) return;
		ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
		hasSignature = false;
	}

	function getSignatureData(): string | null {
		if (!canvasEl || !hasSignature) return null;
		return canvasEl.toDataURL('image/png');
	}

	function pilihHadir() {
		selectedStatus = 'hadir';
		step = 'paraf';
		updateModal({
			onPositive: { label: 'Simpan', class: 'btn-primary', action: () => submit() },
			onNegative: { label: 'Kembali', action: () => goBack() },
			onNeutral: undefined
		});
	}

	function goBack() {
		step = 'pilih';
		updateModal({
			onPositive: undefined,
			onNegative: undefined,
			onNeutral: undefined
		});
	}

	async function submit() {
		if (submitting) return;
		if (selectedStatus === 'hadir' && !hasSignature) {
			toast('Silakan buat paraf terlebih dahulu.', 'warning');
			return;
		}
		submitting = true;
		try {
			const res = await fetch('/api/presensi-guru', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					status: selectedStatus,
					tandaTangan: selectedStatus === 'hadir' ? getSignatureData() : null,
					tanggalJam: tanggalJam
				})
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error((data as { message?: string }).message ?? `Error ${res.status}`);
			}
			hideModal();
			await invalidate('app:presensi-guru');
			toast('Presensi berhasil disimpan. Terima kasih!', 'success');
		} catch (e) {
			toast(e instanceof Error ? e.message : 'Gagal menyimpan presensi', 'error');
		} finally {
			submitting = false;
		}
	}

	function handleSimpan() {
		if (selectedStatus === 'hadir') {
			pilihHadir();
			return;
		}
		void submit();
	}

	const windowLabel = $derived.by(() => {
		if (!jamMasuk && !jamPulang) return null;
		return `${jamMasuk ?? '?'} - ${jamPulang ?? '?'}`;
	});

	const simulasiLabel = $derived.by(() => {
		if (!tanggalJam) return null;
		const d = new Date(tanggalJam);
		if (Number.isNaN(d.getTime())) return tanggalJam;
		return `${d.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		})} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
	});
</script>

<div class="not-prose flex flex-col gap-4">
	{#if simulasiLabel}
		<div class="alert alert-soft alert-warning flex items-center gap-2">
			<Icon name="alert" class="h-5 w-5 shrink-0" />
			<span class="text-sm"
				>Mode simulasi — waktu dicatat sebagai: <strong>{simulasiLabel}</strong></span
			>
		</div>
	{/if}
	{#if step === 'pilih'}
		<div class="space-y-3">
			<div class="alert alert-soft alert-info flex items-start gap-2">
				<Icon name="info" class="mt-0.5 h-5 w-5 shrink-0" />
				<span class="text-sm">
					Bapak/Ibu belum melakukan presensi hari ini. Silakan lakukan presensi sebelum jam pulang.
					{#if windowLabel}
						<br />
						<span class="font-semibold">Jam presensi: {windowLabel}</span>
					{/if}
				</span>
			</div>
			<div class="space-y-4">
				<label class="flex flex-col gap-1">
					<span class="text-sm font-semibold">Status Kehadiran</span>
					<select
						class="select bg-base-200 w-full dark:border-none"
						bind:value={selectedStatus}
						disabled={submitting}
					>
						{#each STATUS_OPTIONS as opt (opt.value)}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</label>
				<button
					type="button"
					class="btn btn-primary w-full shadow-none"
					disabled={submitting}
					onclick={handleSimpan}
				>
					<Icon name={selectedStatus === 'hadir' ? 'pen' : 'save'} />
					{selectedStatus === 'hadir' ? 'Paraf' : 'Simpan'}
				</button>
			</div>
		</div>
	{:else}
		<div class="space-y-3">
			<p class="text-base-content/80 text-sm">Buat paraf Bapak/Ibu pada kotak di bawah ini.</p>
			<div class="border-base-300 overflow-hidden rounded-md border bg-base-300">
				<canvas
					use:initCanvas
					width={CANVAS_W}
					height={CANVAS_H}
					class="bg-white mx-auto w-full max-w-52 cursor-crosshair touch-none"
					style="aspect-ratio: {CANVAS_W}/{CANVAS_H}; min-height: 180px;"
					onmousedown={startDraw}
					onmousemove={draw}
					onmouseup={endDraw}
					onmouseleave={endDraw}
					ontouchstart={startDraw}
					ontouchmove={draw}
					ontouchend={endDraw}
				></canvas>
			</div>
			<div class="flex items-center justify-between gap-2">
				<p class="text-base-content/50 text-xs">Hanya paraf, bukan tanda tangan.</p>
				{#if hasSignature}
					<button
						type="button"
						class="btn btn-soft btn-error btn-sm shadow-none"
						onclick={clearSignature}
						disabled={submitting}
					>
						<Icon name="del" />
						Hapus
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
