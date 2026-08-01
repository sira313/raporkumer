<script lang="ts">
	import { searchQueryMarker } from '$lib/utils';

	type StatusPerDay = 'hadir' | 'izin' | 'sakit' | 'dinas_luar' | 'belum' | '';

	type BulananRow = {
		no: number;
		nama: string;
		statusPerDay: StatusPerDay[];
		countHadir: number;
		countIzin: number;
		countSakit: number;
		countDinasLuar: number;
		countBelum: number;
	};

	let {
		rows,
		daysInMonth,
		redDays,
		search
	}: {
		rows: BulananRow[];
		daysInMonth: number;
		redDays: number[];
		search: string | null;
	} = $props();
</script>

<div
	class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none"
>
	<table class="border-base-200 table border text-xs sm:text-sm dark:border-none">
		<thead>
			<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
				<th
					class="bg-base-200 dark:bg-base-300 sticky left-0 z-10 text-center"
					style="width: 40px; min-width: 36px;">No</th
				>
				<th class="bg-base-200 dark:bg-base-300 sticky left-[40px] z-10" style="min-width: 160px;"
					>Nama Guru</th
				>
				{#each Array.from({ length: daysInMonth }, (_, i) => i) as day (day)}
					{@const isRed = redDays.includes(day + 1)}
					<th class="text-center {isRed ? 'text-error' : ''}" style="width: 30px; min-width: 26px;"
						>{day + 1}</th
					>
				{/each}
				<th class="text-center" style="width: 34px; min-width: 30px;">H</th>
				<th class="text-center" style="width: 34px; min-width: 30px;">I</th>
				<th class="text-center" style="width: 34px; min-width: 30px;">S</th>
				<th class="text-center" style="width: 38px; min-width: 34px;">DL</th>
				<th class="text-center" style="width: 38px; min-width: 34px;">TK</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.no)}
				<tr class="hover:bg-base-200/30">
					<td class="bg-base-100 dark:bg-base-200 sticky left-0 z-10 text-center">{row.no}</td>
					<td class="bg-base-100 dark:bg-base-200 sticky left-[40px] z-10"
						>{@html searchQueryMarker(search, row.nama)}</td
					>
					{#each row.statusPerDay as status, i (i)}
						{@const isRed = redDays.includes(i + 1)}
						<td
							class="text-center font-mono {isRed ? 'bg-error/5' : ''}"
							style="height: 30px; padding: 0;"
						>
							{#if status === 'hadir'}
								<span class="text-success font-bold">H</span>
							{:else if status === 'sakit'}
								<span class="text-warning font-bold">S</span>
							{:else if status === 'izin'}
								<span class="text-info font-bold">I</span>
							{:else if status === 'dinas_luar'}
								<span class="text-primary font-bold">D</span>
							{:else if status === 'belum'}
								<span class="text-error font-bold">TK</span>
							{:else}
								<span class="text-base-content/20">-</span>
							{/if}
						</td>
					{/each}
					<td class="text-center font-bold">{row.countHadir || ''}</td>
					<td class="text-center font-bold">{row.countIzin || ''}</td>
					<td class="text-center font-bold">{row.countSakit || ''}</td>
					<td class="text-center font-bold">{row.countDinasLuar || ''}</td>
					<td class="text-center font-bold">{row.countBelum || ''}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
