<script>
	import DarkModeIcon from '$lib/icons/moon.svg?raw';
	import LightModeIcon from '$lib/icons/sun.svg?raw';
	import { onMount } from 'svelte';

	let dark_mode = $state(false);

	function toggle() {
		dark_mode = !dark_mode;
		localStorage.setItem('dark-mode', JSON.stringify(dark_mode));
		set_class();
	}

	function set_class() {
		const doc = document.documentElement;
		doc.setAttribute('data-theme', dark_mode ? 'dark' : 'light');
	}

	onMount(() => {
		let pref = window.localStorage.getItem('dark-mode');
		if (!pref) {
			const system = window.matchMedia('(prefers-color-scheme: dark)').matches;
			pref = JSON.stringify(system);
		}
		dark_mode = pref == 'true';
		set_class();
	});
</script>

<button
	class="btn btn-ghost btn-circle"
	title={dark_mode ? 'Light mode' : 'Dark mode'}
	onclick={toggle}
>
	{@html dark_mode ? LightModeIcon : DarkModeIcon}
</button>
