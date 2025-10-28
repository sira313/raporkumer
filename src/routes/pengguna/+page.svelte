<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	import { toast } from '$lib/components/toast.svelte';

	let { data } = $props();

	// derive user item type from incoming load data to keep typings simple
	type UserItem = typeof data.users extends Array<infer U> ? U : unknown;

	// local reactive users copy so UI updates instantly without full reload
	// extend with local-only fields used for inline add
	interface LocalUser extends UserItem {
		isNew?: boolean;
		nama?: string;
		mataPelajaranId?: number | null;
	}
	let users = $state<LocalUser[]>(data.users ?? []);

	// mata pelajaran for inline-add select
	let mataPelajaran = $state<{ id: number; nama: string }[]>(data.mataPelajaran ?? []);

	// next temporary id for new rows (negative numbers)
	let nextNewId = -1;

	// store values for new rows keyed by temporary id
	let newValues = $state<Record<number, { nama: string; username: string; password: string; type: string; mataPelajaranId: number | null }>>({});

	let editingId = $state<number | null>(null);
	let editValues = $state<Record<number, { username: string; password: string }>>({});
</script>

<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
	<div class="space-y-4">
		<header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="space-y-2">
				<h1 class="text-2xl font-bold">Daftar pengguna</h1>
			</div>
			<button class="btn btn-outline btn-primary shadow-none sm:self-start" type="button" onclick={() => {
				// insert a temporary new row at the top
				const id = nextNewId--;
				users = [{ id, isNew: true, nama: '', username: '', type: 'admin', mataPelajaranId: mataPelajaran[0]?.id ?? null } as LocalUser, ...users];
				newValues[id] = { nama: '', username: '', password: '', type: 'admin', mataPelajaranId: mataPelajaran[0]?.id ?? null };
			}}>
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
						<th>Role</th>
						<th>Dibuat pada</th>
						<th>Username</th>
						<th>Password</th>
						<td>Aksi</td>
					</tr>
				</thead>
				<tbody>
					{#each users as u (u.id)}
						<tr>
							{#if !editingId}
								<td>
									<input type="checkbox" class="checkbox" value={u.id} />
								</td>
							{/if}

							{#if u.isNew}
								<!-- Inline add row -->
								<td>
									<input class="input input-sm w-full" bind:value={newValues[u.id].nama} placeholder="Nama" />
								</td>
								<td>
									<select class="select select-sm w-full" bind:value={newValues[u.id].type}>
										<option value="admin">Admin</option>
										<option value="wali_kelas">Wali Kelas</option>
										<option value="user">User</option>
									</select>
								</td>
								<td>
									<select class="select select-sm w-full" bind:value={newValues[u.id].mataPelajaranId}>
										{#each mataPelajaran as m}
											<option value={m.id}>{m.nama}</option>
										{/each}
										{#if mataPelajaran.length === 0}
											<option disabled>- tidak ada mata pelajaran -</option>
										{/if}
									</select>
								</td>
								<td>
									<input class="input input-sm w-full" bind:value={newValues[u.id].username} placeholder="Username" />
								</td>
								<td>
									<input type="password" class="input input-sm w-full" bind:value={newValues[u.id].password} placeholder="Password" />
								</td>
								<td>
									<div class="flex flex-row">
										<button
											class="btn btn-sm btn-soft rounded-r-none shadow-none"
											title="Batal"
											onclick={() => {
												// remove temporary row
												users = users.filter((x) => x.id !== u.id);
												delete newValues[u.id];
											}}
										>
											<Icon name="close" />
										</button>
										<button
											class="btn btn-primary btn-sm btn-soft rounded-l-none shadow-none"
											title="Simpan pengguna"
											onclick={async () => {
												const form = new FormData();
												form.set('username', newValues[u.id].username || '');
												form.set('password', newValues[u.id].password || '');
												form.set('nama', newValues[u.id].nama || '');
												form.set('type', newValues[u.id].type || 'user');
												form.set('mataPelajaranId', String(newValues[u.id].mataPelajaranId ?? ''));
												const res = await fetch('?/create_user', { method: 'POST', body: form });
												if (res.ok) {
													const body = await res.json().catch(() => ({}));
													toast({ message: 'Pengguna dibuat', type: 'success' });
													if (body.user) {
														const idx = users.findIndex((x) => x.id === u.id);
														const newUser = {
															id: body.user.id,
															username: body.user.username ?? newValues[u.id].username,
															createdAt: body.user.createdAt ?? new Date().toISOString(),
															type: body.user.type ?? newValues[u.id].type,
															pegawaiName: body.displayName || newValues[u.id].nama || body.user.username,
															// keep other fields expected by the table
															pegawaiId: null,
															kelasId: null,
															kelasName: null,
															passwordUpdatedAt: body.user.passwordUpdatedAt ?? new Date().toISOString()
														} as LocalUser;
														if (idx !== -1) {
															users[idx] = newUser;
															// ensure Svelte notices the array update
															users = [...users];
														} else {
															// append if temp row not found
															users = [newUser, ...users];
														}
													} else {
														// fallback: remove temp row
														users = users.filter((x) => x.id !== u.id);
													}
													delete newValues[u.id];
												} else {
													const text = await res.text().catch(() => 'Gagal');
													toast({ message: `Gagal membuat: ${text}`, type: 'error' });
												}
											}}
										>
											<Icon name="save" />
										</button>
									</div>
								</td>
							{:else}
								<!-- existing rows -->
								<td>{u.pegawaiName ?? u.username}</td>
								<td>
									{#if u.type === 'wali_kelas'}
										Wali {u.kelasName ?? (u.kelasId ? `Kelas ${u.kelasId}` : '-')}
									{:else if u.type === 'admin'}
										Admin
									{:else}
										{u.type}
									{/if}
								</td>
								<td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
								<td>
									{#if editingId === u.id}
										<input class="input input-sm w-full" bind:value={editValues[u.id].username} />
									{:else}
										{u.username ? u.username : '-'}
									{/if}
								</td>
								<td>
									{#if editingId === u.id}
										<input
											type="password"
											class="input input-sm w-full"
											placeholder="Buat Password"
											bind:value={editValues[u.id].password}
										/>
									{:else}
										{u.passwordUpdatedAt ? '*****' : '-'}
									{/if}
								</td>
								<td>
									<div class="flex flex-row">
										<button
											class="btn btn-sm btn-soft rounded-r-none shadow-none"
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
												class="btn btn-primary btn-sm btn-soft rounded-l-none shadow-none"
												title="Simpan perubahan"
												onclick={async () => {
													const form = new FormData();
													form.set('id', String(u.id));
													form.set('username', editValues[u.id].username);
													form.set('password', editValues[u.id].password);
													const res = await fetch('?/update_credentials', {
														method: 'POST',
														body: form
													});
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
																	passwordUpdatedAt:
																		body.user.passwordUpdatedAt ?? users[idx].passwordUpdatedAt
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
																	passwordUpdatedAt: editValues[u.id].password
																		? new Date().toISOString()
																		: users[idx].passwordUpdatedAt
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
											<a
												class="btn btn-primary btn-sm btn-soft rounded-l-none shadow-none"
												title="Atur hak akses"
												href="/pengguna/{u.id}"
											>
												<Icon name="key" />
											</a>
										{/if}
									</div>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>
