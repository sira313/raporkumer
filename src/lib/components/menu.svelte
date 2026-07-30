<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import { page } from '$app/state';
	import { StorageState } from '$lib/state.svelte';
	import { searchQueryMarker } from '$lib/utils';
	import Icon from './icon.svelte';
	import { appMenuItems } from './menu';

	const expanded = new StorageState<boolean>('menu-expanded');

	let search = $state('');
	const activeSemesterTipe = $derived(
		(page.data as { activeSemesterTipe?: string | null } | null)?.activeSemesterTipe ?? null
	);

	const readonlyRoutes = [
		'/sekolah',
		'/akademik',
		'/kelas',
		'/murid',
		'/kokurikuler',
		'/ekstrakurikuler',
		'/keasramaan',
		'/asesmen-kokurikuler',
		'/nilai-ekstrakurikuler',
		'/asesmen-keasramaan',
		'/absen',
		'/jurnal-mengajar',
		'/catatan-wali-kelas',
		'/keputusan',
		'/cetak'
	];

	const adminOnlyRoutes = ['/buku-tamu'];

	const userType = $derived((page.data as { user?: { type?: string } })?.user?.type);
	const hasMataPelajaran = $derived(
		!!(page.data as { hasMataPelajaran?: boolean })?.hasMataPelajaran
	);
	const isGuruMapel = $derived(userType === 'user' && hasMataPelajaran);

	function isHiddenForUser(path: string): boolean {
		// Admin-only pages (buku tamu) — hidden from all non-admin
		if (userType !== 'admin') {
			const isAdminOnly = adminOnlyRoutes.some((r) => path === r || path.startsWith(r + '/'));
			if (isAdminOnly) return true;
		}

		// Guru mapel type-based restrictions (readonly pages)
		if (userType !== 'user') return false;
		const inReadonly = readonlyRoutes.some((r) => path === r || path.startsWith(r + '/'));
		if (!inReadonly) return false;
		// Exceptions for guru mapel with mata pelajaran (mirip disableInteraction)
		if (isGuruMapel) {
			const exceptions = ['/absen', '/jurnal-mengajar', '/cetak'];
			const isException = exceptions.some((r) => path === r || path.startsWith(r + '/'));
			if (isException) return false;
		}
		return true;
	}

	function filterMenuByUserType(items: MenuItem[]): MenuItem[] {
		return items
			.map((item) => {
				if (item.path && isHiddenForUser(item.path)) return null;
				if (item.subMenu) {
					const filtered = filterMenuByUserType(item.subMenu);
					if (filtered.length === 0 && !item.path) return null;
					return { ...item, subMenu: filtered };
				}
				return item;
			})
			.filter((item): item is MenuItem => item !== null);
	}

	function filterByCondition(item: MenuItem, semesterTipe: string | null): boolean {
		if (item.condition && item.condition !== semesterTipe) return false;
		if (item.subMenu) {
			const hasVisibleChild = item.subMenu.some((child) => filterByCondition(child, semesterTipe));
			if (!hasVisibleChild) return false;
		}
		return true;
	}

	function filterMenu(menu: MenuItem[], search: string): MenuItem[] {
		const lowerSearch = search.toLowerCase();
		return menu
			.map((item) => {
				if (!filterByCondition(item, activeSemesterTipe)) return null;

				const isMatch =
					item.title.toLowerCase().includes(lowerSearch) ||
					item.tags?.some((t) => t.toLocaleLowerCase().includes(lowerSearch));

				// if it has subMenu, filter recursively
				const filteredSubMenu = item.subMenu ? filterMenu(item.subMenu, search) : [];

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

	let menuItems = $derived(
		filterMenuByUserType(
			search
				? filterMenu(appMenuItems, search)
				: appMenuItems.filter((item) => filterByCondition(item, activeSemesterTipe))
		)
	);

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
					{@render menu_item_label(item)}
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
				{@render menu_item_label(item)}
			</a>
		{/if}
	</li>
{/snippet}

{#snippet menu_item_label(item: MenuItem)}
	{#if item.icon}
		<Icon name={item.icon} />
	{/if}
	<span>{@html searchQueryMarker(search, item.title)}</span>
	{#if search && item.tags?.length}
		<div class="badge badge-xs badge-accent" title="Termasuk di dalam menu">tag</div>
	{/if}
{/snippet}

<div class="flex-1">
	<div class="mb-3 flex gap-1">
		<label class="input bg-base-200 dark:bg-base-300 rounded-box dark:border-none">
			<Icon name="search" />
			<input type="search" class="grow" bind:value={search} placeholder="Cari menu" />
		</label>
		<label
			class="btn swap btn-square rounded-box shadow-none"
			title={expanded.value ? 'Sempitkan menu' : 'Luaskan menu'}
		>
			<input type="checkbox" bind:checked={expanded.value} />
			<span class="swap-on"><Icon name="expand-all" /></span>
			<span class="swap-off"><Icon name="collapse-all" /></span>
		</label>
	</div>
	<div
		class="lg:bg-base-200 lg:rounded-box lg:max-h-[calc(100vh-13.5rem)] lg:overflow-y-auto lg:shadow-inner"
	>
		{#each menuItems as menu (menu)}
			{@render menu_item(menu)}
		{:else}
			<li>
				<span class="italic opacity-50 text-sm"> Tidak ada hasil pencarian </span>
			</li>
		{/each}
	</div>
</div>
