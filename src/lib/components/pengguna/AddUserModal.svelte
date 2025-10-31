<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Icon from '$lib/components/icon.svelte';
	import { toast } from '$lib/components/toast.svelte';

	export let open: boolean = false;
	export let mataPelajaran: { id: number; nama: string }[] = [];

	const dispatch = createEventDispatcher();

	let nama = '';
	let username = '';
	let password = '';
	let type = 'user';
	// use empty string as the initial value so the placeholder option is selected reliably
	let mataPelajaranId: string | number | null = '';
	let uniqueMataPelajaran: { id: number; nama: string }[] = [];
	let filteredMataPelajaran: { id: number; nama: string }[] = [];
	let initialized = false;

	function uniqueByNama(list: { id: number; nama: string }[]) {
		const map = new Map<string, { id: number; nama: string }>();
		for (const m of list) {
			// keep the first occurrence for a given nama
			if (!map.has(m.nama)) map.set(m.nama, m);
		}
		return Array.from(map.values());
	}

	// initialize defaults only once when the modal opens (prevent clearing while open)
	$: if (open && !initialized) {
		nama = '';
		username = '';
		password = '';
		type = 'user';
		// start with no selection (empty string) so the placeholder is shown; user must pick a mapel
		mataPelajaranId = '';
		initialized = true;
	}

	// if modal is closed, allow re-initialization next time it opens
	$: if (!open) initialized = false;

	// update unique list whenever mataPelajaran prop changes
	$: uniqueMataPelajaran = uniqueByNama(mataPelajaran ?? []);

	// filter out only the parent subject "Pendidikan Agama dan Budi Pekerti"
	// Keep specific variants like "Pendidikan Agama Islam dan Budi Pekerti" etc.
	$: filteredMataPelajaran = uniqueMataPelajaran.filter((m) => {
		const name = (m.nama ?? '').toString().trim().toLowerCase();
		// exclude the exact combined parent subject
		if (name === 'pendidikan agama dan budi pekerti') return false;
		return true;
	});

	function close() {
		// reset initialized so next open will reinitialize fields
		initialized = false;
		open = false;
		dispatch('cancel');
	}

	async function save() {
		const form = new FormData();
		form.set('username', username || '');
		form.set('password', password || '');
		form.set('nama', nama || '');
		form.set('type', type || 'user');
		form.set('mataPelajaranId', String(mataPelajaranId ?? ''));
		try {
			const res = await fetch('?/create_user', { method: 'POST', body: form });
			if (res.ok) {
				const body = await res.json().catch(() => ({}));
				// merge local form values so the UI can update immediately even if server
				// response omits some fields. Do NOT include the raw password in the event.
				const mergedBody = {
					...body,
					username: body.user?.username ?? username,
					displayName: body.displayName ?? nama,
					mataPelajaranId: body.mataPelajaranId ?? mataPelajaranId ?? null,
					// ensure there's a `user` object for the parent to consume
					user: body.user ?? {
						id: Date.now(),
						username: body.user?.username ?? username,
						createdAt: new Date().toISOString(),
						type: body.user?.type ?? type,
						passwordUpdatedAt: body.user?.passwordUpdatedAt ?? new Date().toISOString()
					},
					// indicate whether server actually returned the user object (so parent can detect fallback)
					__server_user_returned: Boolean(body.user && typeof body.user.id !== 'undefined')
				};
				toast({ message: 'Pengguna dibuat', type: 'success' });
				dispatch('saved', { body: mergedBody });
				open = false;
			} else {
				// try to parse a JSON error payload from the action
				let msg = 'Gagal membuat pengguna';
				try {
					const parsed = await res.json().catch(() => null);
					if (parsed) {
						if (typeof parsed.message === 'string' && parsed.message.trim()) msg = parsed.message;
						else if (parsed.error && typeof parsed.error.message === 'string')
							msg = parsed.error.message;
						else msg = JSON.stringify(parsed);
					} else {
						msg = await res.text().catch(() => msg);
					}
				} catch {
					msg = (await res.text().catch(() => msg)) as string;
				}
				toast({ message: `Gagal membuat: ${msg}`, type: 'error' });
			}
		} catch {
			toast({ message: 'Gagal membuat pengguna', type: 'error' });
		}
	}
</script>

{#if open}
	<div class="modal modal-open">
		<div class="modal-box max-w-lg">
			<h3 class="text-lg font-bold">Tambah Pengguna</h3>
			<div class="space-y-3 py-4">
				<fieldset class="fieldset">
					<legend class="fieldset-legend">Mata Pelajaran (opsional)</legend>
					<select
						id="add-user-mapel"
						class="select dark:bg-base-200 w-full dark:border-none"
						bind:value={mataPelajaranId}
					>
						<option disabled selected={mataPelajaranId === ''} value="">Pilih Mata Pelajaran</option
						>
						{#each filteredMataPelajaran as m (m.id)}
							<option value={m.id}>{m.nama}</option>
						{/each}
						{#if filteredMataPelajaran.length === 0}
							<option disabled>- tidak ada mata pelajaran -</option>
						{/if}
					</select>
					<p class="label">Hubungkan pengguna ke mata pelajaran (jika ada)</p>
				</fieldset>

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Nama</legend>
					<input
						id="add-user-nama"
						class="input dark:bg-base-200 w-full dark:border-none"
						bind:value={nama}
						placeholder="Contoh: Bruce Wayne, Bat."
					/>
					<p class="label">Nama lengkap pengguna dan gelar (tampil pada daftar)</p>
				</fieldset>

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Akun</legend>
					<input
						id="add-user-username"
						class="input mb- dark:bg-base-200 w-full dark:border-none"
						bind:value={username}
						placeholder="Username"
					/>
					<input
						id="add-user-password"
						type="password"
						class="input dark:bg-base-200 w-full dark:border-none"
						bind:value={password}
						placeholder="Password"
					/>
					<p class="label">Username dan password untuk login</p>
				</fieldset>
			</div>

			<div class="modal-action">
				<button class="btn btn-soft" type="button" on:click={close}
					><Icon name="close" /> Batal</button
				>
				<button class="btn btn-primary shadow-none" type="button" on:click={save}
					><Icon name="save" /> Simpan</button
				>
			</div>
		</div>
	</div>
{/if}
