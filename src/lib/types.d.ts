interface MenuItem {
	title: string;
	path?: string;
	icon?: string;
	subMenu?: MenuItem[];
}

interface PageMeta {
	title: string;
	description?: string;
	sekolah?: Sekolah;
}

type MaybePromise<T> = T | Promise<T>;

type FormSubmitEvent = SubmitEvent & { currentTarget: EventTarget & HTMLFormElement };
