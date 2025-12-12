<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	type Props = {
		value: string;
		disabled?: boolean;
		onInput?: (event: Event) => void;
		onSubmit?: (event: Event) => void;
	};

	let { value, disabled = false, onInput, onSubmit }: Props = $props();

	function handleSubmit(event: Event) {
		event.preventDefault();
		onSubmit?.(event);
	}
</script>

<form
	class="w-full"
	autocomplete="off"
	data-sveltekit-keepfocus
	data-sveltekit-replacestate
	onsubmit={handleSubmit}
>
	<label class="input bg-base-200 dark:bg-base-300 w-full dark:border-none">
		<Icon name="search" />
		<input
			type="search"
			name="q"
			{value}
			{disabled}
			autocomplete="off"
			placeholder="Cari nama murid..."
			oninput={onInput}
		/>
	</label>
</form>
