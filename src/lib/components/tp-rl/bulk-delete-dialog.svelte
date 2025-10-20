<script lang="ts">
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import type { SelectedGroupState } from './types';

	interface Props {
		groups: SelectedGroupState[];
		onCancel: () => void;
		onSuccess: () => void;
	}

	let { groups, onCancel, onSuccess }: Props = $props();

	const idsToDelete = $derived(groups.flatMap((group) => group.ids));
	const totalLingkup = $derived(groups.length);
	const totalTujuan = $derived(groups.reduce((total, group) => total + group.ids.length, 0));
</script>

<dialog class="modal" open onclose={onCancel}>
	<div class="modal-box">
		<FormEnhance action="?/delete" onsuccess={onSuccess}>
			{#snippet children({ submitting })}
				{#each idsToDelete as idValue (idValue)}
					<input name="ids" value={idValue} hidden />
				{/each}

				<h3 class="mb-3 text-xl font-bold">Hapus beberapa lingkup materi?</h3>
				<p class="mb-2">
					{totalLingkup} lingkup materi berikut akan dihapus beserta tujuan pembelajarannya:
				</p>
				<ul class="mb-4 list-disc space-y-1 pl-5 text-sm">
					{#each groups as group (group.lingkupMateri)}
						<li>
							<span class="font-semibold">{group.lingkupMateri}</span>
							<span class="opacity-70"> – {group.ids.length} tujuan pembelajaran</span>
						</li>
					{/each}
				</ul>
				<p class="text-sm opacity-70">Total tujuan pembelajaran: {totalTujuan}</p>

				<div class="mt-4 flex justify-end gap-2">
					<button class="btn btn-soft shadow-none" type="button" onclick={onCancel}> Batal </button>
					<button
						class="btn btn-error btn-soft shadow-none"
						disabled={submitting || idsToDelete.length === 0}
					>
						{#if submitting}
							<div class="loading loading-spinner"></div>
						{:else}
							<Icon name="del" />
						{/if}
						Hapus
					</button>
				</div>
			{/snippet}
		</FormEnhance>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={onCancel}>close</button>
	</form>
</dialog>
