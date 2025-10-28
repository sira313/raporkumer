<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import { isAuthorizedUser } from './permissions';

	interface Props {
		children: Snippet;
		denied?: Snippet;
		permissions: UserPermission[];
	}

	let { children, denied, permissions }: Props = $props();
	let user = $derived(page.data.user);
</script>

{#if isAuthorizedUser(permissions, user)}
	{@render children()}
{:else}
	{@render denied?.()}
{/if}
