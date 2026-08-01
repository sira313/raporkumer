<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- links to edit/manage users are intentional */
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { showModal } from '$lib/components/global-modal.svelte';
	import Authority from '../authority.svelte';
	import { groupedUserPermissions } from '../permissions';
	import ResetPermissionsBody from './reset-permissions-body.svelte';

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

	function confirmResetPermissions() {
		showModal({
			title: 'Reset Izin ke Default',
			body: ResetPermissionsBody,
			bodyProps: {
				username: user.username,
				roleType: formatRole(user.type)
			},
			onPositive: {
				label: 'Reset',
				class: 'btn-warning',
				action: ({ close }) => {
					close();
					(
						document.getElementById('reset-permissions-form') as HTMLFormElement | null
					)?.requestSubmit();
				}
			},
			onNegative: {
				label: 'Batal'
			}
		});
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
	<FormEnhance id="set-permissions-form" action="?/set_permissions" onsuccess={handleSaveSuccess}>
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
								<td class="text-sm pl-8">{desc}</td>
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
	</FormEnhance>

	<section class="mt-6 flex items-center justify-between gap-3">
		<Authority permissions={['user_set_permissions']}>
			<a href="/pengguna" class="btn btn-soft shadow-none">
				<Icon name="left" />
				Kembali
			</a>
		</Authority>
		<div class="flex flex-wrap justify-end gap-2">
			{#if user.type !== 'admin'}
				<FormEnhance
					id="reset-permissions-form"
					action="?/reset_permissions"
					onsuccess={handleSaveSuccess}
				>
					<Authority permissions={['user_set_permissions']}>
						<button
							type="button"
							class="btn btn-soft btn-warning shadow-none"
							onclick={confirmResetPermissions}
						>
							<Icon name="repeat" />
							Reset ke Default
						</button>
					</Authority>
				</FormEnhance>
			{/if}
			<Authority permissions={['user_set_permissions']}>
				<button form="set-permissions-form" type="submit" class="btn btn-primary shadow-none">
					<Icon name="save" />
					Simpan
				</button>
			</Authority>
		</div>
	</section>
</section>
