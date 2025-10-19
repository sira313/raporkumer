<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from './icon.svelte';

	const STORAGE_KEY = 'dark-mode';
	const LIGHT_THEME = 'light';
	const DARK_THEME = 'dark';

	let isDark = false;
	let hasStoredPreference = false;
	let mediaQuery: MediaQueryList | null = null;

	function resolveStoredTheme(raw: string | null) {
		if (!raw) return null;
		if (raw === DARK_THEME || raw === LIGHT_THEME) return raw;
		if (raw === 'true' || raw === 'false') {
			return raw === 'true' ? DARK_THEME : LIGHT_THEME;
		}
		return null;
	}

	function applyTheme(theme: string, persist: boolean) {
		document.documentElement.setAttribute('data-theme', theme);
		if (persist) {
			localStorage.setItem(STORAGE_KEY, theme);
		} else if (!hasStoredPreference) {
			localStorage.removeItem(STORAGE_KEY);
		}
	}

	function handleSystemChange(event: MediaQueryListEvent) {
		if (hasStoredPreference) return;
		const theme = event.matches ? DARK_THEME : LIGHT_THEME;
		isDark = theme === DARK_THEME;
		applyTheme(theme, false);
	}

	function handleToggle(event: Event) {
		isDark = (event.currentTarget as HTMLInputElement).checked;
		hasStoredPreference = true;
		applyTheme(isDark ? DARK_THEME : LIGHT_THEME, true);
	}

	onMount(() => {
		const storedTheme = resolveStoredTheme(localStorage.getItem(STORAGE_KEY));
		if (storedTheme) {
			hasStoredPreference = true;
			isDark = storedTheme === DARK_THEME;
		} else {
			mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			isDark = mediaQuery.matches;
			mediaQuery.addEventListener('change', handleSystemChange);
		}
		applyTheme(isDark ? DARK_THEME : LIGHT_THEME, hasStoredPreference);
		return () => {
			mediaQuery?.removeEventListener('change', handleSystemChange);
		};
	});
</script>

<label
	class="btn btn-ghost btn-circle swap swap-rotate shadow-none"
	title={isDark ? 'Light mode' : 'Dark mode'}
	aria-label="Toggle color theme"
>
	<input
		type="checkbox"
		class="theme-controller"
		value={DARK_THEME}
		bind:checked={isDark}
		on:change={handleToggle}
	/>
	<span class="swap-on text-xl">
		<Icon name="sun" />
	</span>
	<span class="swap-off text-xl">
		<Icon name="moon" />
	</span>
</label>
