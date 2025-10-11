# Rapkumer

Rapkumer adalah aplikasi web yang membantu sekolah menyiapkan rapor Kurikulum Merdeka secara praktis. Seluruh proses pengerjaan berada di browser, sehingga guru bisa fokus mengisi data tanpa repot menyesuaikan format manual.

## Apa yang Bisa Dilakukan

- Mengelola data sekolah, kelas, dan murid dalam satu tempat
- Mengisi nilai formatif dan sumatif sesuai struktur Kurikulum Merdeka
- Menyimpan catatan wali kelas dan capaian belajar
- Mencetak rapor, piagam, dan dokumen pendukung dalam format siap cetak

## Siapa yang Cocok Menggunakan

- Kepala sekolah yang ingin memantau progres pengisian rapor
- Guru mata pelajaran dan wali kelas yang bertugas mengisi nilai
- Operator sekolah yang menyiapkan dokumen resmi


## Cara Menggunakan Aplikasi

- Pilih sekolah aktif (jika ada lebih dari satu).
- Isi data dasar seperti guru, murid, dan mata pelajaran.
- Masukkan nilai pada menu **Input Nilai** sesuai asesmen yang tersedia.
- Gunakan menu **Cetak Dokumen** untuk menghasilkan rapor dan piagam.
- Simpan arsip rapor yang sudah dicetak untuk kebutuhan sekolah.
- Jika membutuhkan panduan cepat, klik ikon tanda tanya (?) di navbar. Setiap halaman memiliki petunjuk yang berbeda sesuai konteksnya.
- Akun bawaan: masuk dengan `Admin` sebagai nama pengguna dan `Admin123` sebagai kata sandi, lalu segera ganti demi keamanan.

## Instalasi Cepat (Windows)

- Kunjungi halaman [Release](https://github.com/sira313/raporkumer/releases) di GitHub repositori ini.
- Unduh berkas `RapkumerSetup.exe` versi terbaru.
- Jalankan installer dan ikuti langkah di layar.
- Setelah selesai, cari shortcut **Rapkumer** di desktop atau Start Menu.

## Cara Menjalankan Versi Pengembangan

1. Pastikan sudah memasang **Node.js 20 LTS** dan **pnpm**.
2. Buka terminal lalu jalankan perintah berikut:

   ```bash
   pnpm install
   pnpm dev -- --port 5173
   ```

3. Buka browser ke `http://localhost:5173`.
4. Tekan `Ctrl+C` di terminal untuk menghentikan server.

## Bantuan dan Dukungan

- Dokumentasi singkat tersedia di menu **Tentang** di dalam aplikasi.
- Jika menemukan kendala teknis, hubungi tim pengembang melalui isu GitHub atau gabung grup Telegram di halaman **Tentang**.

## Kontribusi

- Repo ini menggunakan SvelteKit, TailwindCSS + DaisyUI, dan Drizzle ORM.
- Jalankan `pnpm lint` dan `pnpm check` sebelum mengirimkan perubahan.
- Gunakan bahasa Indonesia untuk teks antarmuka agar konsisten dengan kebutuhan sekolah.

## Lisensi

Konten repositori ini dilisensikan di bawah [Creative Commons Atribusi-NonKomersial-TanpaTurunan 4.0 Internasional](https://creativecommons.org/licenses/by-nc-nd/4.0/deed.id). Anda boleh menyalin dan membagikan materi ini dengan mencantumkan atribusi yang sesuai, tidak menggunakannya untuk tujuan komersial, dan tidak membuat turunan dari materi yang dibagikan. Untuk detail hukum lengkap, silakan baca [teks lisensinya](https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode.id).
