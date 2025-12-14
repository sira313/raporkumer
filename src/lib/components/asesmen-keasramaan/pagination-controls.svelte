<script lang="ts">
	type Props = {
		currentPage: number;
		totalPages: number;
		onPageClick?: (pageNumber: number) => void;
	};

	let { currentPage, totalPages, onPageClick }: Props = $props();

	const pages = $derived(Array.from({ length: Math.max(1, totalPages) }, (_, index) => index + 1));

	function handlePageClick(pageNumber: number) {
		if (pageNumber === currentPage) return;
		onPageClick?.(pageNumber);
	}
</script>

<div class="join mt-4 sm:mx-auto">
	{#each pages as pageNumber (pageNumber)}
		<button
			type="button"
			class="join-item btn"
			class:btn-active={pageNumber === currentPage}
			onclick={() => handlePageClick(pageNumber)}
			aria-current={pageNumber === currentPage ? 'page' : undefined}
		>
			{pageNumber}
		</button>
	{/each}
</div>
