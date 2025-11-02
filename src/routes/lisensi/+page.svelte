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
			title: 'BerbagiSerupa',
			description:
				'Jika Anda membuat adaptasi atau turunan dari materi ini, Anda harus mendistribusikannya di bawah lisensi yang sama (CC BY-NC-SA 4.0).'
		}
	];

	const licenseUrl = 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.id';
	const legalUrl = 'https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.id';
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
				<strong>Atribusi-NonKomersial-BerbagiSerupa 4.0 Internasional</strong> (CC BY-NC-SA 4.0). Artinya,
				Anda boleh membagikan dan membuat adaptasi dari materi ini selama mengikuti aturan berikut dan
				mendistribusikan adaptasi tersebut di bawah lisensi yang sama.
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
					<span class="text-base-content font-medium">Berbagi Serupa:</span> jika Anda membuat adaptasi
					atau turunan dari materi ini, Anda harus mendistribusikannya di bawah lisensi yang sama (CC
					BY-NC-SA 4.0).
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

	<section class="rounded-box border-base-200/80 bg-base-100/95 border p-8 shadow-md sm:p-10">
		<div class="space-y-4">
			<h2 class="text-base-content text-2xl font-semibold">Pengecualian pada Aset Statis</h2>
			<p class="text-base-content/80 text-sm leading-relaxed">
				Beberapa aset grafis yang termasuk dalam folder <code>static/</code> tidak dicakup oleh lisensi
				CC BY-NC-SA 4.0 dari repositori ini. Aset-aset tersebut tetap berada di bawah lisensi atau hak
				tempat penyusun aslinya. Untuk menghindari kebingungan, berikut daftar aset yang dikecualikan:
			</p>
			<ul class="text-base-content/80 list-inside list-disc space-y-2">
				<li><code>static/bg-certificate.png</code></li>
				<li><code>static/bg-certificate2.png</code></li>
				<li><code>static/garudaPancasila.png</code></li>
				<li><code>static/logo-kumer.png</code></li>
				<li><code>static/tutwuri-bw.png</code></li>
				<li><code>static/tutwuri.png</code></li>
			</ul>
			<p class="text-base-content/80 text-sm leading-relaxed">
				Pengecualian ini berarti jika Anda ingin menggunakan salah satu dari aset di atas, periksa
				lisensi atau izin khusus yang berlaku untuk aset tersebut. Jika lisensi asli tidak
				disertakan di file aset, hubungi tim pengembang untuk meminta klarifikasi atau izin.
			</p>
		</div>
	</section>

	<section class="rounded-box border-base-200/80 bg-base-100/95 border p-6 shadow-md">
		<h2 class="text-base-content text-xl font-semibold">Sumber & Kredit Ikon</h2>
		<p class="text-base-content/80 text-sm leading-relaxed">
			Ikon yang digunakan dalam folder <code>src/lib/icons</code> berasal dari
			<strong>Feather</strong>. Feather adalah proyek ikon open-source yang tersedia di
			<a href="https://github.com/feathericons/feather" target="_blank" rel="noreferrer"
				>https://github.com/feathericons/feather</a
			>
			dan dirilis di bawah lisensi MIT. Penggunaan ikon harus mematuhi syarat lisensi MIT. Kredit disarankan
			saat menggunakan ikon di luar konteks teknis internal.
		</p>
	</section>

	<section class="rounded-box border-base-200/80 bg-base-100/95 border p-6 shadow-md">
		<h2 class="text-base-content text-xl font-semibold">Pertanyaan Lebih Lanjut</h2>
		<p class="text-base-content/80 text-sm leading-relaxed">
			Untuk permintaan penggunaan di luar cakupan lisensi ini, hubungi tim pengembang melalui kanal
			yang disediakan pada halaman Tentang. Kami dengan senang hati membantu menilai kebutuhan Anda.
		</p>
	</section>
</div>
