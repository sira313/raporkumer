import SvelteURLSearchParams from '$lib/svelte-helpers/url-search-params';

/**
 * Build URL dengan parameter updates
 */
export function buildUrl(
	currentPathname: string,
	currentSearch: string,
	updateParams: (params: SvelteURLSearchParams) => void
): string | null {
	const params = new SvelteURLSearchParams(currentSearch);
	updateParams(params);
	const nextQuery = params.toString();
	const nextUrl = `${currentPathname}${nextQuery ? `?${nextQuery}` : ''}`;
	const currentUrl = `${currentPathname}${currentSearch}`;
	return nextUrl === currentUrl ? null : nextUrl;
}

/**
 * Template untuk aksi navigasi
 */
export function createNavigationActions(
	currentPathname: string,
	currentSearch: string,
	navigateFn: (url: string) => Promise<void>
) {
	return {
		async applyNavigation(updateParams: (params: SvelteURLSearchParams) => void) {
			const target = buildUrl(currentPathname, currentSearch, updateParams);
			if (!target) return;
			await navigateFn(target);
		},

		async selectKeasramaan(value: string) {
			await this.applyNavigation((params) => {
				if (value) {
					params.set('keasramaan_id', value);
				} else {
					params.delete('keasramaan_id');
				}
				params.delete('page');
			});
		},

		async applySearch(value: string) {
			await this.applyNavigation((params) => {
				const cleaned = value.trim();
				if (cleaned) {
					params.set('q', cleaned);
				} else {
					params.delete('q');
				}
				params.delete('page');
			});
		},

		async gotoPage(pageNumber: number) {
			const sanitized = pageNumber < 1 ? 1 : pageNumber;
			await this.applyNavigation((params) => {
				// Pertahankan keasramaan_id saat navigasi pagination
				// Hanya update parameter page
				if (sanitized <= 1) {
					params.delete('page');
				} else {
					params.set('page', String(sanitized));
				}
			});
		}
	};
}
