<script lang="ts">
	import IconMenuDrawer from '$lib/icons/menu-drawer.svg?raw';
	import IconQuestion from '$lib/icons/question.svg?raw';
	import { pageMeta } from '$lib/state.svelte';
</script>

<div class="navbar bg-base-300 sticky top-0 z-50 shadow-md">
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
				<a href="/" aria-label="Menu">
					{@html IconQuestion}
				</a>
			</li>
		</ul>
	</div>
</div>
