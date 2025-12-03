<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	interface MataEvaluasi {
		id: number;
		nama: string;
		indikator: Array<{
			id: number;
			deskripsi: string;
		}>;
	}

	interface Props {
		deleteConfirmId: number | null;
		mataEvaluasi: MataEvaluasi[];
		onConfirm: (id: number) => void;
		onCancel: () => void;
	}

	let { deleteConfirmId, mataEvaluasi, onConfirm, onCancel }: Props = $props();
</script>

{#if deleteConfirmId !== null}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">Hapus Mata Evaluasi?</h3>
			{#each mataEvaluasi as group (group.id)}
				{#if deleteConfirmId === group.id}
					<p class="py-4">
						Anda akan menghapus mata evaluasi <strong>{group.nama}</strong> beserta semua indikatornya.
						Tindakan ini tidak dapat dibatalkan.
					</p>
				{/if}
			{/each}
			<div class="modal-action">
				<button
					type="button"
					class="btn btn-soft shadow-none"
					onclick={onCancel}
					title="Batal menghapus"
				>
					Batal
				</button>
				<button
					type="button"
					class="btn btn-error shadow-none"
					onclick={() => {
						const groupToDelete = mataEvaluasi.find((g) => g.id === deleteConfirmId);
						if (groupToDelete) {
							onConfirm(groupToDelete.id);
						}
					}}
					title="Konfirmasi penghapusan"
				>
					Hapus
				</button>
			</div>
		</div>
		<button type="button" class="modal-backdrop" onclick={onCancel} title="Tutup modal"></button>
	</div>
{/if}
