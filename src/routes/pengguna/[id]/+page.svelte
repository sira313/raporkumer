<script lang="ts">
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import Authority from '../authority.svelte';
	import { groupedUserPermissions } from '../permissions';

	let { data } = $props();
	let user = $derived(data.userDetail);
</script>

<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
<FormEnhance action="?/set_permissions">
	{#snippet children()}
		<div class="grid gap-3 gap-y-0 sm:grid-cols-3">
			{#each Object.entries(groupedUserPermissions) as [group, permission] (group)}
				<fieldset class="fieldset">
					<legend class="fieldset-legend">
						<span class="opacity-50">Izin:</span>
						{permission.description}
					</legend>
					{#each permission.values as [name, desc] (name)}
						{@const key = `${group}_${name}` as UserPermission}
						{@const checked = user.permissions.includes(key)}
						<label class="hover:bg-accent/5 flex items-center gap-1">
							<input type="checkbox" name={key} value="true" {checked} />
							<span class={checked ? 'text-accent' : ''}>{desc}</span>
						</label>
					{/each}
				</fieldset>
			{/each}
		</div>

		<section class="flex justify-end gap-3">
			<Authority permissions={['user_set_permissions']}>
				<button class="btn btn-primary">
					<Icon name="save" />
					Simpan
				</button>
			</Authority>
		</section>
	{/snippet}
</FormEnhance>
</section>