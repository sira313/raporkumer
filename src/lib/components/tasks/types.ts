export type TaskStatus = 'active' | 'completed';

export type TaskRecord = {
	id: number;
	title: string;
	status: TaskStatus;
	createdAt: string;
	updatedAt: string | null;
	kelasId: number | null;
};

export type ApiResponse<T> = {
	data?: T;
	message?: string;
};
