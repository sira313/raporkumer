interface MenuItem {
	title: string;
	path?: string;
	icon?: IconName;
	tags?: string[];
	subMenu?: MenuItem[];
}

interface PageMeta {
	title?: string;
	description?: string;
	logoUrl?: string;
}

type MaybePromise<T> = T | Promise<T>;

type FormSubmitEvent = SubmitEvent & { currentTarget: EventTarget & HTMLFormElement };

type OptId<T, ID = number> = Omit<T, 'id'> & { id?: ID };
