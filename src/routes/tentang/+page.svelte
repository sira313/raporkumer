<script lang="ts">
	import Masukan from './masukan.svelte';
	import Donate from '$lib/components/donate.svelte';

	let masukanModal: InstanceType<typeof Masukan>;
</script>

<Donate />

<div class="card rounded-box bg-base-100 shadow-md">
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
			Dalam proses pengembangan, kami menyampaikan rasa terima kasih kepada
			<a href="https://mustofa.id" target="_blank" class="link link-primary">Habib Mustofa</a>
			yang telah banyak membantu dalam pengembangan aplikasi ini.
		</p>
		<p class="prose max-w-none">
			Harapan kami, aplikasi ini dapat menjadi solusi praktis dan bermanfaat bagi seluruh tenaga
			pendidik dalam menerapkan Kurikulum Merdeka secara efektif, efisien, dan sesuai dengan
			kebutuhan di lapangan.
		</p>
		<div class="prose max-w-none pt-6">
			<h3 class="font-semibold">Pengembang:</h3>
			<ul class="list-disc pl-5">
				<li>
					<a href="https://apoxi.cam/" target="_blank" class="link link-primary">Aris Pratama</a>
					(Founder & Maintainer)
				</li>
				<li>
					<a href="https://mustofa.id" target="_blank" class="link link-primary">Habib Mustofa</a>
					(Mentor & Advisor)
				</li>
			</ul>
			<h3 class="font-semibold">Referensi:</h3>
			<ul class="list-disc pl-5">
				<li>
					<a
						href="https://kurikulum.kemdikbud.go.id/file/1755668120_manage_file.pdf"
						target="_blank"
						class="link link-primary">Panduan Belajar dan Asesmen revisi 2025</a
					>
				</li>
				<li>
					<a
						href="https://kurikulum.kemdikbud.go.id/file/1753779343_manage_file.pdf"
						target="_blank"
						class="link link-primary">Panduan Kokurikuler tahun 2025</a
					>
				</li>
			</ul>
		</div>
		<div class="card-actions mt-4 justify-end">
			<button class="btn btn-primary shadow-none" on:click={() => masukanModal.openModal()}>
				Kirim Masukan
			</button>
		</div>
	</div>
</div>

<div class="card rounded-box bg-base-100 mt-6 shadow-md">
	<div class="card-body text-base">
		<h2 class="card-title mb-4 text-xl font-bold">Special Thanks</h2>
		<p class="prose max-w-none">
			Kami mengucapkan terima kasih kepada semua pihak yang telah berkontribusi dalam pengembangan
			aplikasi ini, antara lain:
		</p>

		<p class="prose max-w-none">
			Ide dan saran pengembangan UI
		</p>
		<ul class="prose max-w-none list-disc pl-5">
			<li>
				<span class="font-semibold">Suryanti Mandasari, S.Pd.</span>
			</li>
		</ul>
		<p class="prose max-w-none">
			Ide dan saran alur asesemen
		</p>
		<ul class="prose max-w-none list-disc pl-5">
			<li><span class="font-semibold">Saipul Anam, S.Pd.</span></li>
			<li><span class="font-semibold">Anistoga, S.Pd</span></li>
			<li><span class="font-semibold">Fathonah Nilawidya, S.Pd.</span></li>
		</ul>
		<p class="prose max-w-none">
			Semua pihak yang telah memberikan donasi untuk aplikasi ini melalui <a
				href="https://trakteer.id/raporkumer/"
				target="_blank"
				class="link link-primary">trakteer</a
			>.
		</p>
	</div>
</div>
<Masukan bind:this={masukanModal} />
