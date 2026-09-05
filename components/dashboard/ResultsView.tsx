"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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
      return [{ ...unknownGroup, authorDisplayName: "⚠️ Link Error / Unknown" }, ...validCreators];
    }
    return validCreators;
  }, [filteredVideos, creatorSort]);

  const manualCount = useMemo(
    () =>
      allVideos.filter(
        (v) => v.authorName.toLowerCase() === "instagram_creator" || v.views === 0
      ).length,
    [allVideos]
  );

  return (
    <div className="space-y-6">
      {manualCount > 0 && (
        <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-cyan-300 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <strong className="font-semibold text-cyan-200">Catatan Instagram:</strong> Ditemukan{" "}
            <span className="font-bold underline">{manualCount} link Instagram</span> yang terkena
            proteksi scraping publik. Anda dapat mengeklik link asli untuk mengecek views/likes manual
            jika diperlukan.
          </div>
        </div>
      )}

      <KpiRibbon metrics={globalMetrics} hashtag={`#${hashtag.toLowerCase().replace("#", "").trim()}`} />

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
        onExportExcel={() =>
          exportResultToExcel({
            hashtag: `#${hashtag.toLowerCase().replace("#", "").trim()}`,
            globalMetrics,
            creators: creatorsForFolder,
            allVideos,
          })
        }
        onExportPdf={() =>
          exportResultToPdf({
            hashtag: `#${hashtag.toLowerCase().replace("#", "").trim()}`,
            globalMetrics,
            creators: creatorsForFolder,
            allVideos,
          })
        }
      />

      <AnimatePresence mode="wait">
        {viewMode === "folder" ? (
          <motion.div
            key="folder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <MasterTable videos={sortedVideosForTable} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
