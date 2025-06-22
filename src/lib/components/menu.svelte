<script lang="ts">
	import IconSearch from '$lib/icons/search.svg?raw';
	import { searchQueryMarker } from '$lib/utils';
	import { appMenuItems } from './menu';

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
			<details open>
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
	<label class="input input-sm mb-3">
		{@html IconSearch}
		<input type="search" class="grow" bind:value={search} placeholder="Cari menu" />
	</label>

	{#each menuItems as menu (menu)}
		{@render menu_item(menu)}
	{/each}
</div>
