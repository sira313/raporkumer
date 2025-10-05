import type { PageData, PageLoad } from './$types';

export const load: PageLoad = async ({ data }) => data as PageData;
