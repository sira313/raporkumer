<script>
	import Icon from './icon.svelte';
</script>

<div class="card bg-base-100 mb-6 hidden max-h-80 min-h-80 shadow-md xl:block">
	<div class="flex flex-row items-center justify-center p-4">
		<h2 class="text-lg font-bold">Daftar tugas</h2>
		<div class="flex-1"></div>
		<div class="btn btn-circle btn-ghost">
			<Icon name="plus" class="text-xl" />
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
