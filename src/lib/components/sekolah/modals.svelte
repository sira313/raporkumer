<script lang="ts">
	import { page } from '$app/state';
	import SyncDapodikPage from '../../../routes/(informasi-umum)/sekolah/form/sync-dapodik/+page.svelte';
</script>

{#if page.state.modal?.name === 'sync-dapodik'}
	<dialog
		class="modal"
		onclose={() => history.back()}
		onclick={(e) => {
			const rect = e.currentTarget.querySelector('.modal-box')?.getBoundingClientRect();
			if (
				rect &&
				(e.clientX < rect.left ||
					e.clientX > rect.right ||
					e.clientY < rect.top ||
					e.clientY > rect.bottom)
			) {
				e.currentTarget.close();
			}
		}}
		open
	>
		<div class="modal-box flex max-h-[90vh] flex-col p-4 sm:w-full sm:max-w-xl">
			<SyncDapodikPage data={page.state.modal?.data} />
		</div>
		<form method="dialog" class="modal-backdrop">
			<button>close</button>
		</form>
	</dialog>
{/if}
