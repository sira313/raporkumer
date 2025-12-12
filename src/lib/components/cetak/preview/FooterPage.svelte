<script lang="ts">
	let {
		murid = null,
		rombel = null,
		pageNumber = null
	} = $props<{
		murid?: any;
		rombel?: any;
		pageNumber?: number | null;
	}>();
</script>

<div class="footer-page" aria-hidden="true">
	<div class="text-base-content flex items-center justify-between text-[12px]">
		<div class="text-left">
			{#if rombel || murid}
				<span
					>{rombel?.nama ?? ''}
					{rombel?.nama ? '|' : ''}
					{murid?.nama ?? ''}
					{murid?.nama ? '|' : ''}
					{murid?.nis ?? ''}</span
				>
			{/if}
		</div>

		<div class="page-number text-right">
			{#if pageNumber !== null}
				<span class="page-number-screen">Halaman: {pageNumber}</span>
			{/if}
		</div>
	</div>

	<style>
		/* Default: absolute so it can be positioned inside each page/card for on-screen preview.
           Use left:0 so it aligns with the content padding of the page container; add internal
           padding to match the container's `p-[20mm]`. */
		.footer-page {
			display: block;
			position: absolute;
			left: 0;
			right: 0;
			bottom: 10mm;
			padding-left: 20mm; /* align with table/content */
			padding-right: 20mm;
			box-sizing: border-box;
			z-index: 9999;
			pointer-events: none;
		}

		/* For printing, use fixed so the footer appears on every physical page and
           align to page margins (20mm). */
		@media print {
			.footer-page {
				position: fixed;
				left: 20mm;
				right: 20mm;
			}
			.page-number::after {
				content: 'Halaman: ' counter(page);
			}
		}
	</style>
</div>
