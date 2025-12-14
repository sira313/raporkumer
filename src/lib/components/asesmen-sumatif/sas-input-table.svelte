<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		tesText: string;
		nonTesText: string;
		getInputClass: (value: string) => string;
		/** prefix used for input `name` attributes, e.g. 'sas' or 'sts' */
		namePrefix?: string;
		/** label for the tes row */
		tesLabel?: string;
		/** label for the non-tes row */
		nonTesLabel?: string;
	}

	let {
		tesText,
		nonTesText,
		getInputClass,
		namePrefix = 'sas',
		tesLabel = 'Nilai Tes Sumatif Akhir Semester (SAS)',
		nonTesLabel = 'Nilai Non Tes Sumatif Akhir Semester (SAS)'
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		sasChange: { namePrefix: string; target: 'tes' | 'nonTes'; value: string };
	}>();

	function handleInput(targetKey: 'tes' | 'nonTes', event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		dispatch('sasChange', { namePrefix, target: targetKey, value: target.value });
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
				<td>{tesLabel}</td>
				<td>
					<input
						type="number"
						name={`${namePrefix}Tes`}
						class={getInputClass(tesText)}
						value={tesText}
						placeholder="Isi nilai"
						min="0"
						max="100"
						step="0.01"
						inputmode="decimal"
						title="Rentang 0-100 dengan maksimal 2 angka desimal"
						spellcheck="false"
						oninput={(event) => handleInput('tes', event)}
					/>
				</td>
			</tr>
			<tr>
				<td>2</td>
				<td>{nonTesLabel}</td>
				<td>
					<input
						type="number"
						name={`${namePrefix}NonTes`}
						class={getInputClass(nonTesText)}
						value={nonTesText}
						placeholder="Isi nilai"
						min="0"
						max="100"
						step="0.01"
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
