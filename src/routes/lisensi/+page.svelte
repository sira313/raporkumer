<script lang="ts">
	const summary = [
		{
			title: 'Atribusi',
			description:
				'Cantumkan nama Raporkumer dan tautan lisensi saat membagikan materi ini, serta sebutkan jika ada perubahan.'
		},
		{
			title: 'NonKomersial',
			description:
				'Gunakan materi hanya untuk tujuan nonkomersial; dilarang menjual atau memonetisasi langsung.'
		},
		{
			title: 'TanpaTurunan',
			description:
				'Anda tidak boleh mendistribusikan versi yang diubah, dimodifikasi, atau diadaptasi dari materi ini.'
		}
	];

	const licenseUrl = 'https://creativecommons.org/licenses/by-nc-nd/4.0/deed.id';
	const legalUrl = 'https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode.id';
</script>

<div class="mx-auto flex max-w-4xl flex-col gap-8">
	<section class="rounded-box border-base-200/80 bg-base-100/95 border p-8 shadow-md sm:p-10">
		<div class="space-y-3">
			<span class="badge badge-outline badge-lg bg-base-100/70 text-primary shadow">Lisensi</span>
			<h1 class="text-base-content text-3xl font-bold md:text-4xl">
				Ketentuan Penggunaan Raporkumer
			</h1>
			<p class="text-base-content/80 text-base md:text-lg">
				Seluruh konten repositori ini berada di bawah lisensi Creative Commons
				<strong>Atribusi-NonKomersial-TanpaTurunan 4.0 Internasional</strong> (CC BY-NC-ND 4.0). Artinya,
				Anda boleh membagikan materi selama mengikuti aturan berikut.
			</p>
		</div>
	</section>

	<section class="grid gap-6 sm:grid-cols-3">
		{#each summary as item, index (index)}
			<article class="rounded-box border-base-200/80 bg-base-100/95 border p-6 shadow-md">
				<h2 class="text-base-content text-xl font-semibold">{item.title}</h2>
				<p class="text-base-content/70 text-sm leading-relaxed">{item.description}</p>
			</article>
		{/each}
	</section>

	<section class="rounded-box border-base-200/80 bg-base-100/95 border p-8 shadow-md sm:p-10">
		<div class="space-y-4">
			<h2 class="text-base-content text-2xl font-semibold">Hak dan Batasan Utama</h2>
			<ul class="text-base-content/80 list-inside list-disc space-y-2 text-base">
				<li>
					<span class="text-base-content font-medium">Berbagi:</span> diperbolehkan menyalin dan mendistribusikan
					materi ini di media apa pun.
				</li>
				<li>
					<span class="text-base-content font-medium">Atribusi:</span> sertakan nama Raporkumer dan tautan
					repositori saat membagikan.
				</li>
				<li>
					<span class="text-base-content font-medium">NonKomersial:</span> penggunaan untuk tujuan komersial
					tidak diizinkan tanpa izin tertulis.
				</li>
				<li>
					<span class="text-base-content font-medium">Tanpa Turunan:</span> dilarang merilis versi yang
					dimodifikasi kepada publik.
				</li>
			</ul>
			<p class="text-base-content/80 text-sm">
				Lisensi ini tidak menggantikan hukum lain yang mungkin berlaku, seperti hak potret, privasi,
				atau hak moral. Pastikan Anda mematuhi peraturan setempat saat menggunakan materi ini.
			</p>
			<div class="flex flex-wrap gap-3">
				<a
					class="btn btn-primary btn-soft shadow-none"
					href={licenseUrl}
					target="_blank"
					rel="noreferrer"
				>
					Ringkasan Lisensi
				</a>
				<a class="btn btn-outline" href={legalUrl} target="_blank" rel="noreferrer">
					Teks Hukum Lengkap
				</a>
			</div>
		</div>
	</section>

	<section class="rounded-box border-base-200/80 bg-base-100/95 border p-6 shadow-md">
		<h2 class="text-base-content text-xl font-semibold">Pertanyaan Lebih Lanjut</h2>
		<p class="text-base-content/80 text-sm leading-relaxed">
			Untuk permintaan penggunaan di luar cakupan lisensi ini, hubungi tim pengembang melalui kanal
			yang disediakan pada halaman Tentang. Kami dengan senang hati membantu menilai kebutuhan Anda.
		</p>
	</section>
</div>
