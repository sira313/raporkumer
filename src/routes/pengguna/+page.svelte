<script lang="ts">
import Icon from '$lib/components/icon.svelte';
import { showModal, updateModal } from '$lib/components/global-modal.svelte';
import { toast } from '$lib/components/toast.svelte';
import UsersHeader from '$lib/components/pengguna/UsersHeader.svelte';
import NewUserRow from '$lib/components/pengguna/NewUserRow.svelte';
import ExistingUserRow from '$lib/components/pengguna/ExistingUserRow.svelte';

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

// selected ids for bulk actions
let selectedIds = $state<number[]>([]);

function toggleSelect(id: number) {
	const idx = selectedIds.indexOf(id);
	if (idx === -1) selectedIds = [...selectedIds, id];
	else selectedIds = selectedIds.filter((x) => x !== id);
}

function getSelectableIds() {
	// only real existing users (positive ids) are selectable for bulk actions
	return users.map((u) => Number(u.id)).filter((n) => Number.isFinite(n) && n > 0);
}

function toggleSelectAll() {
	const selectable = getSelectableIds();
	if (selectable.length === 0) {
		selectedIds = [];
		return;
	}
	const allSelected = selectable.every((id) => selectedIds.indexOf(id) !== -1);
	if (allSelected) selectedIds = [];
	else selectedIds = [...selectable];
}

let editingId = $state<number | null>(null);
let editValues = $state<Record<number, { username: string; password: string }>>({});

// handle add/new row
function handleAdd() {
	const id = nextNewId--;
	users = [{ id, isNew: true, nama: '', username: '', type: 'admin', mataPelajaranId: mataPelajaran[0]?.id ?? null } as LocalUser, ...users];
	newValues[id] = { nama: '', username: '', password: '', type: 'admin', mataPelajaranId: mataPelajaran[0]?.id ?? null };
}

// handle delete flow (shows modal and performs deletion)
async function handleDelete() {
	const selectedUsers = users.filter((u) => selectedIds.indexOf(u.id as number) !== -1);
	const hasWali = selectedUsers.some((u) => (u as any).type === 'wali_kelas');
	let bodyContent = `Yakin ingin menghapus ${selectedIds.length} pengguna yang dipilih?`;
	let positive: any = {
		label: 'Hapus',
		icon: 'del',
		action: async ({ close }: { close: () => void }) => {
			const idsToDelete = selectedIds.filter((n) => n > 0);
			if (!idsToDelete.length) {
				toast({ message: 'Tidak ada pengguna valid untuk dihapus', type: 'error' });
				return;
			}
			const form = new FormData();
			form.set('ids', idsToDelete.join(','));
			const res = await fetch('?/delete_users', { method: 'POST', body: form });
			if (res.ok) {
				const body = await res.json().catch(() => ({}));
				users = users.filter((x) => !idsToDelete.includes(x.id as number));
				selectedIds = [];
				users = [...users];
				toast({ message: `Berhasil menghapus ${idsToDelete.length} pengguna`, type: 'success' });
				close();
			} else {
				let msg = 'Gagal menghapus';
				let parsedBody: any = null;
				try {
					parsedBody = await res.json().catch(() => null);
					if (parsedBody) {
						if (typeof parsedBody.message === 'string' && parsedBody.message.trim()) msg = parsedBody.message;
						else if (parsedBody.type === 'warning' && typeof parsedBody.message === 'string') msg = parsedBody.message;
						else if (parsedBody.error && typeof parsedBody.error.message === 'string') msg = parsedBody.error.message;
						else msg = JSON.stringify(parsedBody);
					} else {
						const text = await res.text().catch(() => 'Gagal');
						msg = text;
					}
				} catch (e) {
					const text = await res.text().catch(() => 'Gagal');
					msg = text;
				}
				try {
					if (parsedBody && parsedBody.type === 'warning' && typeof parsedBody.message === 'string') {
						const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
						const safe = escapeHtml(parsedBody.message);
						updateModal({
							title: 'Hapus pengguna',
							body: `<div class="alert alert-warning flex items-start gap-3"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24" class="h-5 w-5 shrink-0"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg><div class="flex-1">${safe}</div></div>`,
							onPositive: { label: 'Atur Wali Kelas', icon: 'key', action: ({ close }: { close: () => void }) => { close(); window.location.href = '/kelas'; } },
							onNegative: { label: 'Tutup', icon: 'close' },
							dismissible: true
						});
						return;
					}
				} catch (e) {
					// ignore
				}
				toast({ message: msg, type: 'warning' });
			}
		}
	};
	if (hasWali) {
		bodyContent = `<div class="alert alert-warning flex items-center gap-3"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" viewBox="0 0 24 24" class="h-5 w-5 shrink-0"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg><div class="flex-1">Tidak dapat menghapus karena satu atau lebih pengguna terpilih berperan sebagai Wali Kelas. Untuk menggantinya, klik tombol <strong>Ganti Wali Kelas</strong></div>`;
		positive = { label: 'Ganti Wali Kelas', icon: 'edit', action: ({ close }: { close: () => void }) => { close(); window.location.href = '/kelas'; } };
	}
	showModal({ title: 'Hapus pengguna', body: bodyContent, onPositive: positive, onNegative: { label: 'Batal', icon: 'close' }, dismissible: true });
}
</script>

<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
	<div class="space-y-4">
		<header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="space-y-2">
				<h1 class="text-2xl font-bold">Daftar pengguna</h1>
			</div>
			<UsersHeader {selectedIds} onDelete={handleDelete} onAdd={handleAdd} />
		</header>
		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						{#if !editingId}
							<th>
								<input type="checkbox" class="checkbox" checked={getSelectableIds().length > 0 && getSelectableIds().every((id) => selectedIds.indexOf(id) !== -1)} onclick={() => toggleSelectAll()} />
							</th>
						{/if}
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
									<input type="checkbox" class="checkbox" checked={selectedIds.indexOf(u.id) !== -1} onclick={() => toggleSelect(u.id)} />
								</td>
							{/if}

							{#if u.isNew}
								<NewUserRow id={u.id} {mataPelajaran} {newValues} onCancel={(id: number) => { users = users.filter((x) => x.id !== id); delete newValues[id]; }} onSave={async (id: number) => {
									const form = new FormData();
									form.set('username', newValues[id].username || '');
									form.set('password', newValues[id].password || '');
									form.set('nama', newValues[id].nama || '');
									form.set('type', newValues[id].type || 'user');
									form.set('mataPelajaranId', String(newValues[id].mataPelajaranId ?? ''));
									const res = await fetch('?/create_user', { method: 'POST', body: form });
									if (res.ok) {
										const body = await res.json().catch(() => ({}));
										toast({ message: 'Pengguna dibuat', type: 'success' });
										const serverUser = body.user ?? null;
										const newUser = {
											id: serverUser?.id ?? Date.now(),
											username: serverUser?.username ?? newValues[id].username,
											createdAt: serverUser?.createdAt ?? new Date().toISOString(),
											type: serverUser?.type ?? newValues[id].type,
											pegawaiName: body.displayName || newValues[id].nama || (serverUser?.username ?? newValues[id].username),
											pegawaiId: null,
											kelasId: null,
											kelasName: null,
											passwordUpdatedAt: serverUser?.passwordUpdatedAt ?? new Date().toISOString()
										} as LocalUser;
										const idx = users.findIndex((x) => x.id === id);
										if (idx !== -1) { users[idx] = newUser; users = [...users]; } else { users = [newUser, ...users]; }
										delete newValues[id];
									} else {
										const text = await res.text().catch(() => 'Gagal');
										toast({ message: `Gagal membuat: ${text}`, type: 'error' });
									}
								}} />
							{:else}
								<ExistingUserRow u={u} {editingId} {editValues}
									onToggleEdit={(user: LocalUser) => {
										if (editingId === user.id) { editingId = null; }
										else { editingId = user.id; editValues[user.id] = { username: user.username ?? '', password: '' }; }
									}}
									onSaveEdit={async (user: LocalUser) => {
										const form = new FormData(); form.set('id', String(user.id)); form.set('username', editValues[user.id].username); form.set('password', editValues[user.id].password);
										const res = await fetch('?/update_credentials', { method: 'POST', body: form });
										if (res.ok) {
											const body = await res.json().catch(() => ({}));
											toast({ message: 'Perubahan tersimpan', type: 'success' });
											if (body.user) {
												const idx = users.findIndex((x) => x.id === body.user.id);
												if (idx !== -1) { users[idx] = { ...users[idx], username: body.user.username ?? users[idx].username, passwordUpdatedAt: body.user.passwordUpdatedAt ?? users[idx].passwordUpdatedAt }; }
											} else {
												const idx = users.findIndex((x) => x.id === user.id);
												if (idx !== -1) { users[idx] = { ...users[idx], username: editValues[user.id].username || users[idx].username, passwordUpdatedAt: editValues[user.id].password ? new Date().toISOString() : users[idx].passwordUpdatedAt }; }
											}
											editingId = null;
										} else { const text = await res.text().catch(() => 'Gagal'); toast({ message: `Gagal menyimpan: ${text}`, type: 'error' }); }
									}}
									onOpenUser={(user: LocalUser) => { window.location.href = '/pengguna/' + user.id }} />
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>
