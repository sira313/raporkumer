<script lang="ts">
	import Icon from './icon.svelte';

	let isVisible = $state(false);

	function scrollToTop() {
		const scrollContainer = document.querySelector(
			'.max-h-\\[calc\\(100vh-4\\.2rem\\)\\]'
		) as HTMLElement;
		if (scrollContainer) {
			scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function handleScroll() {
		const scrollContainer = document.querySelector(
			'.max-h-\\[calc\\(100vh-4\\.2rem\\)\\]'
		) as HTMLElement;
		if (scrollContainer) {
			isVisible = scrollContainer.scrollTop > 300;
		}
	}

	function onMount() {
		const scrollContainer = document.querySelector(
			'.max-h-\\[calc\\(100vh-4\\.2rem\\)\\]'
		) as HTMLElement;
		if (scrollContainer) {
			scrollContainer.addEventListener('scroll', handleScroll);
			return () => {
				scrollContainer.removeEventListener('scroll', handleScroll);
			};
		}
	}

	$effect.pre(() => {
		onMount();
	});
</script>

{#if isVisible}
	<div class="fab">
		<button
			type="button"
			class="btn btn-lg btn-circle btn-primary"
			onclick={scrollToTop}
			aria-label="Scroll ke atas"
		>
			<Icon name="up" />
		</button>
	</div>
{/if}
