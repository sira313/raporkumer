<script>
	import DarkModeIcon from '$lib/icons/moon.svg?raw';
	import LightModeIcon from '$lib/icons/sun.svg?raw';
	import { onMount } from 'svelte';

	let dark_mode = false;

	function toggle() {
		dark_mode = !dark_mode;
		// Set localStorage hanya setelah user klik toggle
		localStorage.setItem('dark-mode', JSON.stringify(dark_mode));
		set_class();
	}

	function set_class() {
		document.documentElement.setAttribute('data-theme', dark_mode ? 'dark' : 'light');
	}

	onMount(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		let pref = window.localStorage.getItem('dark-mode');
		if (pref === null) {
			// Pertama kali load, ikut sistem
			dark_mode = mq.matches;
			mq.addEventListener('change', (e) => {
				// Hanya update jika user belum override dengan localStorage
				if (window.localStorage.getItem('dark-mode') === null) {
					dark_mode = e.matches;
					set_class();
				}
			});
		} else {
			// Jika sudah pernah toggle, pakai preferensi user
			dark_mode = pref === 'true';
		}
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
