<script lang="ts">
	let { name, class: classes }: { name: IconName; class?: string } = $props();

	const iconModules = {
		...import.meta.glob('../icons/*.svg', {
			query: '?raw',
			eager: true
		}),
		...import.meta.glob('/src/lib/icons/*.svg', {
			query: '?raw',
			eager: true
		})
	} as Record<string, { default: string }>;

	const iconMap = (() => {
		const map = {} as Record<IconName, string | undefined>;
		for (const [path, mod] of Object.entries(iconModules)) {
			const normalized = path.replace(/\\/g, '/');
			const match = normalized.match(/([^/]+)\.svg$/);
			if (match) {
				map[match[1] as IconName] = mod.default;
			}
		}
		return map;
	})();

	const icon = $derived(iconMap[name]);
</script>

{#if icon}
	{@html classes ? icon.replace('<svg', `<svg class="${classes}" `) : icon}
{:else}
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5"> </svg>
{/if}
