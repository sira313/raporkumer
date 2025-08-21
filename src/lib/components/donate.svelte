<script>
	import Icon from './icon.svelte';
</script>

<div role="alert" class="alert bg-base-100 mx-auto mb-6 w-full max-w-4xl">
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div class="flex items-start gap-2 md:items-center">
			<Icon name="info" class="text-info text-xl" />
			<span>
				Aplikasi ini <span class="font-semibold">gratis dan tidak diperjualbelikan</span>. Jika
				Bapak/Ibu merasa terbantu, pertimbangkan untuk mendukung kami melalui tombol traktir.
			</span>
		</div>
		<a
			target="_blank"
			href="https://trakteer.id/raporkumer/tip"
			class="btn btn-warning btn-sm ml-auto shadow-none transition-transform hover:scale-105 md:ml-0 md:self-center"
		>
			<Icon name="coffee" />
			Traktir kopi
		</a>
	</div>
</div>
