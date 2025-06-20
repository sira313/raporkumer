/*
Global state is just fine for adapter-static
see: 
- https://github.com/sveltejs/kit/issues/8614
- https://kit.svelte.dev/docs/state-management
*/

export const appName = 'Rapor Kurikulum Merdeka';

export const pageMeta = $state<PageMeta>({ title: '' });

export function setPageTitle(title?: string) {
	pageMeta.title = title || '';
}
