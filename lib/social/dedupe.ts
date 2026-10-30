import type { VideoItem } from "./types";

/**
 * Kunci unik per video, berdasarkan ID video platform, bukan teks link.
 * Short link (vt.tiktok.com) dan link panjang dari video yang sama
 * menghasilkan kunci yang sama setelah di-resolve oleh /api/scan.
 */
export function videoKeyFromUrl(url: string): string | null {
  if (!url) return null;
  const tiktok = url.match(/tiktok\.com\/.*?\/(?:video|photo)\/(\d{8,})/i);
  if (tiktok) return `tiktok:${tiktok[1]}`;
  const youtube = url.match(
    /(?:youtube\.com\/(?:shorts\/|embed\/|live\/|watch\?(?:.*&)?v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/i
  );
  if (youtube) return `youtube:${youtube[1]}`;
  const instagram = url.match(/instagram\.com\/(?:[^/?#]+\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (instagram) return `instagram:${instagram[1]}`;
  return null;
}

/** Normalisasi link mentah (tanpa query/hash/slash akhir) untuk link yang ID-nya belum diketahui. */
export function normalizeRawUrl(url: string): string {
  let s = url.trim();
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    return `${u.hostname.toLowerCase().replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return s.toLowerCase().replace(/[?#].*$/, "").replace(/\/+$/, "");
  }
}

/** Kunci untuk link input sebelum scan: pakai ID kalau sudah kelihatan, kalau tidak pakai link yang dinormalisasi. */
export function inputUrlKey(url: string): string {
  return videoKeyFromUrl(url) ?? `url:${normalizeRawUrl(url)}`;
}

export function videoKey(v: VideoItem): string {
  if (v.id && /^\d{8,}$/.test(v.id) && v.platform === "tiktok") return `tiktok:${v.id}`;
  if (v.id && /^[A-Za-z0-9_-]{11}$/.test(v.id) && v.platform === "youtube") return `youtube:${v.id}`;
  return (
    videoKeyFromUrl(v.videoUrl) ??
    videoKeyFromUrl(v.id) ??
    videoKeyFromUrl(v.sourceUrl) ??
    `url:${normalizeRawUrl(v.sourceUrl || v.videoUrl || v.id)}`
  );
}

/** Data yang lebih bisa dipercaya menang: tidak error > error, lalu views terbanyak. */
function isBetter(candidate: VideoItem, current: VideoItem): boolean {
  const candErr = candidate.status === "error";
  const curErr = current.status === "error";
  if (candErr !== curErr) return !candErr;
  return (candidate.views || 0) > (current.views || 0);
}

/** Buang video kembar (ID sama), urutan kemunculan pertama dipertahankan. */
export function dedupeVideos(videos: VideoItem[]): VideoItem[] {
  const byKey = new Map<string, number>();
  const out: VideoItem[] = [];
  for (const v of videos) {
    const key = videoKey(v);
    const idx = byKey.get(key);
    if (idx === undefined) {
      byKey.set(key, out.length);
      out.push(v);
    } else if (isBetter(v, out[idx])) {
      out[idx] = v;
    }
  }
  return out;
}

/** Buang link input kembar sebelum dikirim ke server (hemat request API). */
export function dedupeInputUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = raw.trim();
    if (!url) continue;
    const key = inputUrlKey(url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}
