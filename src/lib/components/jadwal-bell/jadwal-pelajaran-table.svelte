<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import { touchDragSource, dropTarget } from '$lib/touch-drag.svelte';

	interface DragPayload {
		hari: string;
		jamKe: number;
		kelasId?: number;
		kode: string;
	}

	let {
		scrollEl = $bindable(null),
		hariList,
		kelasTerurut,
		hariMaxJam,
		waktuMatrix,
		kodeMerged,
		kodeNamaMap,
		badgeColorMap,
		canManage,
		isEditing,
		getKode,
		isAllSame,
		formatHari,
		onDragStart,
		onDragEnd,
		onDrop,
		onClearCell,
		onCopyBelow
	}: {
		scrollEl?: HTMLDivElement | null;
		hariList: string[];
		kelasTerurut: { id: number; nama: string }[];
		hariMaxJam: Record<string, number>;
		waktuMatrix: Record<string, Record<number, { start: string; end: string }>>;
		kodeMerged: Set<string>;
		kodeNamaMap: Map<string, string>;
		badgeColorMap: Record<string, string>;
		canManage: boolean;
		isEditing: boolean;
		getKode: (hari: string, jamKe: number, kelasId: number) => string;
		isAllSame: (hari: string, jamKe: number) => string | null;
		formatHari: (hari: string) => string;
		onDragStart: (payload: DragPayload) => void;
		onDragEnd: () => void;
		onDrop: (e: DragEvent, hari: string, jamKe: number, kelasId?: number) => void;
		onClearCell: (hari: string, jamKe: number, kelasId?: number) => void;
		onCopyBelow: (hari: string, jamKe: number, kelasId?: number) => void;
	} = $props();
</script>

<div
	bind:this={scrollEl}
	class="bg-base-100 dark:bg-base-200 overflow-y-auto rounded-md shadow-md dark:shadow-none"
>
	<table class="border-base-200 dark:border-base-100 table border">
		<thead class="sticky top-0 z-10">
			<tr class="bg-base-200 dark:bg-base-300 text-left font-bold">
				<th rowspan="2" class="w-0">Hari</th>
				<th rowspan="2" class="w-0">Jam</th>
				<th rowspan="2" class="w-0">Waktu</th>
				<th colspan={kelasTerurut.length} class="text-center">
					{kelasTerurut.length > 0 ? 'Kelas' : ''}
				</th>
			</tr>
			<tr class="bg-base-200 dark:bg-base-300 text-left font-bold">
				{#each kelasTerurut as kelas (kelas.id)}
					<th class="min-w-[70px] max-w-[15ch] truncate text-center" title={kelas.nama}
						>{kelas.nama.slice(0, 15)}{kelas.nama.length > 15 ? '…' : ''}</th
					>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each hariList as hari (hari)}
				{#each Array.from({ length: hariMaxJam[hari] }, (_, i) => i + 1) as jamKe (jamKe)}
					{@const allSame = isAllSame(hari, jamKe)}
					{@const waktu = waktuMatrix[hari]?.[jamKe] ?? { start: '--:--', end: '--:--' }}
					<tr class="border-base-200 dark:border-base-100 border-b">
						{#if jamKe === 1}
							<td rowspan={hariMaxJam[hari]} class="align-top font-medium">
								{formatHari(hari)}
							</td>
						{/if}
						<td class="text-center text-sm">{jamKe}</td>
						<td class="text-xs whitespace-nowrap">
							{#if jamKe === hariMaxJam[hari]}
								{waktu.start}
							{:else}
								{waktu.start} - {waktu.end}
							{/if}
						</td>
						{#if kodeMerged.has(allSame ?? '') || (!canManage && allSame)}
							<td
								colspan={kelasTerurut.length}
								class="h-full text-center align-middle"
								ondragover={(e) => e.preventDefault()}
								ondrop={(e) => onDrop(e, hari, jamKe)}
								use:dropTarget={{ enabled: canManage && isEditing }}
							>
								<div class="flex h-full w-full items-center justify-center">
									{#if canManage && isEditing}
										<div class="join w-full">
											{#if jamKe < hariMaxJam[hari] && allSame}
												<button
													type="button"
													class="btn btn-xs join-item btn-soft btn-info shrink-0 px-1 shadow-none"
													onclick={() => onCopyBelow(hari, jamKe)}
													aria-label="Salin ke bawah"
												>
													<Icon name="copy" class="h-3 w-3" />
												</button>
											{/if}
											<span
												role="button"
												tabindex="-1"
												class="badge {badgeColorMap[allSame ?? ''] ??
													'badge-primary'} join-item badge-soft grow cursor-grab"
												draggable="true"
												ondragstart={(e) => {
													if (!canManage || !isEditing) return;
													onDragStart({ hari, jamKe, kode: allSame! });
													e.dataTransfer!.setData('text/plain', allSame!);
												}}
												ondragend={onDragEnd}
												use:touchDragSource={{
													enabled: canManage && isEditing && allSame !== null,
													dragData: () => ({ kode: allSame! }),
													onDragStart: () => onDragStart({ hari, jamKe, kode: allSame! })
												}}
											>
												{kodeNamaMap.get(allSame!) ?? allSame}
											</span>
											<button
												type="button"
												class="btn btn-xs join-item btn-soft btn-error shrink-0 px-1 shadow-none"
												onclick={() => onClearCell(hari, jamKe)}
												aria-label="Hapus {allSame}"
											>
												<Icon name="del" class="h-3 w-3" />
											</button>
										</div>
									{:else}
										<span
											class="badge {badgeColorMap[allSame ?? ''] ??
												'badge-primary'} badge-soft w-full"
										>
											{kodeNamaMap.get(allSame!) ?? allSame}
										</span>
									{/if}
								</div>
							</td>
						{:else}
							{#each kelasTerurut as kelas (kelas.id)}
								{@const kode = getKode(hari, jamKe, kelas.id)}
								<td
									class="text-center"
									ondragover={(e) => e.preventDefault()}
									ondrop={(e) => onDrop(e, hari, jamKe, kelas.id)}
									use:dropTarget={{ enabled: canManage && isEditing }}
								>
									{#if canManage && isEditing}
										{#if kode}
											<div class="join">
												{#if jamKe < hariMaxJam[hari]}
													<button
														type="button"
														class="btn btn-xs join-item btn-soft btn-info px-1 shadow-none"
														onclick={() => onCopyBelow(hari, jamKe, kelas.id)}
														aria-label="Salin ke bawah"
													>
														<Icon name="copy" class="h-3 w-3" />
													</button>
												{/if}
												<span
													role="button"
													tabindex="-1"
													class="badge {badgeColorMap[kode] ??
														'badge-primary'} join-item badge-soft text-xs cursor-grab"
													draggable="true"
													ondragstart={(e) => {
														if (!canManage || !isEditing || !kode) return;
														onDragStart({ hari, jamKe, kelasId: kelas.id, kode });
														e.dataTransfer!.setData('text/plain', kode);
													}}
													ondragend={onDragEnd}
													use:touchDragSource={{
														enabled: canManage && isEditing && kode !== '',
														dragData: () => ({ kode, kelasId: kelas.id }),
														onDragStart: () => onDragStart({ hari, jamKe, kelasId: kelas.id, kode })
													}}
												>
													{kodeNamaMap.get(kode) ?? kode}
												</span>
												<button
													type="button"
													class="btn btn-xs join-item btn-soft btn-error px-1 shadow-none"
													onclick={() => onClearCell(hari, jamKe, kelas.id)}
													aria-label="Hapus {kode}"
												>
													<Icon name="del" class="h-3 w-3" />
												</button>
											</div>
										{:else}
											<span class="text-base-content/30 cursor-default text-xs"> — </span>
										{/if}
									{:else if kode}
										<span class="badge {badgeColorMap[kode] ?? 'badge-primary'} badge-soft text-xs"
											>{kodeNamaMap.get(kode) ?? kode}</span
										>
									{:else}
										<span class="text-base-content/30 text-xs">—</span>
									{/if}
								</td>
							{/each}
						{/if}
					</tr>
				{/each}
			{/each}
		</tbody>
	</table>
</div>
