<script lang="ts">
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import Authority from '../authority.svelte';
	import { groupedUserPermissions } from '../permissions';

	let { data } = $props();
	let user = $derived(data.userDetail);

	function formatRole(t?: string) {
		if (!t) return '';
		return t
			.replace(/_/g, ' ')
			.split(' ')
			.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
			.join(' ');
	}

	function handleSaveSuccess({
		data: successData
	}: {
		form?: HTMLFormElement;
		data?: Record<string, unknown>;
	}) {
		if (successData && 'permissions' in successData && Array.isArray(successData.permissions)) {
			// update local user object so checkboxes reflect new permissions immediately
			user = { ...user, permissions: successData.permissions as UserPermission[] };
		}
	}
</script>

<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
	<header class="mb-6 flex flex-col items-center gap-4 sm:flex-row">
		<div class="flex items-center gap-3">
			<div>
				<h2 class="text-xl font-bold">Izin Pengguna: {user.username}</h2>
				<p class="text-base-content/70 text-sm">Atur hak akses untuk pengguna ini.</p>
			</div>
		</div>
		{#if user.type}
			<div class="ml-auto">
				<span class="badge badge-soft badge-info">{formatRole(user.type)}</span>
			</div>
		{/if}
	</header>
	<FormEnhance action="?/set_permissions" onsuccess={handleSaveSuccess}>
		<div class="mt-2 overflow-x-auto">
			<table class="table w-full">
				<thead>
					<tr class="bg-base-300 dark:bg-base-200">
						<th class="w-[90%]">Izin</th>
						<th class="text-center">Aktif</th>
					</tr>
				</thead>
				<tbody>
					{#each Object.entries(groupedUserPermissions) as [group, permission] (group)}
						<tr>
							<td colspan="2" class="font-bold">{permission.description}</td>
						</tr>
						{#each permission.values as [name, desc] (name)}
							{@const key = `${group}_${name}` as UserPermission}
							{@const isAdmin = user.type === 'admin'}
							{@const checked = isAdmin || user.permissions.includes(key)}
							<tr>
								<td class="text-sm">{desc}</td>
								<td class="text-center">
									{#if isAdmin}
										<!-- Ensure the permission is submitted even if checkbox is disabled -->
										<input type="hidden" name={key} value="true" />
										<input
											type="checkbox"
											class="toggle toggle-sm toggle-primary"
											name={key}
											value="true"
											checked
											disabled
										/>
									{:else}
										<input
											type="checkbox"
											class="toggle toggle-sm toggle-primary"
											name={key}
											value="true"
											{checked}
										/>
									{/if}
								</td>
							</tr>
						{/each}
					{/each}
				</tbody>
			</table>
		</div>

		<section class="mt-6 flex justify-between">
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
	</FormEnhance>
</section>
