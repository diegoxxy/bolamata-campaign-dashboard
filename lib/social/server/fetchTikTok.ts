import type { VideoItem } from "@/lib/social/types";

/**
 * Mengekstrak Video ID 19 digit dari URL TikTok untuk penanganan typo path/username
 */
export function extractTikTokVideoId(url: string): string | null {
  const match = url.match(/\/video\/(\d+)/i);
  return match ? match[1] : null;
}

// TikWM (gratis) cuma kasih 1 request/detik per IP. Semua panggilan di instance server ini antre
// dengan jarak TIKWM_GAP_MS, walaupun ada beberapa request scan yang jalan bersamaan.
const TIKWM_GAP_MS = 1200;
let nextTikwmSlot = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function tikwmGate() {
  const now = Date.now();
  const slot = Math.max(now, nextTikwmSlot);
  nextTikwmSlot = slot + TIKWM_GAP_MS;
  if (slot > now) await sleep(slot - now);
}

/** Error sementara (limit / gangguan jaringan) → layak dicoba lagi. Private/dihapus → tidak. */
function isTransientTikwmError(msg: string): boolean {
  return /limit|429|HTTP error (429|5\d\d)|fetch failed|timeout|ECONNRESET|network/i.test(msg);
}

/**
 * Ambil data video TikTok lewat TikWM, lewat antrean + coba lagi otomatis kalau kena limit
 * (maks 4x, jeda makin lama). Video yang memang private/dihapus langsung dikembalikan sebagai error.
 */
export async function fetchTikTokDataWithRetry(
  resolvedUrl: string,
  _cleanHashtag?: string
): Promise<VideoItem> {
  let result: VideoItem | null = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    await tikwmGate();
    result = await fetchTikTokDataOnce(resolvedUrl);
    if (result.status !== "error" || !isTransientTikwmError(result.errorMessage || "")) return result;
    await sleep(1500 * attempt);
  }
  return result as VideoItem;
}

async function fetchTikTokDataOnce(resolvedUrl: string): Promise<VideoItem> {
  const videoId = extractTikTokVideoId(resolvedUrl);

  // Jika URL memiliki ID video 19 digit, buat URL netral untuk memutus error typo username (@berframa vs @ber1rama)
  const canonicalUrl = videoId
    ? `https://www.tiktok.com/@tiktok/video/${videoId}`
    : resolvedUrl;

  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(canonicalUrl)}`;
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return makeErrorVideo(resolvedUrl, `HTTP error ${res.status}`);
    }

    const json = await res.json();
    if (json.code !== 0 || !json.data) {
      return makeErrorVideo(resolvedUrl, json.msg || "Video tidak ditemukan atau private");
    }

    const data = json.data;

    let formattedDate = "-";
    if (data.create_time) {
      const dateObj = new Date(data.create_time * 1000);
      formattedDate = dateObj.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }

    const authorUniqueId = data.author?.unique_id || "unknown";

    return {
      id: data.id || videoId || resolvedUrl,
      platform: "tiktok",
      sourceUrl: resolvedUrl, // Pertahankan input awal user
      videoUrl: canonicalUrl,
      title: data.title || "",
      authorName: authorUniqueId.replace(/^@/, ""),
      authorDisplayName: data.author?.nickname || authorUniqueId,
      authorUrl: `https://www.tiktok.com/@${authorUniqueId.replace(/^@/, "")}`,
      authorAvatar: data.author?.avatar || "",
      coverUrl: data.cover || "",
      views: Number(data.play_count || 0),
      likes: Number(data.digg_count || 0),
      comments: Number(data.comment_count || 0),
      shares: Number(data.share_count || 0),
      saves: Number(data.collect_count || 0),
      postedAt: formattedDate,
      status: "qualified", // Otomatis diset QUALIFIED untuk semua video valid
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal mengambil data";
    return makeErrorVideo(resolvedUrl, msg);
  }
}

function makeErrorVideo(sourceUrl: string, message: string): VideoItem {
  return {
    id: sourceUrl,
    platform: "tiktok",
    sourceUrl,
    videoUrl: sourceUrl,
    title: "Gagal Memuat Video (Private / Dihapus / Typo)",
    authorName: "unknown",
    authorDisplayName: "unknown",
    authorUrl: "",
    authorAvatar: "",
    coverUrl: "",
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    postedAt: "-",
    status: "error",
    errorMessage: message,
  };
}