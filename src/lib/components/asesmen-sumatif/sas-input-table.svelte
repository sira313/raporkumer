<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		sasTesText: string;
		sasNonTesText: string;
		getInputClass: (value: string) => string;
		onsasChange?: (event: CustomEvent<{ target: 'tes' | 'nonTes'; value: string }>) => void;
	}

	let { sasTesText, sasNonTesText, getInputClass }: Props = $props();

	const dispatch = createEventDispatcher<{
		sasChange: { target: 'tes' | 'nonTes'; value: string };
	}>();

	function handleInput(targetKey: 'tes' | 'nonTes', event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		dispatch('sasChange', { target: targetKey, value: target.value });
	}
</script>

<div
	class="bg-base-100 dark:bg-base-200 border-base-200 mt-2 overflow-x-auto rounded-md shadow-md dark:shadow-none"
>
	<table class="border-base-200 table border dark:border-none">
		<thead>
			<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
				<th style="width: 40px; min-width: 40px;">No</th>
				<th class="w-full" style="min-width: 220px;">Jenis Tes</th>
				<th style="min-width: 140px;">Nilai</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td>1</td>
				<td>Nilai Tes Sumatif Akhir Semester (SAS)</td>
				<td>
					<input
						type="number"
						name="sasTes"
						class={getInputClass(sasTesText)}
						value={sasTesText}
						placeholder="Isi nilai"
						min="0"
						max="100"
						step="0.01"
						required
						inputmode="decimal"
						title="Rentang 0-100 dengan maksimal 2 angka desimal"
						spellcheck="false"
						oninput={(event) => handleInput('tes', event)}
					/>
				</td>
			</tr>
			<tr>
				<td>2</td>
				<td>Nilai Non Tes Sumatif Akhir Semester (SAS)</td>
				<td>
					<input
						type="number"
						name="sasNonTes"
						class={getInputClass(sasNonTesText)}
						value={sasNonTesText}
						placeholder="Isi nilai"
						min="0"
						max="100"
						step="0.01"
						required
						inputmode="decimal"
						title="Rentang 0-100 dengan maksimal 2 angka desimal"
						spellcheck="false"
						oninput={(event) => handleInput('nonTes', event)}
					/>
				</td>
			</tr>
		</tbody>
	</table>
</div>
