import type { VideoItem } from "@/lib/social/types";

function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

/**
 * Format string author agar selalu diawali dengan 1 simbol '@' saja
 */
function normalizeAuthorHandle(rawAuthor: string): string {
  const clean = rawAuthor.replace(/\s+/g, "").toLowerCase();
  const withAt = clean.startsWith("@") ? clean : `@${clean}`;
  return withAt.replace(/^@+/, "@");
}

/**
 * Format string tanggal (ISO string atau timestamp) ke DD/MM/YYYY
 */
function formatDateToID(dateStrOrTimestamp: string | number): string {
  try {
    const dateObj = typeof dateStrOrTimestamp === "number" 
      ? new Date(dateStrOrTimestamp * 1000) 
      : new Date(dateStrOrTimestamp);

    if (isNaN(dateObj.getTime())) return "-";

    return dateObj.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

export async function fetchYouTubeData(
  resolvedUrl: string,
  cleanHashtag: string
): Promise<VideoItem> {
  const videoId = extractYouTubeId(resolvedUrl);
  if (!videoId) {
    return makeErrorVideo(resolvedUrl, "URL YouTube Shorts tidak valid");
  }

  const embedUrl = `https://www.youtube.com/shorts/${videoId}`;

  // 1. Coba ambil data via Invidious API
  try {
    const invidiousRes = await fetch(`https://inv.tux.pizza/api/v1/videos/${videoId}`, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (invidiousRes.ok) {
      const data = await invidiousRes.json();

      let formattedDate = "-";
      if (data.published) {
        formattedDate = formatDateToID(data.published);
      }

      const rawAuthor = data.author || "unknown";
      const formattedAuthor = normalizeAuthorHandle(rawAuthor);

      return {
        id: videoId,
        platform: "youtube",
        sourceUrl: resolvedUrl,
        videoUrl: embedUrl,
        title: data.title || "",
        authorName: formattedAuthor,
        authorDisplayName: rawAuthor,
        authorUrl: data.authorUrl ? `https://www.youtube.com${data.authorUrl}` : "",
        authorAvatar: data.authorThumbnails?.[0]?.url || "",
        coverUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        views: Number(data.viewCount || 0),
        likes: Number(data.likeCount || 0),
        comments: 0,
        shares: 0,
        saves: 0,
        postedAt: formattedDate,
        status: "qualified",
      };
    }
  } catch {
    // Lanjut ke fallback oEmbed jika Invidious tidak merespons
  }

  // 2. Fallback: oEmbed + Direct HTML Scraper Meta Tags
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(resolvedUrl)}&format=json`;
    const res = await fetch(oembedUrl, { cache: "no-store" });

    if (!res.ok) {
      return makeErrorVideo(resolvedUrl, "Video tidak ditemukan atau private");
    }

    const oembedData = await res.json();
    const rawAuthor = oembedData.author_name || "youtube_creator";
    const formattedAuthor = normalizeAuthorHandle(rawAuthor);

    let views = 0;
    let likes = 0;
    let postedAt = "-";

    try {
      const pageRes = await fetch(embedUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        cache: "no-store",
      });

      if (pageRes.ok) {
        const html = await pageRes.text();

        // Parse View Count
        const viewMatch =
          html.match(/"viewCount":"(\d+)"/) ||
          html.match(/itemprop="interactionCount" content="(\d+)"/) ||
          html.match(/"videoViewCountRenderer":\{"viewCount":\{"simpleText":"([\d,\.]+)/);

        if (viewMatch) {
          views = parseInt(viewMatch[1].replace(/[^\d]/g, ""), 10) || 0;
        }

        // Parse Like Count
        const likeMatch =
          html.match(/"label":"([\d,\.]+)\s+likes"/i) ||
          html.match(/"likeCount":"(\d+)"/);

        if (likeMatch) {
          likes = parseInt(likeMatch[1].replace(/[^\d]/g, ""), 10) || 0;
        }

        // Parse Upload / Publish Date dari HTML meta tags
        const dateMatch =
          html.match(/itemprop="uploadDate" content="([^"]+)"/) ||
          html.match(/itemprop="datePublished" content="([^"]+)"/) ||
          html.match(/"uploadDate":"([^"]+)"/);

        if (dateMatch && dateMatch[1]) {
          postedAt = formatDateToID(dateMatch[1]);
        }
      }
    } catch {
      // Abaikan error parsing HTML
    }

    return {
      id: videoId,
      platform: "youtube",
      sourceUrl: resolvedUrl,
      videoUrl: embedUrl,
      title: oembedData.title || "",
      authorName: formattedAuthor,
      authorDisplayName: rawAuthor,
      authorUrl: oembedData.author_url || "",
      authorAvatar: oembedData.thumbnail_url || "",
      coverUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      views: views,
      likes: likes,
      comments: 0,
      shares: 0,
      saves: 0,
      postedAt: postedAt,
      status: "qualified",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal mengambil data YouTube";
    return makeErrorVideo(resolvedUrl, msg);
  }
}

function makeErrorVideo(sourceUrl: string, message: string): VideoItem {
  return {
    id: sourceUrl,
    platform: "youtube",
    sourceUrl,
    videoUrl: sourceUrl,
    title: "Gagal Memuat Video (Private / Dihapus)",
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