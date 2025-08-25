<script>
	import Icon from './icon.svelte';
</script>

<div class="card bg-base-100 mb-6 hidden max-h-80 min-h-80 shadow-md xl:block">
	<div class="flex flex-row items-center justify-center p-4">
		<h2 class="text-lg font-bold">Daftar tugas</h2>
		<div class="flex-1"></div>
		<div class="join">
			<div class="btn join-item shadow-none">
				<Icon name="plus" />
			</div>
			<div class="dropdown dropdown-end">
				<div
					tabindex="0"
					role="button"
					title="Tombol hapus"
					class="join-item btn btn-error btn-soft shadow-none"
				>
					<Icon name="del" />
					<Icon name="collapse-all" />
				</div>
				<ul class="menu dropdown-content bg-base-100 rounded-box z-1 mt-2 w-40 p-2 shadow-md">
					<li class="btn btn-ghost btn-sm">Hapus tugas selesai</li>
					<li class="btn btn-ghost btn-sm">Hapus semua tugas</li>
				</ul>
			</div>
		</div>
	</div>
	<!-- konten -->
	<div class="max-h-60 min-h-60 overflow-y-auto">
		<table class="table">
			<tbody>
				<!-- row 1 -->
				<tr>
					<th><input type="checkbox" class="checkbox" /></th>
					<td><p class="flex-1">Mengisi nilai IPAS untuk semua siswa kelas I</p></td>
					<td>
						<button class="btn btn-circle btn-ghost" title="Hapus tugas">
							<Icon name="del" />
						</button>
					</td>
				</tr>
				<!-- row 2 -->
				<tr>
					<th><input type="checkbox" class="checkbox" /></th>
					<td><p class="flex-1">Mengisi nilai IPAS untuk semua siswa kelas I</p></td>
					<td>
						<button class="btn btn-circle btn-ghost" title="Hapus tugas">
							<Icon name="del" />
						</button>
					</td>
				</tr>
			</tbody>
		</table>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div class="m-2">
			<div tabindex="0" class="bg-base-200 border-base-300 collapse border">
				<div class="collapse-title font-semibold">Daftar tugas sudah selesai</div>
				<div class="collapse-content p-0">
					<table class="table">
						<tbody>
							<!-- row 1 -->
							<tr>
								<th><input type="checkbox" checked class="checkbox" /></th>
								<td><p class="flex-1"><s>Mengisi Data Kelas</s></p></td>
								<td>
									<button class="btn btn-circle btn-ghost" title="Hapus tugas">
										<Icon name="del" />
									</button>
								</td>
							</tr>
							<!-- row 2 -->
							<tr>
								<th><input type="checkbox" checked class="checkbox" /></th>
								<td><p class="flex-1"><s>keluarkan Murid an. Jokowi</s></p></td>
								<td>
									<button class="btn btn-circle btn-ghost" title="Hapus tugas">
										<Icon name="del" />
									</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</div>
