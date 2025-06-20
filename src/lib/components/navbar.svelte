<script lang="ts">
	import IconMenuDrawer from '$lib/icons/menu-drawer.svg?raw';
	import IconQuestion from '$lib/icons/question.svg?raw';
	import { pageMeta } from '$lib/state.svelte';
	let modalRef: HTMLDialogElement | null = null;

	function openModal() {
		modalRef?.showModal();
	}
</script>

<div class="navbar bg-base-300 shadow-b-md sticky top-0 z-50">
	<div class="flex-none lg:hidden">
		<label for="my-drawer-2" class="btn btn-square btn-ghost drawer-button">
			{@html IconMenuDrawer}
		</label>
	</div>
	<div class="mx-2 flex-1 px-2">
		<span class="text-lg font-bold">{pageMeta?.title}</span>
	</div>
	<div class="flex-none">
		<ul class="menu menu-horizontal px-1">
			<li class="menu-item">
				<button class="btn btn-ghost" on:click={openModal} aria-label="Buka Modal">
					{@html IconQuestion}
				</button>
			</li>
		</ul>
	</div>
</div>

<!-- cara efektif untuk letakkan elemen ini biar konten dinamis, bisa diatur tiap laman gimana? -->
<dialog bind:this={modalRef} class="modal">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Tutorial</h3>
		<p class="py-4">Tutorial akan berubah dinamis setiap laman</p>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
