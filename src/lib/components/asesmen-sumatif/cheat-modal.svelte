<script lang="ts">
  import Icon from '$lib/components/icon.svelte';
	interface Props {
		nilaiAkhirText: string;
		errorMessage: string | null;
		onInput?: (value: string) => void;
	}

	let { nilaiAkhirText, errorMessage, onInput }: Props = $props();
	let nilaiAkhirLocal = $state<string>(nilaiAkhirText);

	$effect(() => {
		nilaiAkhirLocal = nilaiAkhirText;
	});

	function handleInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		nilaiAkhirLocal = target.value;
		onInput?.(target.value);
	}
</script>

<div class="flex flex-col gap-4">
	<div class="alert alert-warning mt-3">
		<Icon name="alert" />
		<span>
			Menggunakan fitur ini membuat penilaian menjadi tidak objektif. Resiko dan beban moral
			ditanggung masing-masing.
		</span>
	</div>

	<label class="flex flex-col sm:flex-row gap-2">
		<div class="label">
			<span class="text-wrap">Target nilai akhir untuk ditampilkan di rapor</span>
		</div>
		<input
			class={`input input-bordered dark:bg-base-200 dark:border-none ${errorMessage ? 'input-error' : ''}`}
			placeholder="Contoh: 87.5"
			type="number"
			min="0"
			max="100"
			step="0.01"
			autocomplete="off"
			value={nilaiAkhirLocal}
			oninput={handleInput}
		/>
		{#if errorMessage}
			<div class="label">
				<span class="label-text-alt text-error">{errorMessage}</span>
			</div>
		{/if}
	</label>

	<p class="text-base-content/60 text-xs">
		Nilai akan dibagikan secara acak ke setiap tujuan pembelajaran dengan memastikan total akhir
		sesuai dengan target yang dimasukkan.
	</p>
</div>
