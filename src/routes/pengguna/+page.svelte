<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	let { data } = $props();
</script>

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
					<a class="btn btn-outline btn-info" href="/pengguna/{u.id}">
						<Icon name="info" />
						Detail
					</a>
				</td>
			</tr>
		{/each}
	</tbody>
</table>
