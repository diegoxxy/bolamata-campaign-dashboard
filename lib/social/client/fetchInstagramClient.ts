export interface InstagramClientMetric {
  username: string;
  views: number;
  likes: number;
  comments: number;
  caption: string;
  thumbnail: string;
}

/**
 * Instagram auto-fill.
 *
 * Status (uji langsung 2026-09): Instagram memblokir scrape server-side total.
 * - vxinstagram / ddinstagram: domain mati (DNS/SSL fail)
 * - graph.facebook.com oEmbed: 400 (butuh token resmi)
 * - i.instagram.com/api/v1/oembed: 404
 * - /embed/captioned/: HTTP 200 tapi isinya cuma JS boilerplate —
 *   meta og:* & data post TIDAK ada (soft login wall)
 *
 * Jalur embed tetap dicoba: di browser user yg punya session Instagram
 * (cookie login), halaman embed bisa render meta. Kalau session ada,
 * ini jalan. Kalau gak, fallback manual.
 */
export async function fetchInstagramDataClient(
  url: string
): Promise<InstagramClientMetric | null> {
  const match = url.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_\-]+)/);
  const shortcode = match ? match[1] : null;
  if (!shortcode) return null;

  // 1. Embed page — cuma jalan di browser dgn session Instagram (cookie).
  //    Server-side murni dapet JS boilerplate tanpa data.
  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    const res = await fetch(embedUrl, {
      credentials: "include",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (res.ok) {
      const html = await res.text();

      const usernameMatch =
        html.match(/class="[^"]*FPnXK[^"]*"[^>]*>([^<]+)</) ||
        html.match(/"owner":\s*{"username":"([^"]+)"/) ||
        html.match(/instagram\.com\/([^"\/?]+)/);

      const captionMatch =
        html.match(/<meta property="og:title" content="([^"]*)""/) ||
        html.match(/<meta property="og:description" content="([^"]*)""/);

      const thumbMatch = html.match(/<meta property="og:image" content="([^"]*)"\/>/);
      const viewsMatch =
        html.match(/"video_view_count":\s*(\d+)/) || html.match(/"view_count":\s*(\d+)/);
      const likesMatch =
        html.match(/"edge_liked_by":\s*{"count":\s*(\d+)/) || html.match(/"like_count":\s*(\d+)/);
      const commentsMatch =
        html.match(/"edge_media_to_comment":\s*{"count":\s*(\d+)/) ||
        html.match(/"comment_count":\s*(\d+)/);

      const username = usernameMatch?.[1]?.replace(/^@/, "").toLowerCase().trim();

      // username valid = ada data beneran. "instagram" = halaman boilerplate.
      if (username && username !== "instagram") {
        return {
          username,
          caption: captionMatch?.[1] || `Instagram Reel (${shortcode})`,
          views: viewsMatch ? Number(viewsMatch[1]) : 0,
          likes: likesMatch ? Number(likesMatch[1]) : 0,
          comments: commentsMatch ? Number(commentsMatch[1]) : 0,
          thumbnail: thumbMatch?.[1] || "",
        };
      }
    }
  } catch (e) {
    console.warn("Instagram embed engine gagal:", e);
  }

  // Fallback: username placeholder + nol. User isi manual di edit modal.
  // ponytail: views 0 supaya gak menggangu KPI total; username placeholder
  // biar tetap ter-grup di folder. Naik ke Instagram Graph API resmi bila
  // user punya access token (lihat lib/social/server/fetchInstagram.ts).
  return {
    username: "instagram_creator",
    caption: `Instagram Reel (${shortcode})`,
    views: 0,
    likes: 0,
    comments: 0,
    thumbnail: "",
  };
}
