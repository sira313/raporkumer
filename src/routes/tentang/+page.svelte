<script lang="ts">
	import Masukan from './masukan.svelte';
	import Donate from '$lib/components/donate.svelte';
	import Icon from '$lib/components/icon.svelte';

	let masukanModal: InstanceType<typeof Masukan>;
</script>

<Donate />

<div class="mx-auto max-w-5xl space-y-6 lg:space-y-6">
	<section
		class="rounded-box from-primary/15 via-base-100 to-secondary/20 ring-base-200/60 overflow-hidden bg-gradient-to-br p-8 shadow-md ring-1 sm:p-10"
	>
		<div class="flex flex-col gap-8 lg:flex-row lg:items-center">
			<div class="flex-1 space-y-6">
				<span class="badge badge-outline badge-lg bg-base-100/70 text-primary shadow-md"
					>Tentang Rapkumer</span
				>
				<h1 class="text-base-content text-3xl font-bold md:text-4xl">
					Aplikasi E-Rapor Kurikulum Merdeka
				</h1>
				<p class="text-base-content/90 max-w-2xl text-base lg:text-lg">
					Rapkumer membantu guru dan operator sekolah mengelola nilai peserta didik secara cepat,
					rapi, dan siap cetak sesuai kurikulum terbaru.
				</p>
				<div class="grid gap-4 sm:grid-cols-2">
					<div
						class="rounded-box border-base-200/70 bg-base-100/80 border p-4 shadow-md backdrop-blur"
					>
						<h3 class="text-primary font-semibold">Import Excel Sekali Klik</h3>
						<p class="text-base-content/80 text-sm">
							Gunakan template bawaan untuk memasukkan data secara massal tanpa perlu copy paste
							berulang.
						</p>
					</div>
					<div
						class="rounded-box border-base-200/70 bg-base-100/80 border p-4 shadow-md backdrop-blur"
					>
							<h3 class="text-secondary font-semibold">Ekspor Nilai ke Dapodik</h3>
							<p class="text-base-content/80 text-sm">
								Integrasi nilai ke aplikasi Dapodik sedang melalui tahap riset lanjutan agar format ekspor
									downstream benar-benar sesuai dan aman dipakai. Mohon donasi agar kami lebih bersemangat dalam mengembangkan aplikasi ini.
							</p>
					</div>
				</div>
				<div class="flex flex-wrap gap-3">
					<a
						class="btn btn-outline btn-lg shadow-none"
						href="https://kurikulum.kemdikbud.go.id/"
						target="_blank"
						rel="noreferrer"
					>
						Pelajari Kurikulum
					</a>
					<a
						class="btn btn-primary btn-lg shadow-none sm:ml-auto"
						href="https://t.me/+zj3h_zjBAC02YjZl"
						target="_blank"
						rel="noreferrer"
					>
						<Icon name="telegram" class="text-xl" />
						Gabung Grup Telegram
					</a>
				</div>
			</div>
		</div>
	</section>

	<section class="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
		<div class="card rounded-box border-base-200/80 bg-base-100/90 h-full border shadow-md">
			<div class="card-body space-y-4 text-base">
				<h2 class="text-base-content text-2xl font-semibold">Mengapa kami membangun Rapkumer?</h2>
				<p class="text-base-content/90">
					Aplikasi E-Rapor Kurikulum Merdeka ini kami kembangkan dengan tujuan utama untuk
					memudahkan guru dalam mengelola dan mengolah nilai peserta didik menjadi nilai rapor yang
					siap cetak. Proses input data dapat dilakukan secara manual maupun sekaligus melalui fitur
					<span class="font-medium">import file Excel</span>
					menggunakan template yang telah disediakan.
				</p>
				<p class="text-base-content/90">
					Selain mempermudah guru, aplikasi ini juga dirancang untuk membantu operator sekolah dalam
					proses penginputan nilai ke dalam aplikasi Dapodik. Saat ini fitur
					<span class="font-medium">ekspor nilai ke Dapodik</span>
					sedang kami sempurnakan melalui riset format dan alur validasi, sehingga rilisnya dilakukan
					bertahap agar tetap aman digunakan di lingkungan sekolah.
				</p>
				<p class="text-base-content/90">
					Harapan kami, aplikasi ini dapat menjadi solusi praktis dan bermanfaat bagi seluruh tenaga
					pendidik dalam menerapkan Kurikulum Merdeka secara efektif, efisien, dan sesuai dengan
					kebutuhan di lapangan.
				</p>
			</div>
		</div>

		<div class="card rounded-box border-base-200/80 bg-base-100/90 h-full border shadow-md">
			<div class="card-body space-y-6 text-base">
				<div class="space-y-3">
					<h3 class="text-base-content text-xl font-semibold">Rasa Terima Kasih</h3>
					<p class="text-base-content/90">
						Dalam proses pengembangan, kami menyampaikan rasa terima kasih kepada
						<a href="https://mustofa.id" target="_blank" class="link link-primary">Habib Mustofa</a>
						yang telah banyak membantu dalam pengembangan aplikasi ini.
					</p>
				</div>
				<div class="space-y-3">
					<h3 class="text-base-content text-xl font-semibold">Pengembang</h3>
					<ul class="text-base-content/90 list-inside list-disc space-y-1">
						<li>
							<a href="https://apoxi.cam/" target="_blank" class="link link-primary">Aris Pratama</a
							>
							<span class="text-base-content/70 text-sm"> — Founder & Maintainer</span>
						</li>
						<li>
							<a href="https://mustofa.id" target="_blank" class="link link-primary"
								>Habib Mustofa</a
							>
							<span class="text-base-content/70 text-sm"> — Mentor & Advisor</span>
						</li>
					</ul>
				</div>
				<div class="space-y-3">
					<h3 class="text-base-content text-xl font-semibold">Tester</h3>
					<ul class="text-base-content/90 list-inside list-disc space-y-1">
						<li>
							Hamdani, S.Pd., Gr.
						</li>
						<li>
							Rudiansyah, S.Pd., Gr.
						</li>
					</ul>
				</div>
				<div class="space-y-3">
					<h3 class="text-base-content text-xl font-semibold">Referensi</h3>
					<ul class="text-base-content/90 list-inside list-disc space-y-2">
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
						<li>
							<a
								href="https://drive.google.com/file/d/1sXqkrCqU_2L4BPKi0fLo3FgOnXdxFt4v/view?usp=sharing"
								target="_blank"
								class="link link-primary">Capaian pembelajaran</a
							>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<section class="rounded-box border-base-200/80 bg-base-100/95 border p-6 shadow-md sm:p-8">
		<div class="space-y-4">
			<h2 class="text-base-content text-2xl font-semibold">Special Thanks</h2>
			<p class="text-base-content/90 text-base">
				Kami mengucapkan terima kasih kepada semua pihak yang telah berkontribusi dalam pengembangan
				aplikasi ini:
			</p>
			<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<article
					class="rounded-box border-base-200 bg-base-100/90 dark:bg-base-200 flex h-full flex-col justify-between border p-4 shadow-md dark:border-none dark:shadow-none"
				>
					<div class="space-y-2">
						<span class="badge badge-primary badge-outline">UI &amp; UX</span>
						<h3 class="text-base-content text-lg font-semibold">Masukan Antarmuka</h3>
						<p class="text-base-content/70 text-sm">
							<span class="text-base-content font-semibold">Noffie Suryanti Mandasari, S.Pd.</span>
							memberikan ide dan saran pengembangan tampilan pengguna.
						</p>
					</div>
				</article>
				<article
					class="rounded-box border-base-200 bg-base-100/90 dark:bg-base-200 flex h-full flex-col justify-between border p-4 shadow-md dark:border-none dark:shadow-none"
				>
					<div class="space-y-2">
						<span class="badge badge-secondary badge-outline">Asesmen</span>
						<h3 class="text-base-content text-lg font-semibold">Saran Alur Penilaian</h3>
						<ul class="text-base-content/70 list-inside list-disc space-y-1 text-sm">
							<li><span class="text-base-content font-semibold">Saipul Anam, S.Pd.</span></li>
							<li><span class="text-base-content font-semibold">Anistoga, S.Pd., Gr.</span></li>
							<li>
								<span class="text-base-content font-semibold">Fathonah Nilawidya, S.Pd.</span>
							</li>
							<li><span class="text-base-content font-semibold">Rudiansyah, S.Pd., Gr.</span></li>
						</ul>
					</div>
				</article>
				<article
					class="rounded-box border-base-200 bg-base-100/90 dark:bg-base-200 flex h-full flex-col justify-between border p-4 shadow-md dark:border-none dark:shadow-none"
				>
					<div class="space-y-2">
						<span class="badge badge-accent badge-outline">Donasi</span>
						<h3 class="text-base-content text-lg font-semibold">Dukungan Komunitas</h3>
						<p class="text-base-content/70 text-sm">
							Terima kasih kepada seluruh donatur yang mendukung pengembangan melalui
							<a href="https://trakteer.id/raporkumer/" target="_blank" class="link link-primary"
								>trakteer.id/raporkumer</a
							>.
						</p>
					</div>
				</article>
			</div>
		</div>
	</section>
</div>

<Masukan bind:this={masukanModal} />
