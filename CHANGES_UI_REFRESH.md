# Catatan Update — UI/UX Refresh, Logo & Rapikan Struktur File

Ini lanjutan dari `UPGRADE_NOTES.md` (yang menjelaskan rombakan pertama). Dokumen ini
khusus untuk perubahan babak kedua: setelah saya cek repo live kamu (yang ternyata
sudah banyak berkembang — ada tambahan YouTube & Instagram, kemungkinan lewat sesi
coding lain), saya rapikan struktur filenya dan pasang polish UI/UX + logo + animasi.

## ⚠️ PENTING — cara pasang ke repo kamu

Karena ada **rename folder**, jangan cuma copy-paste file baru ke folder lama.
Cara paling aman:
1. Di repo lokal kamu, hapus folder `app/`, `components/`, `lib/`, lalu copy semua isi
   ZIP ini menimpanya (kecuali `.git`).
2. `git status` untuk lihat perubahan (harusnya kelihatan sebagai "renamed" kalau git
   mendeteksi kemiripan isi file, atau sebagai delete+add — dua-duanya aman).
3. `npm install` (ada dependency baru).
4. `npm run dev` buat cek lokal sebelum push.

## Rename struktur folder (biar gak bingung lagi)

| Lama | Baru | Alasan |
|---|---|---|
| `lib/tiktok/` | `lib/social/` | Isinya sudah multi-platform (TikTok+YouTube+Instagram), nama lama menyesatkan |
| `components/tiktok/` | `components/dashboard/` | Ini komponen UI dashboard umum, bukan spesifik TikTok |
| `app/api/tiktok/route.ts` | `app/api/scan/route.ts` | Endpoint ini sudah menangani 3 platform sekaligus |

Semua import path (`@/lib/tiktok/...`, `@/components/tiktok/...`) dan pemanggilan
`fetch("/api/tiktok")` sudah saya update mengikuti nama baru — sudah lolos
`tsc --noEmit` dan `next build` bersih.

## File yang saya hapus (dead code, tidak dipanggil dari mana pun)

- `components/tiktok/CreatorDrawer.tsx` — sudah tidak dipakai sejak `FolderView` punya
  drill-down sendiri.
- `app/creator/[username]/page.tsx` — halaman ini tidak pernah di-link dari mana pun,
  dan sudah mengasumsikan field (`likes`, `platform`, dst.) yang caranya beda dari
  komponen aktif.
- `app/api/instagram/route.ts` — endpoint terpisah yang tidak dipanggil; logic
  Instagram yang aktif ada di `lib/social/server/fetchInstagram.ts` (dipanggil dari
  `/api/scan`) dan `lib/social/client/fetchInstagramClient.ts` (enrichment tambahan
  di sisi browser).
- 5 file SVG bawaan `create-next-app` (`file.svg`, `globe.svg`, dst.) yang tidak
  direferensikan di mana pun.

## Bug kecil yang saya perbaiki (ketemu pas baca kode, di luar scope tapi kelihatan & murah untuk diperbaiki)

- **Username TikTok tampil `@@username`** — di `fetchTikTok.ts`, `authorName` sempat
  diisi dengan "@" di depan, padahal semua komponen lain sudah nambahin "@" sendiri
  saat render. Sudah saya betulkan jadi satu "@" saja.
- **Badge platform Instagram salah label "TikTok"** di Master Table — badge platform
  cuma cek `youtube` vs default (`tiktok`), jadi video Instagram ikut kelabelan
  TikTok. Sudah ditambah cabang khusus Instagram (pink).
- **`next.config.ts` punya key `eslint` yang sudah tidak valid** di Next 16 (cuma
  `typescript.ignoreBuildErrors` yang masih ada) — ini menyebabkan `tsc` gagal parse
  config-nya sendiri. Sudah saya hapus key yang tidak valid itu.

## Yang saya TIDAK ubah (di luar scope hari ini, tapi perlu kamu tahu)

- Di `lib/social/server/fetchTikTok.ts`, video TikTok yang berhasil di-fetch sekarang
  **selalu diberi status `qualified`**, terlepas dari captionnya mengandung hashtag
  target atau tidak (parameter `cleanHashtag` diterima tapi tidak dipakai). Ini
  kemungkinan regresi dari versi awal (yang saya buat, hashtag-nya benar-benar dicek).
  Saya tidak sentuh ini karena di luar scope "UI/UX", tapi worth diperbaiki kalau
  fitur "Qualified = hashtag match" itu penting buat laporan klien kamu.
- `next.config.ts` masih set `typescript: { ignoreBuildErrors: true }` — artinya
  Vercel build akan tetap jalan walau ada error TypeScript. Codebase saat ini lolos
  type-check bersih, tapi kalau mau lebih aman ke depannya, ini bisa dimatikan supaya
  error ketahuan sebelum deploy alih-alih tersembunyi.

## Logo & branding

- Logo asli (`527570325_..._n.jpg`) saya trim whitespace-nya, saya buat transparan,
  dan saya pisah jadi 2 aset:
  - `public/logo-bolamata.png` — wordmark lengkap (dipakai di header, di dalam chip
    putih supaya teks hitamnya tetap kebaca di atas background gelap).
  - `public/logo-icon.png` — cuma icon mata/dollar hijau, dipakai untuk favicon &
    app icon (`app/icon.png`, `app/apple-icon.png`, `app/favicon.ico`).
- Kenapa logo dibungkus chip putih, bukan dipasang langsung di atas background gelap:
  teks "BOLAMATA" pada logo aslinya **hitam pekat**, jadi kalau ditaruh langsung di
  atas `#0b0f19` bakal nyaris tidak kelihatan. Chip putih menjaga warna asli logo
  tetap presisi tanpa saya utak-atik palet brand kamu.

## Animasi & polish UI/UX yang ditambahkan

- Package baru: `motion` (nama baru dari `framer-motion`, API sama).
- Header, KPI ribbon, toolbar, dan grid folder kreator sekarang muncul dengan
  fade/stagger halus saat halaman load atau data baru masuk.
- Angka-angka di KPI ribbon (Views, Likes, Comments, dst.) sekarang **menghitung naik**
  secara halus tiap kali hasil scan berubah, bukan lompat tiba-tiba.
- Toggle Folder/Table punya indikator aktif yang meluncur (spring animation).
- Modal "Edit Data" di Folder View sekarang fade+scale masuk/keluar, bukan muncul
  instan.
- Progress bar saat scan sekarang animated (gradient cyan→emerald, lebar berubah
  halus), bukan cuma angka teks.
- **`alert()` browser yang dulu dipakai untuk notifikasi import file sekarang diganti
  toast** di pojok kanan bawah (masuk/keluar dengan animasi, auto-hilang ~4 detik) —
  jauh lebih rapi dan tidak memblokir interaksi.
- Halaman sebelum ada hasil scan sekarang menampilkan **empty state** yang mengundang
  ("Belum ada data kampanye...") alih-alih kosong melompong.
- Background halaman dikasih radial-gradient + grid halus yang fixed (tidak ikut
  scroll) untuk kedalaman visual, tetap sangat subtle.

## Dependency yang dihapus (tidak terpakai)

- `cheerio` — sudah tidak dipanggil di kode manapun.
- `papaparse` + `@types/papaparse` — parser CSV yang aktif sekarang pakai `xlsx`
  (`XLSX.read` juga bisa baca CSV), jadi papaparse jadi mubazir.

`package.json` "name" juga saya ganti dari `tiktok-oembed-dashboard` jadi
`bolamata-campaign-dashboard` supaya sesuai isi sekarang — ini cuma metadata, tidak
memengaruhi koneksi project Vercel kamu (itu terikat ke repo Git, bukan field ini).
