"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion } from "motion/react";
import { Upload, Play, Loader2 } from "lucide-react";
import { parseImportFile, ParseResult } from "@/lib/social/importFile";

export interface InputPanelProps {
  hashtag?: string;
  targetHashtag?: string;
  setHashtag?: (val: string) => void;
  setTargetHashtag?: (val: string) => void;
  onHashtagChange?: (val: string) => void;

  rawUrls?: string;
  videoUrlsText?: string;
  setRawUrls?: (val: string) => void;
  setVideoUrlsText?: (val: string) => void;
  onRawUrlsChange?: (val: string) => void;

  isLoading?: boolean;
  onAnalyze?: () => void;
  onImportSuccess?: (urls: string[]) => void;
  onNotify?: (message: string, variant: "success" | "error") => void;

  useCache?: boolean;
  setUseCache?: (val: boolean) => void;
  onUseCacheChange?: (val: boolean) => void;
}

export const InputPanel: React.FC<InputPanelProps> = (props) => {
  const propHashtag = props.hashtag ?? props.targetHashtag ?? "";
  const propUrls = props.rawUrls ?? props.videoUrlsText ?? "";

  // Local state agar input di layar PASTI langsung ter-update
  const [hashtag, setHashtagState] = useState(propHashtag);
  const [rawUrls, setRawUrlsState] = useState(propUrls);

  const isLoading = props.isLoading ?? false;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync jika prop dari parent berubah (mis. import file / reset dari luar)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sengaja: menyinkronkan state lokal saat parent mengubah value dari luar (import, reset)
    if (propHashtag !== undefined) setHashtagState(propHashtag);
  }, [propHashtag]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sengaja: sama seperti di atas, untuk daftar URL
    if (propUrls !== undefined) setRawUrlsState(propUrls);
  }, [propUrls]);

  const handleHashtagChange = (val: string) => {
    setHashtagState(val);
    if (typeof props.setHashtag === "function") props.setHashtag(val);
    if (typeof props.setTargetHashtag === "function") props.setTargetHashtag(val);
    if (typeof props.onHashtagChange === "function") props.onHashtagChange(val);
  };

  const handleUrlsChange = (val: string) => {
    setRawUrlsState(val);
    if (typeof props.setRawUrls === "function") props.setRawUrls(val);
    if (typeof props.setVideoUrlsText === "function") props.setVideoUrlsText(val);
    if (typeof props.onRawUrlsChange === "function") props.onRawUrlsChange(val);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseImportFile(file);

      // Tangani baik mengembalikan object ParseResult maupun array string[]
      let extractedUrls: string[] = [];
      let summaryMessage = "";

      if (Array.isArray(result)) {
        extractedUrls = result;
        summaryMessage = `Berhasil mengimpor ${extractedUrls.length} link!`;
      } else if (result && typeof result === "object") {
        const parseResult = result as ParseResult;
        extractedUrls = parseResult.urls || [];
        summaryMessage = parseResult.summaryMessage || `Berhasil mengimpor ${extractedUrls.length} link!`;
      }

      if (!extractedUrls || extractedUrls.length === 0) {
        props.onNotify?.(
          "Tidak ditemukan URL TikTok, YouTube, atau Instagram yang valid dalam file tersebut.",
          "error"
        );
        return;
      }

      const existingUrls = rawUrls
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean);

      const combined = Array.from(new Set([...existingUrls, ...extractedUrls]));
      const newText = combined.join("\n");

      // Update local & parent state sekaligus
      handleUrlsChange(newText);

      // Tampilkan notifikasi dinamis (TikTok, YouTube & Instagram)
      props.onNotify?.(summaryMessage, "success");

      if (props.onImportSuccess) {
        props.onImportSuccess(extractedUrls);
      }
    } catch (err) {
      props.onNotify?.("Gagal membaca file. Pastikan format file adalah .xlsx atau .csv", "error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="relative bg-[#131B2E]/90 backdrop-blur-sm border border-[#1E293B] rounded-2xl p-6 shadow-2xl shadow-black/20 mb-8 space-y-6 overflow-hidden">
      {/* subtle top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

      {/* Input Hashtag */}
      <div>
        <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">
          Hashtag Syarat Kampanye
        </label>
        <input
          type="text"
          value={hashtag}
          onChange={(e) => handleHashtagChange(e.target.value)}
          placeholder="Contoh: BertamuSpecial"
          className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
        />
      </div>

      {/* Input Textarea & Import File Button */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase">
            Daftar Link Video TikTok, YouTube &amp; Instagram (1 URL Per Baris)
          </label>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-800/50 hover:border-cyan-500/50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Import Excel / CSV
            </motion.button>
          </div>
        </div>
        <textarea
          rows={6}
          value={rawUrls}
          onChange={(e) => handleUrlsChange(e.target.value)}
          placeholder={`https://www.tiktok.com/@username/video/123456789\nhttps://www.youtube.com/shorts/c7TRyQI15Qk\nhttps://www.instagram.com/reel/C12345678/`}
          className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg p-4 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-y"
        />
      </div>

      {/* Submit Button */}
      <motion.button
        whileHover={isLoading ? undefined : { y: -1 }}
        whileTap={isLoading ? undefined : { scale: 0.98 }}
        type="button"
        disabled={isLoading || !hashtag || !rawUrls.trim()}
        onClick={props.onAnalyze}
        className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-cyan-950/50 cursor-pointer"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4 fill-current" />
        )}
        {isLoading ? "Memproses Data Real-Time..." : "Verifikasi & Kelompokkan Per Username"}
      </motion.button>
    </div>
  );
};

export default InputPanel;