<script lang="ts">
	import { page } from '$app/state';
	import IconMenuDrawer from '$lib/icons/menu-drawer.svg?raw';
	import IconQuestion from '$lib/icons/question.svg?raw';
	import { pageMeta } from '$lib/state.svelte';
	import { showModal } from './modal/state.svelte';

	const helps: Record<string, string> = {
		// path: body
		'/sekolah': 'Things todo before join WW3',
		'/siswa': 'WW3 begin because of non-exists country, we know!'
	};

	function showHelp() {
		const body = helps[page.url.pathname.replace(/\/+$/, '')] || 'Noting match to `helps`';
		showModal({
			// body can be string or Snippet
			body: body,
			dismissible: true,
			onNeutral: {
				label: 'OK',
				action({ close }) {
					// do something here
					close();
				}
			}
		});
	}
</script>

<div
	class="navbar bg-base-100 border-base-200 sticky top-0 z-50 border-b lg:border-b-0 lg:border-l"
>
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
				<button class="btn btn-ghost btn-circle" aria-label="Bantuan" onclick={showHelp}>
					{@html IconQuestion}
				</button>
			</li>
		</ul>
	</div>
</div>
