<script lang="ts">
	import { page } from '$app/state';
	import { StorageState } from '$lib/state.svelte';
	import { searchQueryMarker } from '$lib/utils';
	import Icon from './icon.svelte';
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

	function isMenuActive(currentPath: string, menuPath?: string) {
		if (!menuPath) return false;

		// match to sub paths
		const normalizedPath = currentPath.replace(/\/+$/, '');
		const normalizedItemPath = menuPath.replace(/\/+$/, '');
		const active =
			normalizedPath === normalizedItemPath || normalizedPath.startsWith(normalizedItemPath + '/');
		return active;
	}
</script>

{#snippet menu_item(item: MenuItem)}
	{@const active = isMenuActive(page.url.pathname, item.path)}
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
			<!-- `class:menu-active` is shorthand for `class="{active ? 'menu-active': ''}"` -->
			<a class:menu-active={active} href={item.path}>
				<span>{@html searchQueryMarker(search, item.title)}</span>
			</a>
		{/if}
	</li>
{/snippet}

<div class="flex-1">
	<div class="mb-3 flex gap-1">
		<label class="input bg-base-200 ml-2 dark:border-none">
			<Icon name="search" />
			<input type="search" class="grow" bind:value={search} placeholder="Cari menu" />
		</label>
		<label
			class="btn swap btn-square shadow-none"
			title={expanded.value ? 'Sempitkan menu' : 'Luaskan menu'}
		>
			<input type="checkbox" bind:checked={expanded.value} />
			<span class="swap-on"><Icon name="expand-all" /></span>
			<span class="swap-off"><Icon name="collapse-all" /></span>
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
