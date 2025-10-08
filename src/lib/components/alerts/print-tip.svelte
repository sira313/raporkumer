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

<div class="alert bg-base-100 mb-4 items-start gap-4 shadow-md print:hidden">
	<span class="flex h-10 w-10 items-center justify-center rounded-full">
		<Icon name="info" class="h-5 w-5" />
	</span>
	<div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="space-y-1">
			<h3 class="text-base font-semibold">{title}</h3>
			<p class="text-sm leading-relaxed">{message}</p>
			{#if subMessage}
				<p class="text-base-content/70 text-xs">{subMessage}</p>
			{/if}
		</div>
		<button
			type="button"
			class="btn btn-primary sm:btn-sm shadow-none"
			onclick={() => onPrint?.()}
			title="Mulai cetak"
			aria-label="Mulai cetak"
		>
			<Icon name="print" />
			{buttonLabel}
		</button>
	</div>
</div>
