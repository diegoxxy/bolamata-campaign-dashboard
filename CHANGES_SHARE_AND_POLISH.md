# Catatan Update — Fitur Share Link & Polish Visual Lanjutan

Lanjutan dari `UPGRADE_NOTES.md` dan `CHANGES_UI_REFRESH.md`. Babak ini: fitur share
link read-only, plus polish visual lanjutan di KPI ribbon & kartu folder kreator.

## ⚠️ WAJIB — Setup sebelum fitur Share bisa jalan

Fitur Share pakai **Vercel Blob** untuk menyimpan snapshot hasil scan di server (biar
bisa dibuka dari device manapun lewat link). Ini butuh **satu langkah setup manual**
di dashboard Vercel kamu, tidak otomatis:

1. Buka project kamu di [vercel.com](https://vercel.com) → tab **Storage**.
2. **Create Database** → pilih **Blob**.
3. Vercel otomatis menambahkan env var `BLOB_READ_WRITE_TOKEN` ke project kamu — tidak
   perlu isi manual.
4. Redeploy (atau tunggu deploy berikutnya).

Tanpa langkah ini, tombol "Share Hasil" akan menampilkan error toast (bukan crash —
sudah saya kasih pesan error yang jelas kalau token belum ada). Saya tidak bisa test
alur upload/retrieve blob secara end-to-end di sandbox saya sendiri (tidak ada token
Blob asli di sana), jadi validasi saya cukup sampai `tsc`+`next build` bersih —
tolong dicoba langsung setelah setup di atas.

## Cara kerja fitur Share

1. Setelah scan selesai, klik **"Share Hasil"** di header (sebelah tombol Reset).
2. Sistem upload snapshot data (`hashtag` + semua video, bukan gambar/thumbnail asli —
   cuma data teks & URL) ke Vercel Blob sebagai **private blob** (tidak bisa diakses
   langsung tanpa lewat halaman `/share/[id]` kamu, jadi tidak nongol di Google atau
   bisa ditebak orang).
3. Muncul modal berisi link, tinggal klik **Salin**.
4. Siapa pun yang buka link itu (`/share/xxxxx`) akan melihat halaman read-only:
   - Bisa: lihat KPI, buka folder tiap kreator, search/filter/sort, ganti mode
     Folder/Table, export Excel & PDF.
   - Tidak bisa: input link baru, klik tombol Reset, atau edit data manual (tombol
     "Edit Data" disembunyikan sepenuhnya di mode ini).
5. Link **tidak auto-expire**. Kalau butuh fitur hapus/nonaktifkan share tertentu,
   itu belum ada — bisa jadi pengembangan berikutnya kalau diperlukan (perlu halaman
   "kelola share" + tombol delete yang manggil `del()` dari `@vercel/blob`).

## File baru untuk fitur ini

| File | Fungsi |
|---|---|
| `app/api/share/route.ts` | Terima hasil scan, simpan ke Vercel Blob, balikin link |
| `app/share/[id]/page.tsx` | Server Component, ambil snapshot dari Blob berdasarkan ID di URL |
| `components/dashboard/ShareView.tsx` | Header + layout halaman shared (badge "Read Only", link balik ke beranda) |
| `components/dashboard/ShareModal.tsx` | Modal copy-link setelah share dibuat |
| `components/dashboard/ResultsView.tsx` | **Baru** — KPI+Toolbar+Folder/Table ditarik keluar dari `page.tsx` jadi satu komponen, dipakai ulang di dashboard utama maupun halaman share (biar tidak dobel logic) |

`components/dashboard/FolderView.tsx` sekarang punya prop `readOnly?: boolean` yang
menyembunyikan tombol "Edit Data" — dipakai `true` di halaman share, `false` (default)
di dashboard utama.

## Polish visual lanjutan

- **KPI Ribbon dirombak total**: dari 8 kartu kecil seragam ukuran, sekarang jadi
  3 kartu hero (Submissions+Qualified Rate, **Total Views** — dibesarkan jadi fokus
  utama dengan efek glow halus, Top Creator) di baris atas, lalu panel terpisah
  "Engagement Breakdown" untuk Likes/Comments/Shares/Saves dengan ikon berwarna.
  Angka-angka tetap animated count-up seperti sebelumnya.
- **Kartu folder kreator dirombak**:
  - Avatar sedikit lebih besar (44px), Views sekarang jadi angka besar (hero) di
    tiap kartu — bukan lagi terkubur di grid 5 kolom kecil.
  - Engagement (Likes/Comments/Shares/Saves) sekarang pakai ikon berwarna + angka,
    lebih scannable dibanding label teks 9px yang sebelumnya susah dibaca.
  - Kreator #1 (by total views) sekarang dapat **badge crown "TOP"** di pojok kartu.
  - Kartu **"@unknown"** (link error/gagal) sekarang punya styling beda (border &
    ikon amber, bukan avatar abu-abu polos) — jadi jelas ini kartu "perhatian",
    bukan kreator biasa.

## Bug/lint kecil yang dibereskan sekalian

- 2 `any` type di `exportPdf.ts` dan `importFile.ts` diganti tipe yang benar.
- 3 `react-hooks/set-state-in-effect` **error** (bukan sekadar warning) dari
  eslint-config-next versi baru — ini pola yang sebenarnya sah (sinkronisasi dari
  localStorage / props di luar React), jadi saya kasih komentar `eslint-disable`
  dengan alasan, bukan restrukturisasi paksa yang berisiko mengubah perilaku.
- `npx eslint .` sekarang 0 error (sisa cuma beberapa warning kode lama yang tidak
  saya sentuh — unused var `cleanHashtag` di beberapa file, related ke temuan
  "TikTok selalu qualified" yang sudah saya catat di `CHANGES_UI_REFRESH.md`).
