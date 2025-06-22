<script lang="ts">
	import { appMenuItems } from '$lib/utils';
</script>

{#snippet menu_item(item: MenuItem)}
	<li>
		{#if item.subMenu}
			<details>
				<summary>{item.title}</summary>
				<ul>
					{#each item.subMenu as menu (menu)}
						{@render menu_item(menu)}
					{/each}
				</ul>
			</details>
		{:else}
			<a href={item.path}>{item.title}</a>
		{/if}
	</li>
{/snippet}

<div class="flex-1">
	{#each appMenuItems as menu (menu)}
		{@render menu_item(menu)}
	{/each}
</div>
