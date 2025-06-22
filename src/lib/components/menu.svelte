<script lang="ts">
	import IconCollapseAll from '$lib/icons/collapse-all.svg?raw';
	import IconExpandAll from '$lib/icons/expand-all.svg?raw';
	import IconSearch from '$lib/icons/search.svg?raw';
	import { StorageState } from '$lib/state.svelte';
	import { searchQueryMarker } from '$lib/utils';
	import { appMenuItems } from './menu';

	const expanded = new StorageState<boolean>('menu-expanded');

	let search = $state('');
	let menuItems = $derived(search ? filterMenuByTitle(appMenuItems, search) : appMenuItems);

	function filterMenuByTitle(menu: MenuItem[], search: string): MenuItem[] {
		const lowerSearch = search.toLowerCase();
		return menu
			.map((item) => {
				const isMatch = item.title.toLowerCase().includes(lowerSearch);

				// if it has subMenu, filter recursively
				const filteredSubMenu = item.subMenu ? filterMenuByTitle(item.subMenu, search) : [];

				// keep this item if it matches or has matching children
				if (isMatch || filteredSubMenu.length > 0) {
					return {
						...item,
						subMenu: filteredSubMenu.length > 0 ? filteredSubMenu : undefined
					};
				}

				// discard
				return null;
			})
			.filter((item) => item !== null);
	}
</script>

{#snippet menu_item(item: MenuItem)}
	<li>
		{#if item.subMenu}
			<details open={expanded.value || !!search}>
				<summary>
					<span>{@html searchQueryMarker(search, item.title)}</span>
				</summary>
				<ul>
					{#each item.subMenu as menu (menu)}
						{@render menu_item(menu)}
					{/each}
				</ul>
			</details>
		{:else}
			<a href={item.path}>
				<span>{@html searchQueryMarker(search, item.title)}</span>
			</a>
		{/if}
	</li>
{/snippet}

<div class="flex-1">
	<div class="mb-3 flex gap-1">
		<label class="input bg-base-200 ml-2 dark:border-none">
			{@html IconSearch}
			<input type="search" class="grow" bind:value={search} placeholder="Cari menu" />
		</label>
		<label
			class="btn swap btn-square shadow-none"
			title={expanded.value ? 'Sempitkan menu' : 'Luaskan menu'}
		>
			<input type="checkbox" bind:checked={expanded.value} />
			<span class="swap-on">{@html IconExpandAll}</span>
			<span class="swap-off">{@html IconCollapseAll}</span>
		</label>
	</div>

	{#each menuItems as menu (menu)}
		{@render menu_item(menu)}
	{:else}
		<li>
			<span class="italic opacity-50 text-sm"> Tidak ada hasil pencarian </span>
		</li>
	{/each}
</div>
