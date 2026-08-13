<script>
	import Icon from './icon.svelte';
	import { openQrisImage } from './qris-image-modal';
</script>

<div role="alert" class="card bg-base-100 max-full mb-4 p-4 shadow-md">
	<div class="flex w-full flex-col sm:flex-row sm:items-center sm:gap-4">
		<div class="flex flex-1 items-center gap-4">
			<Icon name="info" class="text-info h-5 w-5 shrink-0" />
			<p class="prose w-full max-w-full">
				Aplikasi ini <b>gratis dan tidak diperjualbelikan</b>. Jika Bapak/Ibu merasa terbantu,
				pertimbangkan untuk mendukung kami melalui tombol QRIS.
			</p>
		</div>

		<div class="mt-4 self-end sm:mt-0 sm:self-center">
			<button type="button" class="btn btn-warning shadow-none" onclick={openQrisImage}>
				<Icon name="grid" />
				QRIS
			</button>
		</div>
	</div>
</div>
