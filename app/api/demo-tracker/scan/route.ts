import { NextResponse } from "next/server";
import type { VideoBatchResponse, VideoItem } from "@/lib/social/types";
import type { ScannedVideo } from "@/lib/demo-tracker/core";
import { fetchTikTokDataWithRetry } from "@/lib/social/server/fetchTikTok";

/**
 * DEMO scan:
 * - TikTok  → antrean global ke TikWM (maks ~1 request / 1,2 detik untuk SELURUH server) + tunggu & coba lagi
 *             kalau kena "Free Api Limit". Ini yang bikin error limit hilang saat jalan di satu IP (localhost).
 * - YouTube & Instagram → lewat /api/scan yang sudah ada.
 * Lalu caption dilengkapi (YouTube: judul + deskripsi Shorts).
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isTikTok = (u: string) => /tiktok\.com/i.test(u);

export async function POST(request: Request) {
  try {
    const { videoUrls, hashtag } = (await request.json()) as { videoUrls?: string[]; hashtag?: string };
    if (!Array.isArray(videoUrls) || videoUrls.length === 0) {
      return NextResponse.json({ error: "videoUrls kosong" }, { status: 400 });
    }
    const tag = (hashtag || "demo").replace(/^#/, "").toLowerCase();

    // YouTube & Instagram sekaligus lewat /api/scan
    const others = videoUrls.filter((u) => !isTikTok(u));
    const otherResults = new Map<string, VideoItem>();
    if (others.length > 0) {
      const res = await fetch(new URL("/api/scan", request.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrls: others, targetHashtag: tag }),
        cache: "no-store",
      });
      const data = (await res.json()) as VideoBatchResponse & { error?: string };
      if (!res.ok) return NextResponse.json({ error: data.error || "Scan gagal" }, { status: 502 });
      data.videos.forEach((v) => otherResults.set(v.sourceUrl, v));
    }

    // TikTok satu per satu lewat antrean
    const scanned: VideoItem[] = [];
    for (const url of videoUrls) {
      const v = isTikTok(url) ? await scanTikTok(url, tag) : otherResults.get(url);
      if (v) scanned.push(v);
    }

    const videos: ScannedVideo[] = await Promise.all(
      scanned.map(async (v: VideoItem) => {
        let caption = v.title || "";
        if (v.platform === "youtube" && v.status !== "error") {
          const desc = await fetchYouTubeDescription(v.id);
          if (desc) caption = `${caption}\n${desc}`;
        }
        return { ...v, caption };
      })
    );

    return NextResponse.json({ videos }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}

/**
 * Satu video TikTok: resolve short link (tanpa TikWM), ambil data TikWM lewat antrean,
 * kalau kena limit tunggu makin lama lalu coba lagi (maks 5x).
 */
async function scanTikTok(original: string, tag: string): Promise<VideoItem> {
  const real = (await resolveTikTokRealUrl(original)) ?? original;

  // Antrean TikWM + coba lagi kalau kena limit sudah ditangani fetchTikTokDataWithRetry.
  let v: VideoItem = await fetchTikTokDataWithRetry(real, tag);
  v = { ...v, platform: "tiktok", sourceUrl: original };

  // Tetap gagal → username tetap kebaca dari link, admin bisa cek & isi manual.
  if (v.status === "error") {
    const user = real.match(/tiktok\.com\/@([^/?#]+)/)?.[1];
    if (user && user !== "tiktok") {
      const limited = /limit/i.test(v.errorMessage || "");
      v = {
        ...v,
        videoUrl: real.split("?")[0],
        authorName: user,
        authorDisplayName: `@${user}`,
        authorUrl: `https://www.tiktok.com/@${user}`,
        title: limited
          ? "Kena limit TikWM — klik 'Scan ulang yang gagal'"
          : "Video ada, tapi sumber data TikTok (TikWM) tidak bisa membacanya",
        errorMessage: limited
          ? "Free Api Limit TikWM — scan ulang yang gagal beberapa saat lagi."
          : "TikWM tidak bisa membaca video ini — buka link, cek hashtag, isi views manual.",
      };
    }
  }
  return v;
}

/** Link TikTok asli (dengan @username) dari short link (vt/vm/t) lewat header Location, tanpa memanggil TikWM. */
async function resolveTikTokRealUrl(sourceUrl: string): Promise<string | null> {
  if (/tiktok\.com\/@[^/]+\/(?:video|photo)\/\d+/i.test(sourceUrl)) return sourceUrl;
  if (!/(?:vt|vm)\.tiktok\.com|tiktok\.com\/t\//i.test(sourceUrl)) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let current = sourceUrl;
      for (let hop = 0; hop < 4; hop++) {
        const res = await fetch(current, { redirect: "manual", cache: "no-store", headers: { "User-Agent": UA } });
        const loc = res.headers.get("location");
        if (!loc) break;
        current = new URL(loc, current).toString();
        if (/\/(?:video|photo)\/\d{8,}/.test(current)) return current;
      }
    } catch {}
    await sleep(500);
  }
  return null;
}

async function fetchYouTubeDescription(videoId: string): Promise<string> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return "";
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
      cache: "no-store",
    });
    if (!res.ok) return "";
    const html = await res.text();
    const m = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
    if (!m) return "";
    try {
      return JSON.parse(`"${m[1]}"`) as string;
    } catch {
      return m[1];
    }
  } catch {
    return "";
  }
}
