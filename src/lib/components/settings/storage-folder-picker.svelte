<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import { createEventDispatcher } from 'svelte';
	import type { BrowseResponse } from '$lib/server/storage-browse';

	interface Props {
		open: boolean;
		title: string;
		initial: string;
	}

	let { open, title, initial }: Props = $props();

	const dispatch = createEventDispatcher<{ close: void; select: { path: string } }>();

	let current = $state('');
	let parent = $state<string | null>(null);
	let entries = $state<string[]>([]);
	let drives = $state<string[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	function requestClose() {
		dispatch('close');
	}

	function requestSelect() {
		if (!current) return;
		dispatch('select', { path: current });
	}

	async function load(target: string | null, name?: string) {
		loading = true;
		error = null;
		try {
			const params = new URLSearchParams();
			if (target) params.set('path', target);
			if (name) params.set('name', name);
			const qs = params.toString();
			const response = await fetch(`/api/storage/browse${qs ? `?${qs}` : ''}`, {
				credentials: 'same-origin',
				cache: 'no-store'
			});
			if (!response.ok) {
				const detail = await response.text().catch(() => '');
				throw new Error(detail || `Gagal memuat folder (${response.status})`);
			}
			const payload = (await response.json()) as BrowseResponse;
			current = payload.current;
			parent = payload.parent;
			entries = payload.entries;
			drives = payload.drives;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Gagal memuat folder.';
		} finally {
			loading = false;
		}
	}

	function navigate(name: string) {
		void load(current, name);
	}

	function goUp() {
		if (!parent) return;
		void load(parent);
	}

	$effect(() => {
		if (open) {
			void load(initial);
		}
	});

	function handleCancel(event: Event) {
		event.preventDefault();
		requestClose();
	}
</script>

{#if open}
	<dialog
		class="modal modal-open modal-middle"
		open
		aria-modal="true"
		oncancel={handleCancel}
		onkeydown={(event) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				requestClose();
			}
		}}
	>
		<div class="modal-box max-w-2xl">
			<div class="space-y-1">
				<h2 class="text-xl font-semibold">{title}</h2>
				<p class="break-all text-base-content/70 text-sm">{current || 'Pilih drive/folder'}</p>
			</div>

			<div class="mt-4 space-y-3">
				{#if error}
					<div class="alert alert-error">
						<Icon name="error" />
						<span>{error}</span>
					</div>
				{/if}

				<div class="flex flex-wrap gap-2">
					<button
						class="btn btn-outline btn-sm"
						type="button"
						onclick={goUp}
						disabled={!parent || loading}
					>
						<Icon name="up" />
						Naik
					</button>
					<button
						class="btn btn-outline btn-sm"
						type="button"
						onclick={() => void load(current)}
						disabled={loading}
					>
						<Icon name="repeat" />
						Muat ulang
					</button>
				</div>

				{#if loading}
					<div class="rounded-box bg-base-200/60 p-4">
						<p class="text-sm font-medium">Memuat folder…</p>
						<progress class="progress progress-primary mt-3 w-full"></progress>
					</div>
				{:else}
					<div
						class="rounded-box max-h-72 overflow-y-auto border border-base-300 bg-base-200/40 p-2"
					>
						{#if drives.length > 0}
							{#each drives as drive (drive)}
								<button
									class="btn btn-ghost btn-sm justify-start w-full"
									type="button"
									onclick={() => navigate(drive)}
								>
									<Icon name="folder" />
									<span class="font-mono text-xs">{drive}</span>
								</button>
							{/each}
						{/if}
						{#if entries.length === 0 && drives.length === 0}
							<p class="text-base-content/60 p-3 text-center text-sm">
								Folder ini kosong (tidak ada subfolder).
							</p>
						{/if}
						{#each entries as name (current + '/' + name)}
							<button
								class="btn btn-ghost btn-sm justify-start w-full"
								type="button"
								onclick={() => navigate(name)}
							>
								<Icon name="folder" />
								<span class="truncate text-xs">{name}</span>
							</button>
						{/each}
					</div>
				{/if}

				<div class="flex justify-end gap-2">
					<button class="btn btn-outline" type="button" onclick={requestClose}> Batal </button>
					<button class="btn btn-primary" type="button" onclick={requestSelect} disabled={!current}>
						<Icon name="check" />
						Pilih Folder Ini
					</button>
				</div>
			</div>
		</div>
		<form
			method="dialog"
			class="modal-backdrop"
			onsubmit={(event) => {
				event.preventDefault();
				requestClose();
			}}
		>
			<button type="submit">tutup</button>
		</form>
	</dialog>
{/if}
