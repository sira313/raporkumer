<script>
	import Icon from './icon.svelte';
</script>

<div role="alert" class="alert bg-base-100 mx-auto mb-6 max-w-4xl shadow-none">
	<div class="flex w-full flex-col sm:flex-row sm:items-center sm:gap-4">
		<div class="flex flex-1 items-center gap-4">
			<Icon name="info" class="text-info h-5 w-5 shrink-0" />
			<p class="prose w-full max-w-full">
				Aplikasi ini <b>gratis dan tidak diperjualbelikan</b>. Jika Bapak/Ibu merasa terbantu,
				pertimbangkan untuk mendukung kami melalui tombol traktir.
			</p>
		</div>

		<div class="mt-4 self-end sm:mt-0 sm:self-center">
			<a
				href="https://trakteer.id/raporkumer/tip"
				target="_blank"
				rel="noopener noreferrer"
				class="btn btn-warning shadow-none"
			>
				<Icon name="coffee" />
				Traktir
			</a>
		</div>
	</div>
</div>
