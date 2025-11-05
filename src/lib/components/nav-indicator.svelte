<script lang="ts">
	import { navigating } from '$app/state';

	let delayed_navigating = $state(false);
	let t: ReturnType<typeof setTimeout>;

	$effect(() => {
		const nav = navigating; // read to track
		clearTimeout(t);
		t = setTimeout(() => {
			delayed_navigating = !nav?.to;
		}, 450);
	});
</script>

{#if !!navigating?.to && !!delayed_navigating}
	<div
		class="bg-primary/10 before:bg-primary/70 before:content-empty fixed top-0 left-0 z-110 m-0 flex
			h-1 w-full before:m-0 before:h-1 before:w-full"
		role="progressbar"
	></div>
{/if}

<style>
	div[role='progressbar']:before {
		animation: animate-progress 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
	}

	@keyframes animate-progress {
		0% {
			transform: translateX(-45%) scaleX(0.1);
		}
		50% {
			transform: translateX(10%) scaleX(0.5);
		}
		100% {
			transform: translateX(50%) scaleX(0);
		}
	}
</style>
