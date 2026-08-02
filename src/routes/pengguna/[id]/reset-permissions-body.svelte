<script lang="ts">
	let { username, roleType } = $props<{ username: string; roleType: string }>();
</script>

<p class="text-base-content/70">
	Izin <strong>{username}</strong> akan dikembalikan ke pengaturan default untuk tipe
	<strong>{roleType}</strong>. Semua penyesuaian manual akan hilang. Lanjutkan?
</p>
