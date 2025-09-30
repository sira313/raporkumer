<script lang="ts">
	import FormMataPelajaran from '../../form/+page.svelte';

	let { data } = $props();
	const editData = $derived({ ...data, mode: 'edit' });
</script>

<FormMataPelajaran data={editData} />
