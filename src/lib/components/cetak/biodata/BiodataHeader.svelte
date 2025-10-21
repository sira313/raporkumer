<script lang="ts">
	import { formatUpper } from './format';

	const props = $props<{
		sekolah: BiodataPrintData['sekolah'] | null;
		class?: string;
	}>();

	let { sekolah, class: className = '' } = props;

	const headerClass = $derived.by(() => ['text-center', className].filter(Boolean).join(' '));
</script>

<header class={headerClass}>
	<h1 class="text-2xl font-bold tracking-wide uppercase">Identitas Murid</h1>
	{#if sekolah}
		<p class="text-base-content/70 mt-1 text-sm tracking-wide uppercase">
			{formatUpper(sekolah?.nama)}
		</p>
	{/if}
</header>
