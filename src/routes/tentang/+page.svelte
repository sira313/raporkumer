<script lang="ts">
	import Masukan from './masukan.svelte';

	let masukanModal: InstanceType<typeof Masukan>;
</script>

<div class="card rounded-box bg-base-100 mx-auto w-full max-w-4xl shadow-sm">
	<div class="card-body text-base">
		<h2 class="card-title mb-4 text-xl font-bold">Aplikasi E-Rapor Kurikulum Merdeka</h2>
		<p class="prose max-w-none">
			Aplikasi E-Rapor Kurikulum Merdeka ini kami kembangkan dengan tujuan utama untuk memudahkan
			guru dalam mengelola dan mengolah nilai peserta didik menjadi nilai rapor yang siap cetak.
			Proses input data dapat dilakukan secara manual maupun sekaligus melalui fitur <span
				class="font-medium">import file Excel</span
			> menggunakan template yang telah disediakan.
		</p>
		<p class="prose max-w-none">
			Selain mempermudah guru, aplikasi ini juga dirancang untuk membantu operator sekolah dalam
			proses penginputan nilai ke dalam aplikasi Dapodik. Fitur <span class="font-medium"
				>ekspor nilai ke Dapodik</span
			>
			tersedia agar proses integrasi data menjadi lebih efisien dan mengurangi risiko kesalahan input.
		</p>
		<p class="prose max-w-none">
			Pengembangan aplikasi ini terinspirasi dari <a
				href="https://e-raport.vercel.app/contact"
				target="_blank"
				class="link link-primary">aplikasi E-Rapor</a
			>
			karya
			<a target="_blank" class="link link-primary" href="https://zakirafi.vercel.app/">Zaki Rafi</a
			>, yang memberikan banyak ide dan referensi dalam membangun sistem ini. Dalam proses
			pengembangan, kami juga mendapatkan dukungan dari
			<a href="https://mustofa.id" target="_blank" class="link link-primary">Habib Mustofa</a>
			yang turut membantu dalam menyempurnakan fitur dan antarmuka pengguna.
		</p>
		<p class="prose max-w-none">
			Harapan kami, aplikasi ini dapat menjadi solusi praktis dan bermanfaat bagi seluruh tenaga
			pendidik dalam menerapkan Kurikulum Merdeka secara efektif, efisien, dan sesuai dengan
			kebutuhan di lapangan.
		</p>
		<p class="prose max-w-none">
			Pengembang:<br />
			- <a href="https://apoxi.cam/" target="_blank" class="link link-primary">Aris Pratama</a>
			(UI Designer)<br />
			- <a href="https://mustofa.id" target="_blank" class="link link-primary">Habib Mustofa</a>
			(Database Dev)<br />
		</p>
		<div class="card-actions mt-4 justify-end">
			<button class="btn btn-primary shadow-none" on:click={() => masukanModal.openModal()}>
				Kirim Masukan
			</button>
		</div>
	</div>
</div>
<Masukan bind:this={masukanModal} />
