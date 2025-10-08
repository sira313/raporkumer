import type { ApiResponse, TaskRecord, TaskStatus } from './types';

const jsonHeaders = { 'content-type': 'application/json' } as const;

const timestamp = (value?: string | null) => {
	if (!value) return 0;
	const parsed = Date.parse(value);
	return Number.isNaN(parsed) ? 0 : parsed;
};

const sortTasks = (tasks: TaskRecord[]) =>
	[...tasks].sort((a, b) => {
		const diff = timestamp(b.createdAt) - timestamp(a.createdAt);
		return diff !== 0 ? diff : b.id - a.id;
	});

export const splitTaskBuckets = (tasks: TaskRecord[]) => {
	const ordered = sortTasks(tasks);
	return {
		active: ordered.filter((task) => task.status === 'active'),
		completed: ordered.filter((task) => task.status === 'completed')
	};
};

type RequestResult<T> = { response: Response; payload: ApiResponse<T> };

const requestJson = async <T>(input: RequestInfo | URL, init?: RequestInit): Promise<RequestResult<T>> => {
	const response = await fetch(input, init);
	let payload: ApiResponse<T>;
	try {
		payload = (await response.json()) as ApiResponse<T>;
	} catch {
		payload = {};
	}
	return { response, payload };
};

const ensureKelasId = (kelasId: number | null | undefined) => {
	if (!kelasId || !Number.isInteger(kelasId) || kelasId <= 0) {
		throw new Error('Kelas tidak valid.');
	}
	return kelasId;
};

const buildListUrl = (kelasId: number) => {
	const params = new URLSearchParams({ kelasId: String(kelasId) });
	return `/api/tasks?${params.toString()}`;
};

export const listTasks = async (kelasId: number) => {
	const validKelasId = ensureKelasId(kelasId);
	const { response, payload } = await requestJson<TaskRecord[]>(buildListUrl(validKelasId));
	if (!response.ok) {
		throw new Error(payload.message ?? 'Gagal memuat tugas.');
	}
	return Array.isArray(payload.data) ? payload.data : [];
};

export const createTask = async (kelasId: number, title: string) => {
	const validKelasId = ensureKelasId(kelasId);
	const { response, payload } = await requestJson<TaskRecord>(`/api/tasks`, {
		method: 'POST',
		headers: jsonHeaders,
		body: JSON.stringify({ title, kelasId: validKelasId })
	});
	if (!response.ok) {
		throw new Error(payload.message ?? 'Gagal menyimpan tugas.');
	}
	if (!payload.data) {
		throw new Error('Respon tugas tidak valid.');
	}
	return payload.data;
};

export const updateTaskStatus = async (kelasId: number, id: number, status: TaskStatus) => {
	const validKelasId = ensureKelasId(kelasId);
	const { response, payload } = await requestJson<TaskRecord>(`/api/tasks`, {
		method: 'PATCH',
		headers: jsonHeaders,
		body: JSON.stringify({ id, status, kelasId: validKelasId })
	});
	if (!response.ok) {
		throw new Error(payload.message ?? 'Gagal memperbarui tugas.');
	}
	if (!payload.data) {
		throw new Error('Respon tugas tidak valid.');
	}
	return payload.data;
};

type DeleteScope = { id?: number; scope?: 'completed' | 'all' };

export const deleteTasks = async (kelasId: number, payload: DeleteScope) => {
	const validKelasId = ensureKelasId(kelasId);
	const { response, payload: result } = await requestJson<{ deleted: number }>(`/api/tasks`, {
		method: 'DELETE',
		headers: jsonHeaders,
		body: JSON.stringify({ ...payload, kelasId: validKelasId })
	});
	if (!response.ok) {
		throw new Error(result.message ?? 'Gagal menghapus tugas.');
	}
	return result.data?.deleted ?? 0;
};
