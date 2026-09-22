import type { VideoItem } from "@/lib/social/types";

/**
 * Fetch metadata Instagram dari sisi server
 */
export async function fetchInstagramData(
  url: string,
  targetHashtag: string
): Promise<VideoItem | null> {
  const match = url.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
  const shortcode = match ? match[1] : null;

  if (!shortcode) {
    throw new Error("Format URL Instagram tidak valid");
  }

  const targetUrl = `https://www.instagram.com/p/${shortcode}/`;

  // 1. Coba snapshot JSON halaman (window._shared_data / JSON serialization) — dapet views & engagement
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const html = await res.text();

      const usernameMatch =
        html.match(/"owner":\s*{"username":"([^"]+)"/) ||
        html.match(/"user":\s*{"username":"([^"]+)"/) ||
        html.match(/instagram\.com\/([^"\/?]+)"/);
      const captionMatch =
        html.match(/"caption":\s*"([^"]+)"/) || html.match(/<meta property="og:title" content="([^"]*)"/);
      const thumbMatch = html.match(/<meta property="og:image" content="([^"]*)"/);
      const viewsMatch = html.match(/"video_view_count":\s*(\d+)/) || html.match(/"view_count":\s*(\d+)/);
      const likesMatch = html.match(/"edge_liked_by":\s*{"count":\s*(\d+)/) || html.match(/"like_count":\s*(\d+)/);
      const commentsMatch =
        html.match(/"edge_media_to_comment":\s*{"count":\s*(\d+)/) || html.match(/"comment_count":\s*(\d+)/);

      const username = usernameMatch?.[1]?.replace(/^@/, "").toLowerCase().trim();
      const caption = captionMatch?.[1] || "";
      const hasHashtag = targetHashtag ? caption.toLowerCase().includes(targetHashtag.toLowerCase()) : true;

      if (username && username !== "instagram") {
        return {
          id: shortcode,
          platform: "instagram",
          sourceUrl: url,
          videoUrl: targetUrl,
          title: caption || `Instagram Reel (${shortcode})`,
          authorName: username,
          authorDisplayName: `@${username}`,
          authorUrl: `https://www.instagram.com/${username}`,
          authorAvatar: "",
          coverUrl: thumbMatch?.[1] || "",
          views: viewsMatch ? Number(viewsMatch[1]) : 0,
          likes: likesMatch ? Number(likesMatch[1]) : 0,
          comments: commentsMatch ? Number(commentsMatch[1]) : 0,
          shares: 0,
          saves: 0,
          postedAt: "-",
          status: hasHashtag ? "qualified" : "unqualified",
        };
      }
    }
  } catch (err) {
    console.warn("Server-side page JSON Instagram gagal, coba oEmbed:", err);
  }

  // 2. Fallback: oEmbed (dapet username + caption + thumbnail, tanpa engagement)
  try {
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(oembedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      const rawUsername = data.author_name || "unknown";
      const cleanUsername = rawUsername.toLowerCase().trim();
      const caption = data.title || "";
      const hasHashtag = targetHashtag ? caption.toLowerCase().includes(targetHashtag.toLowerCase()) : true;

      return {
        id: shortcode,
        platform: "instagram",
        sourceUrl: url,
        videoUrl: targetUrl,
        title: caption || `Instagram Post (${shortcode})`,
        authorName: cleanUsername,
        authorDisplayName: data.author_name || cleanUsername,
        authorUrl: `https://www.instagram.com/${cleanUsername}`,
        authorAvatar: "",
        coverUrl: data.thumbnail_url || "",
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        postedAt: "-",
        status: hasHashtag ? "qualified" : "unqualified",
      };
    }
  } catch (err) {
    console.warn("Server-side oEmbed Instagram gagal, memicu fallback client:", err);
  }

  // Jika server diblokir / rate limit, lempar error agar ditangani oleh client fallback
  throw new Error("Instagram Rate Limit / Private Video");
}