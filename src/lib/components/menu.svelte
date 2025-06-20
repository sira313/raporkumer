<script lang="ts">
	import { appMenuItems } from '$lib/utils';
</script>

{#snippet menu_item(item: MenuItem)}
	<li>
		{#if item.subMenu}
			<details>
				<summary>{item.title}</summary>
				<ul>
					{#each item.subMenu as i}
						{@render menu_item(i)}
					{/each}
				</ul>
			</details>
		{:else}
			<a href={item.path}>{item.title}</a>
		{/if}
	</li>
{/snippet}

<div class="flex-1">
	{#each appMenuItems as m}
		{@render menu_item(m)}
	{/each}
</div>
