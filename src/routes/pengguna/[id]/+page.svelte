<script lang="ts">
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import Authority from '../authority.svelte';
	import { groupedUserPermissions } from '../permissions';

	let { data } = $props();
	let user = $derived(data.userDetail);

	function formatRole(t?: string) {
		if (!t) return '';
		return t.replace(/_/g, ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
	}

	function handleSaveSuccess({ data: successData }: { form?: HTMLFormElement; data?: Record<string, unknown> }) {
		if (successData && 'permissions' in successData && Array.isArray(successData.permissions)) {
			// update local user object so checkboxes reflect new permissions immediately
			user = { ...user, permissions: successData.permissions as UserPermission[] };
		}
	}
</script>

<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
	<header class="mb-4">
	<h2 class="text-xl font-bold">Izin Pengguna: {user.username}{user.type ? ' - ' + formatRole(user.type) : ''}</h2>
	</header>
<FormEnhance action="?/set_permissions" onsuccess={handleSaveSuccess}>
	{#snippet children()}
		<div class="grid gap-3 gap-y-0 sm:grid-cols-3">
			{#each Object.entries(groupedUserPermissions).filter(([k]) => k !== 'cetak' && k !== 'nilai') as [group, permission] (group)}
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

		<section class="flex justify-between mt-6">
			<Authority permissions={['user_set_permissions']}>
				<a href="/pengguna" class="btn btn-soft shadow-none">
					<Icon name="left" />
					Kembali
				</a>
				<button class="btn btn-primary shadow-none">
					<Icon name="save" />
					Simpan
				</button>
			</Authority>
		</section>
	{/snippet}
</FormEnhance>
</section>