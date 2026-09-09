"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { FolderSearch, RotateCcw, Share2, Loader2 } from "lucide-react";
import type { VideoBatchResponse, VideoItem } from "@/lib/social/types";
import { chunkArray } from "@/lib/social/chunk";
import { setManyInCache } from "@/lib/social/cache";
import { fetchInstagramDataClient } from "@/lib/social/client/fetchInstagramClient";

import InputPanel from "@/components/dashboard/InputPanel";
import ResultsView from "@/components/dashboard/ResultsView";
import ShareModal from "@/components/dashboard/ShareModal";
import { useToast, ToastStack } from "@/components/dashboard/Toast";
import { Footer } from "@/components/dashboard/SocialIcons";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseUrlsFromText(text: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) continue;
    seen.add(trimmed);
    urls.push(trimmed);
  }
  return urls;
}

function makeErrorVideo(sourceUrl: string, message: string): VideoItem {
  const isYouTube = sourceUrl.includes("youtube.com") || sourceUrl.includes("youtu.be");
  const isInstagram = sourceUrl.includes("instagram.com");

  let platform: "youtube" | "tiktok" | "instagram" = "tiktok";
  if (isYouTube) platform = "youtube";
  if (isInstagram) platform = "instagram";

  return {
    id: sourceUrl,
    platform,
    sourceUrl,
    videoUrl: sourceUrl,
    title: isInstagram ? "Instagram Reel (Sistem Membutuhkan Input Manual)" : "Gagal Memuat Video",
    authorName: isInstagram ? "instagram_creator" : "unknown",
    authorDisplayName: isInstagram ? "Instagram Creator (Manual Input)" : "Unknown / Error",
    authorUrl: sourceUrl,
    authorAvatar: "",
    coverUrl: "",
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    postedAt: "-",
    status: "qualified",
    errorMessage: message,
  };
}

export default function Home() {
  const { toasts, showToast, dismiss } = useToast();

  const [targetHashtag, setTargetHashtag] = useState("");
  const [urlsInput, setUrlsInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const cachedVideos = localStorage.getItem("tiktok_analytics_last_scan");

    if (cachedVideos) {
      try {
        const parsed = JSON.parse(cachedVideos);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- sengaja: hydrate dari localStorage (browser-only) setelah mount
          setAllVideos(parsed);
        }
      } catch (e) {
        console.error("Gagal memuat cache dashboard:", e);
      }
    }
  }, []);

  // Handler untuk memperbarui data video hasil edit manual di komponen anak (FolderView)
  const handleUpdateVideo = useCallback((updatedVideo: VideoItem) => {
    setAllVideos((prevVideos) => {
      const newVideos = prevVideos.map((v) =>
        v.id === updatedVideo.id ? updatedVideo : v
      );
      localStorage.setItem("tiktok_analytics_last_scan", JSON.stringify(newVideos));
      return newVideos;
    });
  }, []);

  const enrichInstagramVideo = useCallback(
    async (v: VideoItem, cleanHashtag: string): Promise<VideoItem> => {
      const isInstagramLink =
        v.sourceUrl.includes("instagram.com") || v.platform === "instagram";

      if (isInstagramLink) {
        const clientData = await fetchInstagramDataClient(v.sourceUrl);
        if (clientData && clientData.username) {
          const cleanUsername = clientData.username.toLowerCase().trim();
          const captionText = clientData.caption || v.title;

          return {
            ...v,
            platform: "instagram",
            authorName: cleanUsername,
            authorDisplayName:
              cleanUsername === "instagram_creator"
                ? "Instagram Creator (Perlu Input Manual)"
                : `@${cleanUsername}`,
            authorUrl:
              cleanUsername === "instagram_creator"
                ? v.sourceUrl
                : `https://www.instagram.com/${cleanUsername}`,
            title: captionText,
            views: clientData.views || v.views,
            likes: clientData.likes || v.likes,
            comments: clientData.comments || v.comments,
            coverUrl: clientData.thumbnail || v.coverUrl,
            status: "qualified",
            errorMessage: undefined,
          };
        }
      }
      return v;
    },
    []
  );

  async function handleScan() {
    if (!targetHashtag.trim() || !urlsInput.trim()) return;

    setLoading(true);
    setAllVideos([]);

    const cleanHashtag = targetHashtag.replace(/^#/, "").trim().toLowerCase();
    const urls = parseUrlsFromText(urlsInput);

    const chunks = chunkArray(urls, 5);
    const toCache: { sourceUrl: string; video: VideoItem }[] = [];
    const collectedVideos: VideoItem[] = [];

    setProgress({ done: 0, total: urls.length });

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];

      if (chunkIndex > 0) {
        await delay(1500);
      }

      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrls: chunk, targetHashtag: cleanHashtag }),
        });

        const data = (await res.json()) as VideoBatchResponse;

        if (!res.ok) {
          throw new Error((data as unknown as { error?: string }).error || "Request batch gagal");
        }

        if (data.videos) {
          const processedVideos = await Promise.all(
            data.videos.map((v: VideoItem) => enrichInstagramVideo(v, cleanHashtag))
          );

          setAllVideos((prev) => [...prev, ...processedVideos]);
          collectedVideos.push(...processedVideos);
          toCache.push(
            ...processedVideos.map((v: VideoItem) => ({ sourceUrl: v.sourceUrl, video: v }))
          );
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Gagal menghubungi server";

        const errored = await Promise.all(
          chunk.map(async (u: string) => {
            const fallbackVideo = makeErrorVideo(u, errorMessage);
            return await enrichInstagramVideo(fallbackVideo, cleanHashtag);
          })
        );

        setAllVideos((prev) => [...prev, ...errored]);
        collectedVideos.push(...errored);
        toCache.push(
          ...errored.map((v: VideoItem) => ({ sourceUrl: v.sourceUrl, video: v }))
        );
      }

      setProgress((prev) =>
        prev ? { ...prev, done: Math.min(prev.total, prev.done + chunk.length) } : null
      );
    }

    if (toCache.length > 0) {
      await setManyInCache(toCache);
    }

    localStorage.setItem("tiktok_analytics_last_scan", JSON.stringify(collectedVideos));

    setLoading(false);
    setProgress(null);
  }

  function handleReset() {
    setAllVideos([]);
    setTargetHashtag("");
    setUrlsInput("");
    localStorage.removeItem("tiktok_analytics_last_scan");
  }

  const hasResult = allVideos.length > 0;

  async function handleShare() {
    if (!hasResult) return;
    setSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hashtag: targetHashtag.replace(/^#/, "").trim().toLowerCase(),
          videos: allVideos,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat share link");
      setShareUrl(data.url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal membuat share link", "error");
    } finally {
      setSharing(false);
    }
  }

  return (
    <main className="min-h-screen text-slate-100 p-4 md:p-8 font-sans flex flex-col justify-between">
      <div className="max-w-7xl mx-auto space-y-6 w-full">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="border-b border-[#1e293b] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-5"
        >
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-xl px-3.5 py-3 shadow-lg shadow-black/30 flex-shrink-0">
              <Image
                src="/logo-bolamata.png"
                alt="Bola Mata Currency Clippers Agency"
                width={1048}
                height={136}
                priority
                className="h-6 sm:h-7 w-auto"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-1 text-cyan-400">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                </span>
                BolaMata Currency Clippers Agency
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                Campaign Analytics Dashboard
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Verifikasi, agregasi, dan analisis performa kampanye TikTok, YouTube &amp; Instagram.
              </p>
            </div>
          </div>
          <AnimatePresence>
            {hasResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2 self-start md:self-auto"
              >
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleShare}
                  disabled={sharing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  {sharing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )}
                  Share Hasil
                </motion.button>
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset / Analisis Baru
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.header>

        <InputPanel
          targetHashtag={targetHashtag}
          onHashtagChange={setTargetHashtag}
          rawUrls={urlsInput}
          onRawUrlsChange={setUrlsInput}
          onAnalyze={handleScan}
          isLoading={loading}
          onNotify={showToast}
          onImportSuccess={(urls: string[]) => {
            const existing = parseUrlsFromText(urlsInput);
            const combined = Array.from(new Set([...existing, ...urls]));
            setUrlsInput(combined.join("\n"));
          }}
        />

        <AnimatePresence>
          {loading && progress && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="text-xs text-cyan-300 bg-cyan-950/30 border border-cyan-800/50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span>Memproses analisis link...</span>
                  <span className="font-mono font-bold">
                    {progress.done} / {progress.total} link
                  </span>
                </div>
                <div className="h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                    animate={{
                      width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`,
                    }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {hasResult ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <ResultsView hashtag={targetHashtag} allVideos={allVideos} onUpdateVideo={handleUpdateVideo} />
            </motion.div>
          ) : (
            !loading && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="border border-dashed border-[#1e293b] rounded-2xl py-16 px-6 text-center bg-[#0f1524]/40"
              >
                <div className="mx-auto w-12 h-12 rounded-full bg-cyan-950/40 border border-cyan-900/50 flex items-center justify-center mb-4">
                  <FolderSearch className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-200">Belum ada data kampanye</h3>
                <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto">
                  Isi hashtag kampanye dan tempel link TikTok, YouTube, atau Instagram di atas — atau import
                  dari Excel/CSV — lalu klik <span className="text-cyan-400 font-medium">Verifikasi &amp; Kelompokkan</span>.
                </p>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      <Footer />

      <ShareModal url={shareUrl} onClose={() => setShareUrl(null)} />
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </main>
  );
}