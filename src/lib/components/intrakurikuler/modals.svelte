<script lang="ts">
	import { page } from '$app/state';
	import DeleteMataPelajaran from '../../../routes/(mata-pelajaran)/intrakurikuler/[id]/delete/+page.svelte';
	import FormMataPelajaran from '../../../routes/(mata-pelajaran)/intrakurikuler/form/+page.svelte';

	const formModalData = $derived.by(() => {
		const modal = page.state.modal;
		if (!modal) return null;
		if (modal.name === 'add-mapel') {
			return { ...modal.data, mode: 'add' } satisfies Record<string, unknown>;
		}
		if (modal.name === 'edit-mapel') {
			return { ...modal.data, mode: 'edit' } satisfies Record<string, unknown>;
		}
		return null;
	});
</script>

{#if formModalData}
	<dialog class="modal" open onclose={() => history.back()}>
		<div class="modal-box p-4 sm:w-full sm:max-w-2xl">
			<FormMataPelajaran data={formModalData} />
		</div>
		<form method="dialog" class="modal-backdrop">
			<button>close</button>
		</form>
	</dialog>
{/if}

{#if page.state.modal?.name === 'delete-mapel'}
	<dialog class="modal" open onclose={() => history.back()}>
		<div class="modal-box">
			<DeleteMataPelajaran data={page.state.modal?.data} />
		</div>
		<form method="dialog" class="modal-backdrop">
			<button>close</button>
		</form>
	</dialog>
{/if}
