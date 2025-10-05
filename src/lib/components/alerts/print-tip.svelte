<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	interface Props {
		title?: string;
		message?: string;
		subMessage?: string;
		buttonLabel?: string;
		onPrint?: () => void;
	}

	let {
		title = 'Petunjuk Cetak',
		message = 'Gunakan ukuran kertas A4 (orientasi potret) dan sistem akan menyembunyikan header/footer bawaan.',
		subMessage = 'Aktifkan opsi "Background graphics" di dialog cetak agar logo tetap jelas jika tersedia.',
		buttonLabel = 'Cetak',
		onPrint
	}: Props = $props();
</script>

<div class="alert alert-info shadow-md mb-4 items-start gap-4 print:hidden">
	<span class="flex h-10 w-10 items-center justify-center rounded-full bg-info-content/10 text-info-content">
		<Icon name="info" class="h-5 w-5" />
	</span>
	<div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="space-y-1">
			<h3 class="font-semibold text-base">{title}</h3>
			<p class="text-sm leading-relaxed">{message}</p>
			{#if subMessage}
				<p class="text-xs text-base-content/70">{subMessage}</p>
			{/if}
		</div>
		<button
			type="button"
			class="btn btn-primary shadow-none sm:btn-sm"
			onclick={() => onPrint?.()}
			title="Mulai cetak"
			aria-label="Mulai cetak"
		>
			<Icon name="print" />
			{buttonLabel}
		</button>
	</div>
</div>
