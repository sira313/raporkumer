<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	let { data } = $props();
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
		<table class="table">
	<thead>
		<tr>
			<th>ID</th>
			<th>Username</th>
			<th>Dibuat pada</th>
			<td>Aksi</td>
		</tr>
	</thead>
	<tbody>
		{#each data.users as u}
			<tr>
				<td>{u.id}</td>
				<td>{u.username}</td>
				<td>{u.createdAt}</td>
				<td>
					<div class="flex flex-row">
						<btn class="btn btn-error btn-sm shadow-none btn-soft rounded-r-none">
							<Icon name="del" />
						</btn>
						<btn class="btn btn-sm shadow-none btn-soft rounded-none">
							<Icon name="edit" />
						</btn>
						<a class="btn btn-info btn-sm shadow-none btn-soft rounded-l-none" href="/pengguna/{u.id}">
							<Icon name="eye" />
						</a>
					</div>
				</td>
			</tr>
		{/each}
	</tbody>
		</table>
	</div>
</section>