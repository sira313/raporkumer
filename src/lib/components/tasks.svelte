<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Icon from './icon.svelte';

	type TaskStatus = 'active' | 'completed';

	type TaskRecord = {
		id: number;
		title: string;
		status: TaskStatus;
		createdAt: string;
		updatedAt: string | null;
	};

	type ApiResponse<T> = {
		data?: T;
		message?: string;
	};

	let { variant = 'sidebar' }: { variant?: 'sidebar' | 'modal' } = $props();

	const wrapperClass = $derived(
		variant === 'sidebar'
			? 'card bg-base-100 mb-6 hidden max-h-80 min-h-80 max-w-70 min-w-70 shadow-md xl:block'
			: 'card bg-base-100 shadow-md w-full'
	);

	const listContainerClass = $derived(
		variant === 'sidebar'
			? 'flex flex-col max-h-60 min-h-60 overflow-hidden'
			: 'flex flex-col max-h-[60vh] overflow-hidden'
	);

	const timestamp = (value?: string | null) => {
		if (!value) return 0;
		const parsed = Date.parse(value);
		return Number.isNaN(parsed) ? 0 : parsed;
	};

	const sortTasks = (tasks: TaskRecord[]) =>
		[...tasks].sort((a, b) => {
			const diff = timestamp(b.createdAt) - timestamp(a.createdAt);
			if (diff !== 0) return diff;
			return b.id - a.id;
		});

	const setBuckets = (tasks: TaskRecord[]) => {
		const ordered = sortTasks(tasks);
		activeTasks = ordered.filter((task) => task.status === 'active');
		completedTasks = ordered.filter((task) => task.status === 'completed');
	};

	async function requestJson<T>(
		input: RequestInfo | URL,
		init?: RequestInit
	): Promise<{ response: Response; payload: ApiResponse<T> }> {
		const response = await fetch(input, init);
		let payload: ApiResponse<T>;
		try {
			payload = (await response.json()) as ApiResponse<T>;
		} catch {
			payload = {};
		}
		return { response, payload };
	}

	let activeTasks = $state<TaskRecord[]>([]);
	let completedTasks = $state<TaskRecord[]>([]);
	let isAdding = $state(false);
	let newTaskTitle = $state('');
	let newTaskInput = $state<HTMLInputElement | null>(null);
	let isLoading = $state(false);
	let hasLoaded = $state(false);
	let isProcessing = $state(false);
	let errorMessage = $state('');

	const loadTasks = async (options?: { showSpinner?: boolean }) => {
		const showSpinner = options?.showSpinner ?? !hasLoaded;
		if (showSpinner) isLoading = true;
		errorMessage = '';
		try {
			const { response, payload } = await requestJson<TaskRecord[]>('/api/tasks');
			if (!response.ok) {
				throw new Error(payload.message ?? 'Gagal memuat tugas.');
			}
			const tasks = Array.isArray(payload.data) ? payload.data : [];
			setBuckets(tasks);
		} catch (error) {
			console.error(error);
			activeTasks = [];
			completedTasks = [];
			errorMessage = error instanceof Error ? error.message : 'Gagal memuat tugas.';
		} finally {
			hasLoaded = true;
			isLoading = false;
		}
	};

	onMount(() => {
		void loadTasks();
	});

	const resetInput = () => {
		newTaskTitle = '';
		isAdding = false;
	};

	const focusInput = async () => {
		await tick();
		newTaskInput?.focus();
	};

	const toggleAddTask = async () => {
		if (isProcessing) return;
		if (isAdding) {
			resetInput();
			return;
		}
		isAdding = true;
		await focusInput();
	};

	const saveTask = async () => {
		const title = newTaskTitle.trim();
		if (!title || isProcessing) return;
		isProcessing = true;
		errorMessage = '';
		try {
			const { response, payload } = await requestJson<TaskRecord>('/api/tasks', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ title })
			});
			if (!response.ok) {
				throw new Error(payload.message ?? 'Gagal menyimpan tugas.');
			}
			resetInput();
			await loadTasks({ showSpinner: false });
		} catch (error) {
			console.error(error);
			errorMessage = error instanceof Error ? error.message : 'Gagal menyimpan tugas.';
		} finally {
			isProcessing = false;
		}
	};

	const handleNewTaskKeydown = async (event: KeyboardEvent) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			await saveTask();
		}
		if (event.key === 'Escape') {
			event.preventDefault();
			resetInput();
		}
	};

	const updateTaskStatus = async (taskId: number, status: TaskStatus) => {
		if (isProcessing) return;
		isProcessing = true;
		errorMessage = '';
		try {
			const { response, payload } = await requestJson<TaskRecord>('/api/tasks', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ id: taskId, status })
			});
			if (!response.ok) {
				throw new Error(payload.message ?? 'Gagal memperbarui tugas.');
			}
			await loadTasks({ showSpinner: false });
		} catch (error) {
			console.error(error);
			errorMessage = error instanceof Error ? error.message : 'Gagal memperbarui tugas.';
		} finally {
			isProcessing = false;
		}
	};

	const removeTasks = async (payload: { id?: number; scope?: 'completed' | 'all' }) => {
		if (isProcessing) return;
		isProcessing = true;
		errorMessage = '';
		try {
			const { response, payload: result } = await requestJson<{ deleted: number }>(
				'/api/tasks',
				{
					method: 'DELETE',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				}
			);
			if (!response.ok) {
				throw new Error(result.message ?? 'Gagal menghapus tugas.');
			}
			await loadTasks({ showSpinner: false });
		} catch (error) {
			console.error(error);
			errorMessage = error instanceof Error ? error.message : 'Gagal menghapus tugas.';
		} finally {
			isProcessing = false;
		}
	};

	const moveToCompleted = (taskId: number) => {
		void updateTaskStatus(taskId, 'completed');
	};

	const moveToActive = (taskId: number) => {
		void updateTaskStatus(taskId, 'active');
	};

	const removeTask = (taskId: number) => {
		void removeTasks({ id: taskId });
	};

	const clearCompleted = () => {
		if (!completedTasks.length) return;
		void removeTasks({ scope: 'completed' });
	};

	const clearAll = () => {
		if (!activeTasks.length && !completedTasks.length) return;
		void removeTasks({ scope: 'all' });
	};

	const hasActiveTasks = $derived(Boolean(activeTasks.length));
	const hasCompletedTasks = $derived(Boolean(completedTasks.length));
	const hasAnyTasks = $derived(hasActiveTasks || hasCompletedTasks);
</script>

<div class={wrapperClass}>
	<div class="flex flex-row items-center justify-center p-4">
		<h2 class="text-lg font-bold">Daftar tugas</h2>
		{#if isLoading && !hasLoaded}
			<span class="loading loading-spinner loading-xs text-primary ml-2" aria-hidden="true"></span>
		{/if}
		<div class="flex-1"></div>
		<div class="join">
			<button
				type="button"
				class="btn join-item shadow-none"
				onclick={toggleAddTask}
				title={isAdding ? 'Batalkan tambah tugas' : 'Tambah tugas'}
				disabled={isProcessing}
			>
				<Icon name={isAdding ? 'close' : 'plus'} />
			</button>
			<div class="dropdown dropdown-end">
				<div tabindex="0" role="button" title="Tombol hapus" class="join-item btn shadow-none">
					<Icon name="del" class="text-error" />
					<Icon name="collapse-all" class="text-error" />
				</div>
				<ul class="menu dropdown-content bg-base-100 rounded-box z-1 mt-2 w-48 p-2 shadow-md">
					<li>
						<button
							type="button"
							class="btn btn-ghost btn-sm justify-start"
							onclick={clearCompleted}
							disabled={!hasCompletedTasks || isProcessing}
						>
							Hapus tugas selesai
						</button>
					</li>
					<li>
						<button
							type="button"
							class="btn btn-ghost btn-sm text-error justify-start"
							onclick={clearAll}
							disabled={!hasAnyTasks || isProcessing}
						>
							Hapus semua tugas
						</button>
					</li>
				</ul>
			</div>
		</div>
	</div>
	{#if errorMessage}
		<div class="px-4 pb-2">
			<div class="alert alert-error flex items-center gap-2 rounded-lg p-3 text-sm">
				<Icon name="error" class="h-4 w-4" />
				<span>{errorMessage}</span>
			</div>
		</div>
	{/if}
	<div class={listContainerClass}>
		{#if isLoading && !hasLoaded}
			<div class="flex-1 overflow-y-auto">
				<table class="table w-full">
					<tbody>
						<tr>
							<td colspan="3" class="p-4 text-center text-sm">
								<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
								<span class="sr-only">Memuat daftar tugas</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		{:else}
			{#if isAdding || hasActiveTasks}
				<div class="flex-1 overflow-y-auto">
					<table class="table w-full">
						<tbody>
							{#if isAdding}
								<tr class="border-base-300 dark:border-base-200">
									<th></th>
									<td class="p-2">
										<div class="flex items-center gap-2">
											<input
												bind:this={newTaskInput}
												bind:value={newTaskTitle}
												placeholder="Nama tugas"
												class="input input-sm input-bordered w-full"
												onkeydown={handleNewTaskKeydown}
												autocomplete="off"
												aria-label="Nama tugas baru"
											/>
										</div>
									</td>
									<td class="p-2 text-right">
										<button
											type="button"
											class="btn btn-primary btn-sm"
											onclick={saveTask}
											title="Simpan tugas"
											disabled={isProcessing || !newTaskTitle.trim()}
										>
											<Icon name="save" />
										</button>
									</td>
								</tr>
							{/if}
							{#each activeTasks as task (task.id)}
								<tr class="border-base-300 dark:border-base-200">
									<th>
										<input
											type="checkbox"
											class="checkbox"
											onchange={() => moveToCompleted(task.id)}
											title="Tandai selesai"
											disabled={isProcessing}
										/>
									</th>
									<td class="p-2"><p class="flex-1">{task.title}</p></td>
									<td class="p-2 text-right">
										<button
											type="button"
											class="btn btn-circle btn-ghost"
											title="Hapus tugas"
											onclick={() => removeTask(task.id)}
											disabled={isProcessing}
										>
											<Icon name="del" class="text-error" />
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
			{#if !isAdding && !hasActiveTasks}
				<div class="flex flex-1 items-center justify-center px-4 py-6 text-center text-sm text-base-content/60">
					Belum ada tugas aktif. Tambahkan tugas baru untuk memulai.
				</div>
			{/if}
		{/if}
		<div class="m-2 mt-auto">
			<div class="bg-base-300 dark:bg-base-200 collapse mt-6">
				<input type="checkbox" />
				<div class="collapse-title font-bold">Tugas sudah selesai</div>
				<div class="collapse-content p-0 text-sm">
					<table class="table">
						<tbody>
							{#if !hasLoaded && isLoading}
								<tr>
									<td colspan="3" class="p-4 text-center text-sm">
										<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
										<span class="sr-only">Memuat tugas selesai</span>
									</td>
								</tr>
							{:else if !hasCompletedTasks}
								<tr>
									<td colspan="3" class="text-base-content/60 p-4 text-center text-sm">
										Belum ada tugas yang selesai.
									</td>
								</tr>
							{/if}
							{#each completedTasks as task (task.id)}
								<tr class="border-base-100">
									<th>
										<input
											type="checkbox"
											class="checkbox"
											checked
											onchange={() => moveToActive(task.id)}
											title="Kembalikan ke tugas aktif"
											disabled={isProcessing}
										/>
									</th>
									<td class="p-2"><p class="flex-1"><s>{task.title}</s></p></td>
									<td class="p-2 text-right">
										<button
											type="button"
											class="btn btn-circle btn-ghost"
											title="Hapus tugas"
											onclick={() => removeTask(task.id)}
											disabled={isProcessing}
										>
											<Icon name="del" class="text-error" />
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</div>
