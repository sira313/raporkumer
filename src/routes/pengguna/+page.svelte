<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import { invalidate } from '$app/navigation';
	import { toast } from '$lib/components/toast.svelte';

	let { data } = $props();

	// derive user item type from incoming load data to keep typings simple
	type UserItem = typeof data.users extends Array<infer U> ? U : unknown;

	// local reactive users copy so UI updates instantly without full reload
	let users = $state<UserItem[]>(data.users ?? []);

	let editingId = $state<number | null>(null);
	let editValues = $state<Record<number, { username: string; password: string }>>({});
</script>

<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
	<div class="space-y-4">
		<header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="space-y-2">
				<h1 class="text-2xl font-bold">Daftar pengguna</h1>
			</div>
			<button
				class="btn btn-outline btn-primary shadow-none sm:self-start"
				type="button"
			>
				<Icon name="plus" />
				Tambah Pengguna
			</button>
		</header>
		<div class="overflow-x-auto">
		<table class="table">
	<thead>
		<tr>
			{#if !editingId}<th><input type="checkbox" class="checkbox" /></th>{/if}
			<th>Nama</th>
			<th>Dibuat pada</th>
			<th>Role</th>
			<th>Username</th>
			<th>Password</th>
			<td>Aksi</td>
		</tr>
	</thead>
	<tbody>
	{#each users as u}
			<tr>
				{#if !editingId}
				<td>
					<input type="checkbox" class="checkbox" value={u.id} />
				</td>
				{/if}
				<td>{u.pegawaiName ?? u.username}</td>
				<td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
				<td>
					{#if u.type === 'wali_kelas'}
						Wali {u.kelasName ?? (u.kelasId ? `Kelas ${u.kelasId}` : '-')}
					{:else if u.type === 'admin'}
						Admin
					{:else}
						{u.type}
					{/if}
				</td>
				<td>
					{#if editingId === u.id}
						<input class="input input-sm w-full" bind:value={editValues[u.id].username} />
					{:else}
						{u.username ? u.username : '-'}
					{/if}
				</td>
				<td>
					{#if editingId === u.id}
						<input type="password" class="input input-sm w-full" placeholder="Buat Password" bind:value={editValues[u.id].password} />
					{:else}
						{u.passwordUpdatedAt ? '*****' : '-'}
					{/if}
				</td>
				<td>
					<div class="flex flex-row">
						<button
							class="btn btn-sm shadow-none btn-soft rounded-r-none"
							title={editingId === u.id ? 'Batal' : 'Ubah username dan password'}
							onclick={() => {
								if (editingId === u.id) {
									editingId = null;
								} else {
									editingId = u.id;
									editValues[u.id] = { username: u.username ?? '', password: '' };
								}
							}}
						>
							{#if editingId === u.id}
								<Icon name="close" />
							{:else}
								<Icon name="edit" />
							{/if}
						</button>

						{#if editingId === u.id}
							<button
								class="btn btn-primary btn-sm shadow-none btn-soft rounded-l-none"
								title="Simpan perubahan"
								onclick={async () => {
									const form = new FormData();
									form.set('id', String(u.id));
									form.set('username', editValues[u.id].username);
									form.set('password', editValues[u.id].password);
									const res = await fetch('?/update_credentials', { method: 'POST', body: form });
									if (res.ok) {
										const body = await res.json().catch(() => ({}));
										toast({ message: 'Perubahan tersimpan', type: 'success' });
										// update local list if server returned the updated user
										if (body.user) {
											const idx = users.findIndex((x) => x.id === body.user.id);
											if (idx !== -1) {
												// update username and passwordUpdatedAt locally (no full reload)
												users[idx] = {
													...users[idx],
													username: body.user.username ?? users[idx].username,
													passwordUpdatedAt: body.user.passwordUpdatedAt ?? users[idx].passwordUpdatedAt
												};
											}
										} else {
											// optimistic update when server didn't return full user
											const idx = users.findIndex((x) => x.id === u.id);
											if (idx !== -1) {
												users[idx] = {
													...users[idx],
													username: editValues[u.id].username || users[idx].username,
													// if user entered a password, mark as set
													passwordUpdatedAt: editValues[u.id].password ? new Date().toISOString() : users[idx].passwordUpdatedAt
												};
											}
										}
										editingId = null;
									} else {
										const text = await res.text().catch(() => 'Gagal');
										toast({ message: `Gagal menyimpan: ${text}`, type: 'error' });
									}
								}}
							>
								<Icon name="save" />
							</button>
						{:else}
							<a class="btn btn-primary btn-sm shadow-none btn-soft rounded-l-none" title="Atur hak akses" href="/pengguna/{u.id}">
								<Icon name="key" />
							</a>
						{/if}
					</div>
				</td>
			</tr>
		{/each}
	</tbody>
		</table>
		</div>
	</div>
</section>