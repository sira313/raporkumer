interface MenuItem {
	title: string;
	path?: string;
	icon?: string;
	subMenu?: MenuItem[];
}

interface PageMeta {
	title: string;
	description?: string;
}

type MaybePromise<T> = T | Promise<T>;
