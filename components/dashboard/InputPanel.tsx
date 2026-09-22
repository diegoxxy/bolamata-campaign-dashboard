"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion } from "motion/react";
import { Upload, Play, Loader2, Hash } from "lucide-react";
import { parseImportFile, ParseResult } from "@/lib/social/importFile";
import { WobbleIcon, pressable } from "./motionPresets";

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

  const canSubmit = !isLoading && !!hashtag && !!rawUrls.trim();

  return (
    <div className="card-elevated relative p-5 mb-5 space-y-4 overflow-hidden">
      {/* subtle top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

      {/* Input Hashtag */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-bold tracking-wider text-fg-muted uppercase mb-2">
          <Hash className="w-5 h-5 text-cyan-400" />
          Hashtag Syarat Kampanye
        </label>
        <input
          type="text"
          value={hashtag}
          onChange={(e) => handleHashtagChange(e.target.value)}
          placeholder="Contoh: BertamuSpecial"
          className="field w-full text-sm"
        />
      </div>

      {/* Input Textarea & Import File Button */}
      <div>
        <div className="flex items-end justify-between mb-2 gap-3">
          <label className="block text-sm font-bold tracking-wider text-fg-muted uppercase max-w-[60%] sm:max-w-[70%]">
            Daftar Link Video TikTok, YouTube &amp; Instagram (1 URL Per Baris)
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
          <motion.button
            {...pressable}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-800/50 hover:border-cyan-500/50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex-shrink-0"
          >
            <WobbleIcon intensity={0.9}>
              <Upload className="w-5 h-5" />
            </WobbleIcon>
            Import Excel / CSV
          </motion.button>
        </div>
        <textarea
          rows={6}
          value={rawUrls}
          onChange={(e) => handleUrlsChange(e.target.value)}
          placeholder={"https://www.tiktok.com/@username/video/123456789\nhttps://www.youtube.com/shorts/c7TRyQI15Qk\nhttps://www.instagram.com/reel/C12345678/"}
          className="field enterprise-scroll w-full p-4 text-sm font-mono resize-y leading-relaxed"
        />
        {rawUrls.trim() && (
          <p className="text-xs text-fg-subtle mt-1.5 font-mono">
            {rawUrls.split("\n").filter((l) => l.trim()).length} link terdeteksi
          </p>
        )}
      </div>

      {/* Submit Button */}
      <motion.button
        whileHover={isLoading || !canSubmit ? undefined : { y: -1, scale: 1.005 }}
        whileTap={isLoading || !canSubmit ? undefined : { scale: 0.985 }}
        type="button"
        disabled={!canSubmit}
        onClick={props.onAnalyze}
        className="sheen relative w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-fg-subtle disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-cyan-950/50 cursor-pointer overflow-hidden"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <WobbleIcon intensity={1.1}>
            <Play className="w-4 h-4 fill-current" />
          </WobbleIcon>
        )}
        {isLoading ? "Memproses Data Real-Time..." : "Verifikasi & Kelompokkan Per Username"}
      </motion.button>
    </div>
  );
};

export default InputPanel;
