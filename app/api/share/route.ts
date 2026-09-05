import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import type { SharePayload, CreateShareResponse, VideoItem } from "@/lib/social/types";

const MAX_VIDEOS_PER_SHARE = 5000;

function generateShareId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 14);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      hashtag?: string;
      videos?: VideoItem[];
      campaignLabel?: string;
    };

    const hashtag = body.hashtag?.trim();
    const videos = body.videos;

    if (!hashtag) {
      return NextResponse.json({ error: "Hashtag tidak boleh kosong" }, { status: 400 });
    }
    if (!Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json({ error: "Tidak ada data video untuk dibagikan" }, { status: 400 });
    }
    if (videos.length > MAX_VIDEOS_PER_SHARE) {
      return NextResponse.json(
        { error: `Maksimal ${MAX_VIDEOS_PER_SHARE} video per share link` },
        { status: 400 }
      );
    }

    const payload: SharePayload = {
      hashtag,
      videos,
      createdAt: new Date().toISOString(),
      campaignLabel: body.campaignLabel?.trim() || undefined,
    };

    const id = generateShareId();

    await put(`shares/${id}.json`, JSON.stringify(payload), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    const origin = request.headers.get("origin") || new URL(request.url).origin;

    const response: CreateShareResponse = {
      id,
      url: `${origin}/share/${id}`,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membuat share link";
    const isTokenIssue = message.toLowerCase().includes("token") || message.toLowerCase().includes("credentials");
    const hint = isTokenIssue
      ? " — Blob store sudah di-enable di Vercel, tapi token-nya belum sampai ke environment yang lagi kamu jalankan. Kalau ini localhost/npm run dev: jalankan `vercel env pull .env.local` (atau copy manual BLOB_READ_WRITE_TOKEN dari Vercel dashboard ke .env.local) lalu restart dev server. Kalau ini sudah di domain Vercel asli: cek env var itu ter-centang untuk environment yang sesuai (Production/Preview) di Settings → Environment Variables, lalu redeploy — menambahkan storage tidak otomatis berlaku ke deployment yang sudah ada."
      : "";
    return NextResponse.json({ error: message + hint }, { status: 500 });
  }
}
