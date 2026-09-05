<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- Kembali link is a plain back nav */
	import Icon from '$lib/components/icon.svelte';

	let {
		canManage,
		isEditing,
		dirty,
		saving,
		bellActive,
		hasAnyPlgManual,
		onBatal,
		onKode,
		onPengaturan,
		onResetJamPulang,
		onTambahKegiatan,
		onEdit,
		onSave,
		onHapusSemua,
		onToggleBell,
		onSimulasi
	}: {
		canManage: boolean;
		isEditing: boolean;
		dirty: boolean;
		saving: boolean;
		bellActive: boolean;
		hasAnyPlgManual: boolean;
		onBatal: () => void;
		onKode: () => void;
		onPengaturan: () => void;
		onResetJamPulang: () => void;
		onTambahKegiatan: () => void;
		onEdit: () => void;
		onSave: () => void;
		onHapusSemua: () => void;
		onToggleBell: () => void;
		onSimulasi: () => void;
	} = $props();
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
	<div class="flex flex-wrap items-center gap-2">
		{#if isEditing}
			<button type="button" class="btn btn-soft btn-warning shadow-none" onclick={onBatal}>
				<Icon name="close" />
				Batal
			</button>
		{:else}
			<a href="/akademik" class="btn btn-soft shadow-none">
				<Icon name="left" /> Kembali
			</a>
		{/if}
		<button
			type="button"
			class="btn btn-soft shadow-none xl:hidden"
			onclick={onKode}
			title="Kode Kegiatan"
		>
			<Icon name="grid" />
			Kode
		</button>
		<button
			type="button"
			class="btn btn-soft shadow-none"
			onclick={onPengaturan}
			disabled={!canManage || isEditing}
			aria-disabled={!canManage || isEditing}
			title={!canManage || isEditing ? 'Anda tidak memiliki izin' : ''}
		>
			<Icon name="gear" />
			Pengaturan
		</button>
		{#if isEditing && hasAnyPlgManual}
			<button type="button" class="btn btn-soft shadow-none" onclick={onResetJamPulang}>
				<Icon name="repeat" />
				Reset Jam Pulang
			</button>
		{:else}
			<button
				type="button"
				class="btn btn-soft shadow-none"
				onclick={onTambahKegiatan}
				disabled={!canManage || isEditing}
				aria-disabled={!canManage || isEditing}
				title={!canManage || isEditing ? 'Anda tidak memiliki izin' : ''}
			>
				<Icon name="plus" />
				Tambah Kegiatan
			</button>
		{/if}
		{#if !isEditing && canManage}
			<button type="button" class="btn btn-soft shadow-none" onclick={onEdit}>
				<Icon name="edit" />
				Edit
			</button>
		{/if}
		{#if dirty && isEditing}
			<button type="button" class="btn btn-primary shadow-none" onclick={onSave} disabled={saving}>
				{#if saving}
					<span class="loading loading-spinner loading-sm"></span>
					Menyimpan…
				{:else}
					<Icon name="save" />
					Simpan Jadwal
				{/if}
			</button>
		{/if}
	</div>
	{#if isEditing}
		<button type="button" class="btn btn-error btn-soft shadow-none" onclick={onHapusSemua}>
			<Icon name="del" />
			Hapus semua
		</button>
	{:else}
		<div class="flex">
			<button
				type="button"
				class="btn btn-soft rounded-r-none shadow-none {bellActive ? 'btn-error' : 'btn-success'}"
				onclick={onToggleBell}
				disabled={!canManage}
				aria-disabled={!canManage}
				title={!canManage ? 'Anda tidak memiliki izin' : ''}
			>
				<Icon name={bellActive ? 'pause' : 'play'} />
				{bellActive ? 'Pause Bell' : 'Play Bell'}
			</button>
			<div class="dropdown dropdown-end">
				<button
					type="button"
					class="btn btn-soft rounded-l-none shadow-none {bellActive ? 'btn-error' : 'btn-success'}"
					disabled={!canManage}
					aria-label="Menu bell"
				>
					<Icon name="more-vertical" />
				</button>
				<ul
					class="dropdown-content menu bg-base-100 border-base-300 z-50 mt-2 w-44 rounded-md border p-2 shadow-lg"
				>
					<li>
						<button type="button" onclick={onSimulasi}>
							<Icon name="play" />
							Simulasi Bell
						</button>
					</li>
				</ul>
			</div>
		</div>
	{/if}
</div>
