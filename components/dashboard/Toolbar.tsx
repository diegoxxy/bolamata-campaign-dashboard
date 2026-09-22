"use client";

import { motion } from "motion/react";
import type { CreatorSortKey, StatusFilter, VideoSortKey, ViewMode } from "@/lib/social/types";
import { Search, LayoutGrid, Table2, FileSpreadsheet, FileText, X } from "lucide-react";
import { pressable, SPRING } from "./motionPresets";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  status: StatusFilter;
  onStatusChange: (v: StatusFilter) => void;
  minViews: string;
  onMinViewsChange: (v: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  videoSort: VideoSortKey;
  onVideoSortChange: (v: VideoSortKey) => void;
  creatorSort: CreatorSortKey;
  onCreatorSortChange: (v: CreatorSortKey) => void;
  shownCount: number;
  totalCount: number;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

// FIX OVERLAP CHEVRON (bug critical, STATUS & URUTKAN dropdown): seluruh kontrak
// chevron — appearance, posisi, size, repeat, padding kanan 2.5rem — dimiliki
// `select.field` di globals.css (@layer components). Komponen HANYA set CSS var
// --chevron-data; CSS yang atur size/posisi/repeat/padding → teks opsi tidak
// pernah mengenai chevron. Penyebab asli: `.field` tak berlayer + shorthand
// `background:` mereset utility bg-size/position/repeat → chevron render di
// size SVG asli (24px) dari pojok kiri & menumpuk teks. Lihat globals.css.
const selectCls =
  "field cursor-pointer pl-3.5 pr-10 text-sm font-medium";
// ponytail: stroke #a3b3c9 (≈6.4:1 di atas surface) — icon dekoratif non-teks,
// AA large-object 3:1 sudah lolos. Naik ke #cbd5e1 bila perlu kontras lebih.
const CHEVRON_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a3b3c9' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")";
// Satu jalur chevron: CSS var dikonsumsi select.field di globals.css.
const chevronStyle = { "--chevron-data": CHEVRON_SVG } as React.CSSProperties;

  "block text-sm font-bold text-fg-muted uppercase tracking-wider mb-1.5";

export default function Toolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  minViews,
  onMinViewsChange,
  viewMode,
  onViewModeChange,
  videoSort,
  onVideoSortChange,
  creatorSort,
  onCreatorSortChange,
  shownCount,
  totalCount,
  onExportExcel,
  onExportPdf,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="card-elevated p-3.5">
        {/* Satu baris: filter kiri, tombol kanan. Counter di luar section. */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search — ambil lebar utama */}
        <div className="relative flex-1 min-w-[220px] max-w-[340px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle pointer-events-none" />
          <input
            id="toolbar-search"
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari username, ID video, atau caption…"
            className="field w-full pl-10 pr-10 text-sm"
            aria-label="Cari video"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Hapus pencarian"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="shrink-0">
          <label className="sr-only" htmlFor="toolbar-status">Status</label>
          <select
            id="toolbar-status"
            value={status}
            onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
            className={selectCls}
            style={chevronStyle}
            aria-label="Filter status"
          >
            <option value="all">Semua Status</option>
            <option value="qualified">Qualified</option>
            <option value="unqualified">Unqualified</option>
            <option value="error">Error / Private</option>
          </select>
        </div>

        {/* Min views — select dgn preview teks biar jelas fungsinya.
            Nilai custom (ketik manual) tetap dipertahankan lewat opsi dinamis. */}
        <div className="shrink-0">
          <label className="sr-only" htmlFor="toolbar-views">Min. Views</label>
          <select
            id="toolbar-views"
            value={minViews}
            onChange={(e) => onMinViewsChange(e.target.value)}
            className={selectCls}
            style={chevronStyle}
            aria-label="Filter views minimum"
          >
            <option value="">Semua Views</option>
            <option value="1000">1K+ views</option>
            <option value="10000">10K+ views</option>
            <option value="100000">100K+ views</option>
            <option value="500000">500K+ views</option>
            <option value="1000000">1M+ views</option>
            {minViews &&
              !["1000", "10000", "100000", "500000", "1000000"].includes(minViews) && (
                <option value={minViews}>
                  {Number(minViews).toLocaleString("id-ID")} views
                </option>
              )}
          </select>
        </div>

        {/* Sort — context sensitive by view mode */}
        <div className="shrink-0">
          <label className="sr-only" htmlFor="toolbar-sort">Urutkan</label>
          {viewMode === "table" ? (
            <select
              id="toolbar-sort"
              value={videoSort}
              onChange={(e) => onVideoSortChange(e.target.value as VideoSortKey)}
              className={selectCls}
              style={chevronStyle}
              aria-label="Urutkan video"
            >
              <option value="views_desc">Views: Terbanyak</option>
              <option value="views_asc">Views: Tersedikit</option>
            </select>
          ) : (
            <select
              id="toolbar-sort"
              value={creatorSort}
              onChange={(e) => onCreatorSortChange(e.target.value as CreatorSortKey)}
              className={selectCls}
              style={chevronStyle}
              aria-label="Urutkan kreator"
            >
              <option value="creator_views_desc">Kreator: Views Terbanyak</option>
              <option value="creator_views_asc">Kreator: Views Tersedikit</option>
              <option value="creator_count_desc">Kreator: Video Terbanyak</option>
              <option value="creator_alpha_asc">Kreator: A–Z</option>
            </select>
          )}
        </div>

        {/* Spacer — dorong grup tombol ke kanan */}
        <div className="flex-1" />

        {/* Grup kanan: view mode + export — di baris yg sama dgn filter, kanan */}
        <div className="relative flex items-stretch h-11 bg-[#0b0f19] border border-border-strong rounded-lg shrink-0 p-1 gap-1">
            <motion.div
              layout
              className="absolute inset-y-1 left-1 w-[calc(50%-6px)] bg-cyan-600 rounded-md shadow-lg shadow-cyan-950/40"
              animate={{ x: viewMode === "folder" ? 0 : "calc(100% + 4px)" }}
              transition={SPRING.snappy}
            />
            <button
              type="button"
              aria-pressed={viewMode === "folder"}
              onClick={() => onViewModeChange("folder")}
              className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 px-3 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
                viewMode === "folder" ? "text-white" : "text-fg-subtle hover:text-white"
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> Folder
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "table"}
              onClick={() => onViewModeChange("table")}
              className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 px-3 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
                viewMode === "table" ? "text-white" : "text-fg-subtle hover:text-white"
              }`}
            >
              <Table2 className="w-4 h-4" /> Table
            </button>
          </div>

          <motion.button
            {...pressable}
            type="button"
            onClick={onExportExcel}
            className="flex items-center gap-1.5 text-sm font-semibold text-emerald-400 hover:text-emerald-300 border border-border-strong hover:border-emerald-500 bg-emerald-950/20 px-3.5 h-11 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </motion.button>
          <motion.button
            {...pressable}
            type="button"
            onClick={onExportPdf}
            className="flex items-center gap-1.5 text-sm font-semibold text-red-400 hover:text-red-300 border border-border-strong hover:border-red-500 bg-red-950/20 px-3.5 h-11 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <FileText className="w-4 h-4" /> PDF
          </motion.button>
      </div>
      </div>
      {/* Counter di LUAR section card — melayang di bawah, kanan */}
      <p className="text-sm text-fg-subtle whitespace-nowrap text-right pr-1">
        Menampilkan{" "}
        <span className="text-fg font-bold tabular-nums">
          {shownCount.toLocaleString("id-ID")}
        </span>{" "}
        dari <span className="tabular-nums">{totalCount.toLocaleString("id-ID")}</span> video
      </p>
    </div>
  );
}
