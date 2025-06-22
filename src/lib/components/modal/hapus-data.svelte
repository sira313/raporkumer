<script lang="ts">
	export let open = false;
	export let onClose: () => void = () => {};
	let dialogRef: HTMLDialogElement;

	$: if (open && dialogRef) dialogRef.showModal();
	$: if (!open && dialogRef) dialogRef.close();

	function handleBatal() {
		onClose();
	}
</script>

<dialog bind:this={dialogRef} class="modal" on:close={onClose}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">Hapus Data</h3>
		<div class="py-4">
			<p>Anda yakin untuk menghapus data murid ini?</p>
			<p>
				Tekan <kbd class="kbd kbd-sm">Esc</kbd> atau klik di luar dialog ini untuk batal
			</p>
		</div>

		<div class="flex justify-end">
			<button class="btn btn-error shadow-none">Hapus</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
