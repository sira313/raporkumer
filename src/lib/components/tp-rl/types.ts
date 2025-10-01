export type GroupEntry = {
	id?: number;
	deskripsi: string;
	deleted?: boolean;
};

export type GroupFormState = {
	mode: 'create' | 'edit';
	lingkupMateri: string;
	entries: GroupEntry[];
	targetIds: number[];
};

export type SelectedGroupState = {
	lingkupMateri: string;
	ids: number[];
};
