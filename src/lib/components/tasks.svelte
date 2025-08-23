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
	<div class="overflow-x-auto">
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
	</div>
</div>
