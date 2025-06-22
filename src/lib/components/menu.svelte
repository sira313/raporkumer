<script lang="ts">
	import IconCollapseAll from '$lib/icons/collapse-all.svg?raw';
	import IconExpandAll from '$lib/icons/expand-all.svg?raw';
	import IconSearch from '$lib/icons/search.svg?raw';
	import { searchQueryMarker } from '$lib/utils';
	import { appMenuItems } from './menu';

	let search = $state('');
	let expanded = $derived(false || !!search);
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
			<details open={expanded}>
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
	<div class="mb-3 flex gap-2">
		<label class="input input-sm">
			{@html IconSearch}
			<input type="search" class="grow" bind:value={search} placeholder="Cari menu" />
		</label>
		<label class="swap" title={expanded ? 'Sempitkan menu' : 'Luaskan menu'}>
			<input type="checkbox" bind:checked={expanded} />
			<span class="swap-on h-4 w-4">{@html IconExpandAll}</span>
			<span class="swap-off h-4 w-4">{@html IconCollapseAll}</span>
		</label>
	</div>

	{#each menuItems as menu (menu)}
		{@render menu_item(menu)}
	{/each}
</div>
