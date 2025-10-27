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
						<a class="btn btn-primary btn-sm shadow-none btn-soft rounded-l-none" href="/pengguna/{u.id}">
							<Icon name="key" />
						</a>
					</div>
				</td>
			</tr>
		{/each}
	</tbody>
		</table>
	</div>
</section>