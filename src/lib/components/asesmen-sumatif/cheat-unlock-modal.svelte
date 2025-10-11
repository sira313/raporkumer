<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	interface Props {
		tokenText: string;
		errorMessage: string | null;
		onInput?: (value: string) => void;
	}

	let { tokenText, errorMessage, onInput }: Props = $props();
	let tokenOverride = $state<string | null>(null);
	const tokenValue = $derived.by(() => tokenOverride ?? tokenText);

	$effect(() => {
		if (tokenOverride != null && tokenOverride === tokenText) {
			tokenOverride = null;
		}
	});

	function handleInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		tokenOverride = target.value;
		onInput?.(target.value);
	}

	function handleSubmit(event: Event) {
		event.preventDefault();
	}
</script>

<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
	<div class="alert alert-warning">
		<Icon name="alert" />
		<div class="flex flex-col gap-2 sm:flex-row">
			<span>
				Ini adalah fitur cheat, donasi minimal 5 gelas kopi di tombol exclusive content. Token akan
				muncul di sana. Copy paste token ke kolom di bawah.
			</span>
			<a
				href="https://trakteer.id/raporkumer/showcase"
				target="_blank"
				rel="noopener noreferrer"
				class="btn my-auto shadow-none"
			>
				<Icon name="coffee" />
				Exclusive Content
			</a>
		</div>
	</div>

	<fieldset class="fieldset">
		<legend class="fieldset-legend"> Token Akses </legend>
		<input
			type="password"
			class={`input input-bordered dark:bg-base-200 w-full dark:border-none ${errorMessage ? 'input-error' : ''}`}
			placeholder="Masukkan token"
			autocomplete="off"
			value={tokenValue}
			oninput={handleInput}
		/>
		{#if errorMessage}
			<p class="label text-wrap">
				{errorMessage}
			</p>
		{/if}
		<p class="label text-wrap">
			Jika belum memiliki token, silakan dukung pengembangan Rapkumer melalui tombol Traktir agar
			fitur ini dapat kami buka.
		</p>
	</fieldset>
</form>
