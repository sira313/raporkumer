<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	type Props = {
		state: 'no-keasramaan' | 'no-selection' | 'no-tujuan' | 'no-murid' | 'no-results';
	};

	let { state }: Props = $props();
</script>

{#if state === 'no-keasramaan'}
	<div class="alert alert-soft alert-info mt-6">
		<Icon name="info" />
		<span>
			Belum ada data Matev Keasramaan untuk kelas ini. Tambahkan terlebih dahulu di menu
			<strong>Keasramaan</strong>.
		</span>
	</div>
{:else if state === 'no-selection'}
	<div class="alert alert-soft alert-warning mt-6">
		<Icon name="alert" />
		<span>Pilih Matev untuk mulai menilai.</span>
	</div>
{:else if state === 'no-tujuan'}
	<div class="alert alert-soft alert-warning mt-6">
		<Icon name="alert" />
		<span>
			Matev ini belum memiliki tujuan pembelajaran. Tambahkan tujuan terlebih dahulu melalui menu
			<strong>Keasramaan &gt; Tujuan</strong>.
		</span>
	</div>
{:else if state === 'no-murid'}
	<div class="alert alert-soft alert-warning mt-6">
		<Icon name="alert" />
		<span>
			Belum ada data murid di kelas ini. Tambahkan murid terlebih dahulu melalui menu
			<strong>Murid</strong>.
		</span>
	</div>
{:else if state === 'no-results'}
	<div class="alert alert-soft alert-info mt-6">
		<Icon name="info" />
		<span>Tidak ada murid yang cocok dengan pencarian.</span>
	</div>
{/if}
