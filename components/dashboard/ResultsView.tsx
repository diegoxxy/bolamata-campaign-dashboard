"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle } from "lucide-react";
import type {
  CreatorSortKey,
  StatusFilter,
  VideoItem,
  VideoSortKey,
  ViewMode,
} from "@/lib/social/types";
import { exportResultToExcel } from "@/lib/social/exportExcel";
import { exportResultToPdf } from "@/lib/social/exportPdf";
import { computeGlobalMetrics, groupVideosByCreator } from "@/lib/social/aggregate";
import { filterVideos, sortCreators, sortVideos } from "@/lib/social/filterSort";

import KpiRibbon from "./KpiRibbon";
import Toolbar from "./Toolbar";
import FolderView from "./FolderView";
import MasterTable from "./MasterTable";
import { EASE_OUT } from "./motionPresets";

interface ResultsViewProps {
  hashtag: string;
  allVideos: VideoItem[];
  readOnly?: boolean;
  onUpdateVideo?: (v: VideoItem) => void;
}

export default function ResultsView({
  hashtag,
  allVideos,
  readOnly = false,
  onUpdateVideo,
}: ResultsViewProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [minViewsInput, setMinViewsInput] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("folder");
  const [videoSort, setVideoSort] = useState<VideoSortKey>("views_desc");
  const [creatorSort, setCreatorSort] = useState<CreatorSortKey>("creator_views_desc");

  const globalMetrics = useMemo(() => computeGlobalMetrics(allVideos), [allVideos]);

  const filters = useMemo(
    () => ({
      search,
      status,
      minViews: minViewsInput.trim() === "" ? null : Number(minViewsInput),
    }),
    [search, status, minViewsInput]
  );

  const filteredVideos = useMemo(() => filterVideos(allVideos, filters), [allVideos, filters]);

  const sortedVideosForTable = useMemo(
    () => sortVideos(filteredVideos, videoSort),
    [filteredVideos, videoSort]
  );

  const creatorsForFolder = useMemo(() => {
    const grouped = groupVideosByCreator(filteredVideos);
    const sorted = sortCreators(grouped, creatorSort);

    const unknownGroup = grouped.find((c) => c.authorName.toLowerCase() === "unknown");
    const validCreators = sorted.filter((c) => c.authorName.toLowerCase() !== "unknown");

    if (unknownGroup) {
      return [{ ...unknownGroup, authorDisplayName: "Link Error / Unknown" }, ...validCreators];
    }
    return validCreators;
  }, [filteredVideos, creatorSort]);

  // Perbaikan: Kelompokkan link yang membutuhkan input manual/error berdasarkan platform aslinya
  const issueSummary = useMemo(() => {
    const problematic = allVideos.filter(
      (v) =>
        v.authorName.toLowerCase() === "instagram_creator" ||
        v.authorName.toLowerCase() === "unknown" ||
        v.views === 0
    );

    if (problematic.length === 0) return null;

    const counts = {
      instagram: 0,
      tiktok: 0,
      youtube: 0,
    };

    problematic.forEach((v) => {
      if (v.platform === "instagram" || v.sourceUrl.includes("instagram.com")) {
        counts.instagram++;
      } else if (v.platform === "youtube" || v.sourceUrl.includes("youtube.com") || v.sourceUrl.includes("youtu.be")) {
        counts.youtube++;
      } else {
        counts.tiktok++;
      }
    });

    const parts: string[] = [];
    if (counts.tiktok > 0) parts.push(`${counts.tiktok} link TikTok`);
    if (counts.instagram > 0) parts.push(`${counts.instagram} link Instagram`);
    if (counts.youtube > 0) parts.push(`${counts.youtube} link YouTube`);

    return {
      total: problematic.length,
      detailText: parts.join(", "),
    };
  }, [allVideos]);

  const cleanHashtag = `#${hashtag.toLowerCase().replace("#", "").trim()}`;
  const exportArgs = { hashtag: cleanHashtag, globalMetrics, creators: creatorsForFolder, allVideos };

  return (
    <div className="space-y-5">
      {/* Banner catatan: animasi slide-in saat muncul */}
      <AnimatePresence>
        {issueSummary && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-amber-950/15 border border-amber-800/40 text-amber-300 text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-amber-200">Catatan Verifikasi Link:</strong> Ditemukan{" "}
                  <span className="font-bold underline">{issueSummary.detailText}</span> yang bermasalah,
                  privat, atau terkena proteksi scraping. Klik link asli untuk cek manual jika diperlukan.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <KpiRibbon metrics={globalMetrics} hashtag={cleanHashtag.slice(1)} />

      <Toolbar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        minViews={minViewsInput}
        onMinViewsChange={setMinViewsInput}
        viewMode={viewMode}
        onViewModeChange={(mode) => setViewMode(mode)}
        videoSort={videoSort}
        onVideoSortChange={setVideoSort}
        creatorSort={creatorSort}
        onCreatorSortChange={setCreatorSort}
        shownCount={filteredVideos.length}
        totalCount={allVideos.length}
        onExportExcel={() => exportResultToExcel(exportArgs)}
        onExportPdf={() => exportResultToPdf(exportArgs)}
      />

      <AnimatePresence mode="wait">
        {viewMode === "folder" ? (
          <motion.div
            key="folder"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
          >
            <FolderView
              creators={creatorsForFolder}
              onUpdateVideo={onUpdateVideo}
              readOnly={readOnly}
            />
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
          >
            <MasterTable videos={sortedVideosForTable} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
