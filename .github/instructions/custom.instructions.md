applyTo: '**'
---

# Copilot Instructions for Rapor Kurikulum Merdeka

## Project Overview
- **Nama aplikasi**: Rapor Kurikulum Merdeka ("Rapkumer")
- **Tujuan utama**: mengelola data sekolah, kelas, murid, mata pelajaran, asesmen formatif/sumatif, catatan wali kelas, dan pencetakan rapor berbasis Kurikulum Merdeka.
- **Teknologi**: SvelteKit 2 + Svelte 5 runes, DaisyUI 5 di atas TailwindCSS 4, Vite 6, Drizzle ORM dengan SQLite (gunakan libsql ketika `DB_URL` tersedia).
- **Struktur menu**: ikuti hierarki di `src/lib/components/menu.ts` (Informasi Umum → Mata Pelajaran → Input Nilai → Cetak Dokumen). Jangan ubah urutan atau slug tanpa alasan kuat.

## Lingkungan Pengembangan
- Gunakan **pnpm** untuk semua perintah paket (`pnpm install`, `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm check`).
- Jalankan mode pengembangan dengan `pnpm dev -- --port 5173` (script `scripts/dev.js` juga memicu generator ikon). Hentikan proses dengan Ctrl+C atau `taskkill //F //IM node.exe` di Windows jika macet.
- Vite dev server default di port 5173; gunakan `--port 5174` jika berbenturan dengan proyek lain.
- Sinkronkan kit sebelum lint/koreksi dengan `pnpm check`.
- Basis data lokal disimpan di `data/database.sqlite3`. Gunakan `pnpm db:push` untuk migrasi dan `pnpm db:studio` untuk inspeksi.

## Pola Implementasi UI (Svelte 5 + DaisyUI)
- **Props & State**: gunakan runes (`let { prop } = $props()`, `$state`, `$derived`) alih-alih `export let` atau `$:` klasik. Favor `Actions` Svelte untuk interaksi (contoh: `src/lib/components/form-enhance.svelte`).
- **Tailwind v4**: gunakan `@import "tailwindcss";` dan `@plugin "daisyui";` seperti pada `src/app.css`. Tidak ada `tailwind.config.js`.
- **Komponen DaisyUI**: gunakan kelas resmi (form control, table, card, drawer, modal). Pastikan tema terang/gelap bekerja lewat atribut `data-theme`. Simpan gaya kustom pada blok `@utility` atau `@layer` di `app.css`.
- **Tipografi**: gunakan plugin `@tailwindcss/typography` untuk konten Markdown (`src/docs/help/**`).
- **Aksesibilitas**: pastikan semua tombol, link, dan input memiliki label teks (bahasa Indonesia untuk user-facing copy).
- **Ikon**: tambahkan SVG ke `src/lib/icons`, generator `scripts/icon.js` akan membuat `__icons.d.ts`. Jangan commit file ini.

## Aturan Domain & Data
- **Entity inti**: `sekolah`, `alamat`, `pegawai`, `kelas`, `murid`, `mata_pelajaran`, `tujuan_pembelajaran`, `ekstrakurikuler`. Ikuti skema Drizzle di `src/lib/server/db/schema.ts` dan gunakan `relations(...)` yang ada.
- Gunakan helper `cookieNames` di `src/lib/utils.ts` untuk memilih sekolah aktif. Jangan ubah nama cookie tanpa update global.
- Jaga konsistensi sanitasi form dengan utilitas `flatten`, `unflatten`, `populateForm`, dan aksi `form-enhance`.
- Ketika menambah asesmen/nilai, patuhi struktur rute di `src/routes/(input-nilai)/**`. Formulir harus menampilkan nilai validasi DaisyUI dan pesan notifikasi melalui `toast.svelte`.
- Error database SQLite harus dilewatkan ke `handleError` di `src/hooks.server.ts` agar pesan user-friendly tampil.

## Praktik Backend & API
- Gunakan Drizzle ORM query builder (`db.query.tableX`) dan filter `eq`, `desc`, dll. Hindari raw SQL kecuali sangat diperlukan.
- Untuk operasi server, manfaatkan load/aksi SvelteKit di `+page.server.ts` dan `+page.ts`. Pastikan data selalu dibatasi oleh `event.locals.sekolah` aktif.
- Validasi file upload (logo sekolah) periksa `logo` + `logoType` kolom blob/text. Simpan sebagai `Uint8Array`.
- Bila menambah API, pastikan route berada di `src/routes/api/**` dan respon JSON mematuhi struktur `{ data, message }`.

## Dokumentasi & Konten
- Dokumen bantuan berada di `src/docs/help`. Gunakan MDsveX untuk menambah konten baru, sertakan heading level 2 sebagai anchor.
- Update `README.md` jika ada perubahan besar pada alur kerja.
- Gunakan bahasa Indonesia untuk konten pengguna, bahasa Inggris untuk kode & komentar teknis.

## Testing & Kualitas
- Gunakan `pnpm lint` sebelum commit untuk menjalankan Prettier + ESLint.
- Gunakan `pnpm check` untuk pemeriksaan tipe & svelte-check.
- Tambahkan tes unit/integrasi (Vitest atau Playwright) ketika logika mulai kompleks; tempatkan di `src/**/__tests__`.
- Pastikan setiap rute baru memiliki guard/redirect yang benar ketika `event.locals.sekolah` belum terpilih.

## Rujukan Permanen
- Dokumentasi DaisyUI (LLM-friendly): https://daisyui.com/llms.txt
- Dokumentasi Svelte (LLM-friendly): https://svelte.dev/llms-full.txt

Ikuti pedoman ini di setiap tugas untuk menjaga konsistensi desain, kerapihan kode, dan kesesuaian domain "Rapor Kurikulum Merdeka".
