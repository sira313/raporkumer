<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	let { u, onEdit, onOpenUser, onDelete = undefined } = $props();
</script>

<td>{u.pegawaiName ?? u.username}</td>
<td>{(u.roles ?? []).join(', ')}</td>
<td>{u.username ? u.username : '-'}</td>
<td>
	<div class="flex flex-row">
		<button
			class="btn btn-sm btn-soft rounded-r-none shadow-none"
			title="Edit pengguna"
			onclick={() => onEdit?.(u)}
		>
			<Icon name="edit" />
		</button>
		<button
			class="btn btn-sm btn-error btn-soft rounded-l-none shadow-none"
			title="Hapus pengguna"
			onclick={() => onDelete?.(u)}
		>
			<Icon name="del" />
		</button>
	</div>
</td>
<td>
	<button
		class="btn btn-sm btn-soft shadow-none"
		title="Atur hak akses"
		type="button"
		onclick={(e) => {
			e.preventDefault();
			if (!u.isNew) onOpenUser?.(u);
		}}
		disabled={!!u.isNew}
	>
		<Icon name="key" />
	</button>
</td>
