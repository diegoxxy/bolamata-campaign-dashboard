"use client";

/**
 * DEMO Clippers Tracker — halaman terpisah, dashboard utama tidak disentuh.
 * Simulasi folder Google Drive: upload banyak file tracker sekaligus (1 file = 1 clipper).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  FolderOpen,
  HardDrive,
  CloudDownload,
  Loader2,
  RefreshCw,
  Trash2,
  XCircle,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { chunkArray } from "@/lib/social/chunk";
import type { VideoItem } from "@/lib/social/types";
import { fetchInstagramDataClient } from "@/lib/social/client/fetchInstagramClient";
import {
  campaignForSheet,
  collectLinks,
  evaluate,
  inferUnknownCampaigns,
  parseRequiredHashtags,
  parseTrackerWorkbook,
  summarize,
  type Campaign,
  type ClipperSummary,
  type EvaluatedVideo,
  type ScannedVideo,
  type TrackerFile,
} from "@/lib/demo-tracker/core";

const STORE_KEY = "demo_tracker_scans_v1";
const CAMPAIGNS_KEY = "demo_tracker_campaigns_v1";
const MANUAL_KEY = "demo_tracker_manual_v1";

const CAMPAIGN_SOURCE_LABEL: Record<string, string> = {
  tab: "Dari nama tab tracker",
  hashtag: "Ditebak dari hashtag caption",
  manual: "Dipilih manual oleh admin",
  akun: "Ditebak dari video lain di akun yang sama (video ini gagal dibaca)",
  clipper: "Ditebak dari campaign terbanyak clipper ini (video ini gagal dibaca)",
  none: "Tidak ada hashtag campaign mana pun",
};

/** Input manual admin untuk video yang tidak bisa dibaca otomatis. */
interface ManualEntry {
  views: number;
  campaignId: string | null;
}

/** Baris editor campaign (hashtag masih teks mentah). */
interface CampaignRow {
  id: string;
  name: string;
  hashtagText: string;
}

const DEFAULT_CAMPAIGNS: CampaignRow[] = [
  { id: "bertamu", name: "BERTAMU", hashtagText: "#BertamuBernadya #BertamuSpecial #bolamatabernadya #Bernadya" },
  { id: "infia", name: "INFIA", hashtagText: "#BolamataClip #PodcastRadityaDika #VaksinHPV" },
];

type ViewTab = "all" | "none" | string;
type PlatformFilter = "all" | VideoItem["platform"];

// Warna badge platform sama dengan dashboard utama (MasterTable)
const PLATFORM_BADGE: Record<VideoItem["platform"], string> = {
  youtube: "bg-red-500/10 text-red-400 border-red-500/25",
  instagram: "bg-pink-500/10 text-pink-400 border-pink-500/25",
  tiktok: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
};
const PLATFORM_LABEL: Record<VideoItem["platform"], string> = { tiktok: "TikTok", youtube: "YouTube", instagram: "Instagram" };

/** Platform video; kalau data gagal dibaca, ditebak dari link-nya. */
function platformOf(v: { platform?: VideoItem["platform"] } | undefined, url: string): VideoItem["platform"] {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/instagram\.com/i.test(url)) return "instagram";
  if (/tiktok\.com/i.test(url)) return "tiktok";
  return v?.platform ?? "tiktok";
}

function PlatformBadge({ p }: { p: VideoItem["platform"] }) {
  return (
    <span className={`inline-block text-[11px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${PLATFORM_BADGE[p]}`}>
      {PLATFORM_LABEL[p]}
    </span>
  );
}

const fmt = (n: number) => n.toLocaleString("id-ID");

async function enrichInstagram(v: ScannedVideo): Promise<ScannedVideo> {
  if (v.platform !== "instagram" && !v.sourceUrl.includes("instagram.com")) return v;
  try {
    const d = await fetchInstagramDataClient(v.sourceUrl);
    if (!d || !d.username || d.username === "instagram_creator") return v;
    const caption = d.caption || v.caption || "";
    return {
      ...v,
      platform: "instagram",
      authorName: d.username.toLowerCase().trim(),
      authorDisplayName: `@${d.username}`,
      title: caption || v.title,
      caption,
      views: d.views || v.views,
      likes: d.likes || v.likes,
      comments: d.comments || v.comments,
      coverUrl: d.thumbnail || v.coverUrl,
      status: "qualified",
      errorMessage: undefined,
    };
  } catch {
    return v;
  }
}

interface RawFile {
  key: string; // ID file Drive, atau "upload:<nama>" untuk file yang di-upload manual
  name: string;
  data: ArrayBuffer;
  source: "drive" | "upload";
  modifiedTime?: string; // dari Drive; file yang belum berubah tidak diunduh ulang
}

interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

const FOLDER_KEY = "demo_tracker_drive_folder";

export default function DemoTrackerPage() {
  const [rawFiles, setRawFiles] = useState<RawFile[]>([]);
  // Pilihan manual tab per file: { "<file>": { "<tab>": true/false } }
  const [tabOverrides, setTabOverrides] = useState<Record<string, Record<string, boolean>>>({});
  const [campaignRows, setCampaignRows] = useState<CampaignRow[]>(DEFAULT_CAMPAIGNS);
  const [view, setView] = useState<ViewTab>("all");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [manual, setManual] = useState<Record<string, ManualEntry>>({});
  // Hasil scan per kunci video. Disimpan, jadi sinkron berikutnya cuma scan link baru.
  const [scans, setScans] = useState<Record<string, ScannedVideo>>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openClipper, setOpenClipper] = useState<string | null>(null);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [folderInput, setFolderInput] = useState("");
  const [driveStatus, setDriveStatus] = useState<string | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);
  // Status jembatan Apps Script: null = masih dicek.
  const [bridge, setBridge] = useState<{ ok: boolean; message: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/demo-tracker/drive?status=1")
      .then((r) => r.json())
      .then((d) => setBridge({ ok: !!d.ok, message: d.error ?? null }))
      .catch(() => setBridge({ ok: false, message: "Server dashboard tidak merespons." }));
  }, []);

  useEffect(() => {
    try {
      const savedFolder = localStorage.getItem(FOLDER_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate dari localStorage sesudah mount
      if (savedFolder) setFolderInput(savedFolder);
    } catch {}
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) setScans(JSON.parse(saved));
    } catch {}
    try {
      const savedCampaigns = localStorage.getItem(CAMPAIGNS_KEY);
      if (savedCampaigns) setCampaignRows(JSON.parse(savedCampaigns));
    } catch {}
    try {
      const savedManual = localStorage.getItem(MANUAL_KEY);
      if (savedManual) setManual(JSON.parse(savedManual));
    } catch {}
  }, []);

  function updateCampaigns(next: CampaignRow[]) {
    setCampaignRows(next);
    try {
      localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(next));
    } catch {}
  }

  const campaigns: Campaign[] = useMemo(
    () =>
      campaignRows
        .filter((r) => r.name.trim())
        .map((r) => ({ id: r.id, name: r.name.trim(), hashtags: parseRequiredHashtags(r.hashtagText) })),
    [campaignRows]
  );
  const campaignName = (id: string | null) => campaigns.find((c) => c.id === id)?.name ?? "Tanpa campaign";

  // File cuma di-parse SEKALI (berat: 94 file). Campaign & pilihan tab diterapkan belakangan (ringan).
  const parsed = useMemo(
    () =>
      rawFiles.map((f) => {
        try {
          return { ...parseTrackerWorkbook(f.data, f.name, []), key: f.key, source: f.source };
        } catch {
          // File rusak / bukan spreadsheet → tampil kosong, tidak bikin halaman crash
          return { clipper: f.name, fileName: f.name, sheets: [], links: [], key: f.key, source: f.source };
        }
      }),
    [rawFiles]
  );

  const files: (TrackerFile & { key: string; source: RawFile["source"] })[] = useMemo(
    () =>
      parsed.map((f) => {
        const ov = tabOverrides[f.key] ?? {};
        const sheets = f.sheets.map((s) => ({
          ...s,
          used: ov[s.name] ?? true,
          campaignId: campaignForSheet(s.name, campaigns)?.id ?? null,
        }));
        const bySheet = new Map(sheets.map((s) => [s.name, s]));
        const fileCampaignId = campaignForSheet(f.fileName, campaigns)?.id ?? null;
        const links = f.links
          .filter((l) => bySheet.get(l.sheet)?.used !== false)
          .map((l) => ({ ...l, sheetCampaignId: bySheet.get(l.sheet)?.campaignId ?? null, fileCampaignId }));
        return { ...f, sheets, links };
      }),
    [parsed, tabOverrides, campaigns]
  );
  // Urutan clipper: dari link (tab "Clipper NN" bisa jadi clipper sendiri) + file yang belum ada link-nya.
  const clipperOrder = useMemo(() => {
    const names = new Set<string>();
    files.forEach((f) => {
      if (f.links.length === 0) names.add(f.clipper);
      f.links.forEach((l) => names.add(l.clipper));
    });
    return Array.from(names);
  }, [files]);

  function toggleTab(fileKey: string, tab: string, currentlyUsed: boolean) {
    setTabOverrides((prev) => ({ ...prev, [fileKey]: { ...prev[fileKey], [tab]: !currentlyUsed } }));
  }
  const { unique, duplicates } = useMemo(() => collectLinks(files), [files]);
  const pending = unique.filter((l) => !scans[l.key]);
  // Link yang sudah di-scan tapi gagal dibaca (limit TikWM, gangguan sesaat, private/dihapus)
  const failedLinks = unique.filter((l) => scans[l.key]?.status === "error");

  // Ganti campaign/hashtag langsung dihitung ulang dari caption yang tersimpan, tanpa scan ulang.
  const evaluatedAll: EvaluatedVideo[] = useMemo(
    () =>
      inferUnknownCampaigns(unique
        .filter((l) => scans[l.key])
        .map((l) => {
          const r = evaluate(l, scans[l.key], campaigns);
          const m = manual[l.key];
          // Video yang gagal dibaca tapi sudah dicek manual oleh admin → dihitung lolos dengan views manual.
          if (r.verdict === "error" && m) {
            return {
              ...r,
              verdict: "lolos" as const,
              video: { ...r.video, views: m.views },
              campaignId: m.campaignId,
              campaignSource: "manual" as const,
              manual: true,
            };
          }
          return r;
        })),
    [unique, scans, campaigns, manual]
  );

  function saveManual(key: string, value: ManualEntry | null) {
    setManual((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      try {
        localStorage.setItem(MANUAL_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }
  // Jumlah video per tab campaign
  const viewCounts = useMemo(() => {
    const m: Record<string, number> = { all: evaluatedAll.length, none: 0 };
    for (const r of evaluatedAll) {
      const k = r.campaignId ?? "none";
      m[k] = (m[k] ?? 0) + 1;
    }
    return m;
  }, [evaluatedAll]);
  const byCampaign = useMemo(
    () =>
      view === "all" ? evaluatedAll : evaluatedAll.filter((r) => (r.campaignId ?? "none") === view),
    [evaluatedAll, view]
  );
  // Jumlah per platform (di campaign yang sedang dibuka)
  const platformCounts = useMemo(() => {
    const m: Record<PlatformFilter, number> = { all: byCampaign.length, tiktok: 0, youtube: 0, instagram: 0 };
    for (const r of byCampaign) m[platformOf(r.video, r.link.url)]++;
    return m;
  }, [byCampaign]);
  const evaluated = useMemo(
    () => (platform === "all" ? byCampaign : byCampaign.filter((r) => platformOf(r.video, r.link.url) === platform)),
    [byCampaign, platform]
  );
  const viewDuplicates = useMemo(
    () => (view === "all" ? duplicates : duplicates.filter((d) => (d.link.sheetCampaignId ?? "none") === view)),
    [duplicates, view]
  );
  const summary: ClipperSummary[] = useMemo(
    () =>
      summarize(evaluated, viewDuplicates, view === "all" ? clipperOrder : []).filter(
        (s) => view === "all" || s.videos.length > 0 || s.duplikat > 0
      ),
    [evaluated, viewDuplicates, clipperOrder, view]
  );
  const totals = useMemo(
    () =>
      summary.reduce(
        (t, s) => ({
          views: t.views + s.views,
          lolos: t.lolos + s.lolos,
          gugur: t.gugur + s.gugur,
          error: t.error + s.error,
        }),
        { views: 0, lolos: 0, gugur: 0, error: 0 }
      ),
    [summary]
  );

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const added: RawFile[] = await Promise.all(
      Array.from(list).map(async (f) => ({
        key: `upload:${f.name}`,
        name: f.name,
        data: await f.arrayBuffer(),
        source: "upload" as const,
      }))
    );
    // File dengan nama sama = versi terbaru tracker clipper itu → ganti yang lama.
    setRawFiles((prev) => {
      const keys = new Set(added.map((a) => a.key));
      return [...prev.filter((p) => !keys.has(p.key)), ...added];
    });
  }

  /** Tarik semua file tracker dari folder Drive. File yang belum berubah sejak tarikan terakhir tidak diunduh ulang. */
  async function pullFromDrive() {
    const folder = folderInput.trim();
    if (!folder) return;
    setDriveError(null);
    setDriveStatus("Membaca isi folder…");
    try {
      localStorage.setItem(FOLDER_KEY, folder);
    } catch {}

    try {
      const res = await fetch(`/api/demo-tracker/drive?folder=${encodeURIComponent(folder)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membaca folder");
      const list = data.files as DriveFileInfo[];
      if (list.length === 0) throw new Error("Folder kosong / tidak ada file spreadsheet.");

      const prevById = new Map(rawFiles.filter((f) => f.source === "drive").map((f) => [f.key, f]));
      const fresh: RawFile[] = [];
      const toDownload = list.filter((f) => {
        const prev = prevById.get(f.id);
        if (prev && prev.modifiedTime === f.modifiedTime) {
          fresh.push(prev);
          return false;
        }
        return true;
      });

      let done = 0;
      let failed = 0;
      setDriveStatus(`Mengunduh 0/${toDownload.length} file (${fresh.length} tidak berubah)…`);
      // 4 file sekaligus biar cepat tapi tidak kena limit Google
      for (const group of chunkArray(toDownload, 4)) {
        const got = await Promise.all(
          group.map(async (f) => {
            try {
              const url = `/api/demo-tracker/drive?file=${encodeURIComponent(f.id)}&mime=${encodeURIComponent(f.mimeType)}`;
              // Apps Script kadang gagal sesaat (cold start / limit) → coba sekali lagi
              let r = await fetch(url);
              if (!r.ok) {
                await new Promise((res) => setTimeout(res, 1500));
                r = await fetch(url);
              }
              if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
              return {
                key: f.id,
                name: /\.(xlsx|xlsm|xls|csv)$/i.test(f.name) ? f.name : `${f.name}.xlsx`,
                data: await r.arrayBuffer(),
                source: "drive" as const,
                modifiedTime: f.modifiedTime,
              };
            } catch {
              failed++;
              return null;
            }
          })
        );
        got.forEach((g) => g && fresh.push(g));
        done += group.length;
        setDriveStatus(`Mengunduh ${done}/${toDownload.length} file (${list.length - toDownload.length} tidak berubah)…`);
      }

      // File Drive diganti versi terbaru; file upload manual tetap dipertahankan.
      setRawFiles((prev) => [...fresh, ...prev.filter((p) => p.source === "upload")]);
      setDriveStatus(
        `${list.length} file dari Drive · ${toDownload.length - failed} diunduh, ${list.length - toDownload.length} tidak berubah` +
          (failed ? ` · ${failed} gagal` : "") +
          ` · ${new Date().toLocaleTimeString("id-ID")}`
      );
    } catch (e) {
      setDriveError(e instanceof Error ? e.message : "Gagal membaca folder");
      setDriveStatus(null);
    }
  }

  async function loadSamples() {
    const names = [
      "Contoh Andi - Clipper Tracker.xlsx",
      "Contoh Budi - Clippers Tracker.xlsx",
      "[Contoh Citra - BERtamu Project].xlsx",
    ];
    const loaded: RawFile[] = await Promise.all(
      names.map(async (name) => ({
        key: `upload:${name}`,
        name,
        data: await fetch(`/demo-tracker/${encodeURIComponent(name)}`).then((r) => r.arrayBuffer()),
        source: "upload" as const,
      }))
    );
    setRawFiles(loaded);
  }

  /** "new" = cuma link baru, "failed" = cuma yang gagal dibaca, "all" = semua dari awal. */
  async function runScan(mode: "new" | "failed" | "all" = "new") {
    const rescanAll = mode === "all";
    const targets = mode === "all" ? unique : mode === "failed" ? failedLinks : pending;
    if (targets.length === 0) return;
    setError(null);
    setProgress({ done: 0, total: targets.length });

    // Mode "failed": hasil lama yang sukses dipertahankan, yang gagal ditimpa hasil baru.
    const next: Record<string, ScannedVideo> = rescanAll ? {} : { ...scans };
    if (rescanAll) setScans({});

    const chunks = chunkArray(targets, 5);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const res = await fetch("/api/demo-tracker/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrls: chunk.map((l) => l.url), hashtag: "tracker" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Scan gagal");
        // Instagram sering ditolak dari server → coba ambil dari browser (sama seperti dashboard utama).
        const videos = await Promise.all((data.videos as ScannedVideo[]).map(enrichInstagram));
        chunk.forEach((l) => {
          const v = videos.find((x) => x.sourceUrl === l.url);
          if (v) next[l.key] = v;
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Scan gagal");
      }
      setScans({ ...next });
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(next));
      } catch {}
      setProgress({ done: Math.min(targets.length, (i + 1) * 5), total: targets.length });
    }
    setProgress(null);
  }

  function resetAll() {
    setRawFiles([]);
    setScans({});
    setTabOverrides({});
    setDriveStatus(null);
    setDriveError(null);
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {}
  }

  const busy = progress !== null;
  const driveBusy = driveStatus !== null && /…$/.test(driveStatus);

  return (
    <main className="min-h-screen text-slate-100 p-3 sm:p-5 font-sans">
      <div className="max-w-6xl mx-auto space-y-5">
        <header className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wider text-amber-400 uppercase">Demo · belum terhubung ke dashboard</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Clippers Tracker Sync</h1>
            <p className="text-sm text-fg-subtle mt-1">
              Tarik semua tracker clipper dari folder Google Drive (1 file = 1 clipper), atau upload manual.
            </p>
          </div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300">
            <ArrowLeft className="w-4 h-4" /> Dashboard utama
          </Link>
        </header>

        {/* Pengaturan */}
        <section className="card-elevated p-5 space-y-4">
          {/* Campaign + hashtag wajib */}
          <div className="space-y-2">
            <label className="block text-sm font-bold tracking-wider text-fg-muted uppercase">
              Campaign &amp; hashtag wajib
            </label>
            <p className="text-xs text-fg-subtle">
              Video lolos kalau captionnya punya <b>semua</b> hashtag wajib campaign-nya (hashtag tambahan boleh).
              Tab tracker yang namanya mengandung nama campaign (mis. &quot;BERTAMU&quot;) otomatis masuk campaign itu;
              tab umum (&quot;Clipper 01&quot;) ditebak dari hashtag caption.
            </p>
            {campaignRows.map((row, i) => {
              const tags = parseRequiredHashtags(row.hashtagText);
              return (
                <div key={row.id} className="rounded-xl border border-slate-800 p-3 grid gap-2 sm:grid-cols-[180px_1fr_auto] items-start">
                  <input value={row.name} placeholder="Nama campaign"
                    onChange={(e) => updateCampaigns(campaignRows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))}
                    className="field text-sm font-semibold uppercase" />
                  <div>
                    <input value={row.hashtagText} placeholder="#hashtag1 #hashtag2"
                      onChange={(e) => updateCampaigns(campaignRows.map((r, j) => (j === i ? { ...r, hashtagText: e.target.value } : r)))}
                      className="field w-full text-sm" />
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {tags.map((t) => (
                        <span key={t} className="text-xs font-mono px-2 py-0.5 rounded-md bg-cyan-950/50 border border-cyan-800/50 text-cyan-300">#{t}</span>
                      ))}
                    </div>
                  </div>
                  <button type="button" title="Hapus campaign" disabled={campaignRows.length <= 1}
                    onClick={() => updateCampaigns(campaignRows.filter((_, j) => j !== i))}
                    className="p-2 rounded-lg border border-slate-800 text-fg-subtle hover:text-red-300 hover:border-red-900 disabled:opacity-30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            <button type="button"
              onClick={() => updateCampaigns([...campaignRows, { id: `c${Date.now()}`, name: "", hashtagText: "" }])}
              className="text-sm text-cyan-400 hover:text-cyan-300">
              + Tambah campaign
            </button>
          </div>

          {/* Sumber 1: folder Google Drive */}
          <div className="rounded-xl border border-slate-800 p-4 space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-bold tracking-wider text-fg-muted uppercase">
              <HardDrive className="w-4 h-4 text-cyan-400" /> Folder Google Drive
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={folderInput} onChange={(e) => setFolderInput(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/…" className="field flex-1 text-sm" />
              <button type="button" onClick={pullFromDrive} disabled={!folderInput.trim() || busy || driveBusy}
                className="inline-flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-fg-subtle disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-colors">
                {driveBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
                {rawFiles.some((f) => f.source === "drive") ? "Tarik ulang dari Drive" : "Tarik dari Drive"}
              </button>
            </div>
            {bridge?.ok ? (
              <p className="text-xs text-emerald-300">● Terhubung ke Apps Script — folder tetap privat, dibaca lewat akun admin.</p>
            ) : bridge ? (
              <p className="text-xs text-amber-300">● Apps Script belum siap: {bridge.message}</p>
            ) : null}
            <p className="text-xs text-fg-subtle">Tarik ulang cuma mengunduh file yang berubah sejak tarikan terakhir.</p>
            {driveStatus && <p className="text-xs text-cyan-300">{driveStatus}</p>}
            {driveError && <p className="text-sm text-red-300">⚠ {driveError}</p>}
          </div>

          <p className="text-center text-xs text-fg-subtle">— atau upload manual —</p>

          <input ref={inputRef} type="file" multiple accept=".xlsx,.xls,.csv" className="hidden"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            className="cursor-pointer rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-600 transition-colors p-6 text-center"
          >
            <FolderOpen className="w-8 h-8 mx-auto text-cyan-400" />
            <p className="mt-2 text-sm font-semibold">Klik / drop file tracker di sini (bisa banyak sekaligus)</p>
            <p className="text-xs text-fg-subtle mt-1">.xlsx / .csv — dari Drive: File → Download → Microsoft Excel</p>
          </div>
          {files.length === 0 && (
            <button type="button" onClick={loadSamples} className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-4">
              Belum punya file? Pakai 3 file contoh
            </button>
          )}

          {files.length > 0 && (
            <>
            <p className="text-xs text-fg-subtle">
              {files.length} file · {fmt(unique.length)} link video unik. Tab berwarna = masuk campaign; klik tab buat baca/lewati.
            </p>
            <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
              {(showAllFiles ? files : files.slice(0, 8)).map((f) => (
                <li key={f.key} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold truncate">{f.clipper}</span>
                    <span className="text-xs text-fg-subtle shrink-0">{f.links.length} link</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {f.sheets.filter((s) => s.linkCount > 0 || !s.used).map((s) => (
                      <button type="button" key={s.name} onClick={() => toggleTab(f.key, s.name, s.used)}
                        title={!s.used ? "Dilewati — klik untuk baca tab ini"
                          : `${s.linkCount} link · ${s.campaignId ? `campaign ${campaignName(s.campaignId)}` : "campaign ditebak dari hashtag"} — klik untuk lewati`}
                        className={`text-xs px-2 py-0.5 rounded-md border cursor-pointer ${!s.used ? "border-slate-700 text-fg-subtle line-through"
                          : s.campaignId ? "border-cyan-700/60 text-cyan-300 bg-cyan-950/30" : "border-emerald-700/60 text-emerald-300 bg-emerald-950/30"}`}>
                        {s.name}{s.used ? ` · ${s.linkCount}` : ""}
                      </button>
                    ))}
                    {f.sheets.every((s) => s.linkCount === 0) && <span className="text-xs text-fg-subtle">belum ada link</span>}
                  </div>
                </li>
              ))}
            </ul>
            {files.length > 8 && (
              <button type="button" onClick={() => setShowAllFiles(!showAllFiles)} className="text-sm text-cyan-400 hover:text-cyan-300">
                {showAllFiles ? "Ringkas daftar file" : `Lihat semua ${files.length} file`}
              </button>
            )}
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button type="button" disabled={busy || pending.length === 0 || campaigns.length === 0} onClick={() => runScan("new")}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-fg-subtle disabled:cursor-not-allowed text-white font-semibold py-3 px-5 rounded-lg transition-colors">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {busy
                ? `Scan ${fmt(progress!.done)} / ${fmt(progress!.total)}...`
                : pending.length > 0
                  ? `Sinkron: scan ${fmt(pending.length)} link baru`
                  : unique.length > 0 ? "Semua link sudah ter-scan" : "Upload file dulu"}
            </button>
            {failedLinks.length > 0 && (
              <button type="button" disabled={busy} onClick={() => runScan("failed")}
                className="px-4 py-3 rounded-lg border border-amber-700/60 text-sm text-amber-300 hover:border-amber-500 disabled:opacity-40">
                Scan ulang yang gagal ({fmt(failedLinks.length)})
              </button>
            )}
            <button type="button" disabled={busy || unique.length === 0} onClick={() => runScan("all")}
              className="px-4 py-3 rounded-lg border border-slate-700 text-sm text-fg-muted hover:border-slate-500 disabled:opacity-40">
              Scan ulang semua
            </button>
            <button type="button" disabled={busy} onClick={resetAll}
              className="px-4 py-3 rounded-lg border border-red-900/60 text-sm text-red-300 hover:border-red-700 disabled:opacity-40 inline-flex items-center justify-center gap-1.5">
              <Trash2 className="w-4 h-4" /> Reset
            </button>
          </div>
          {busy && (
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-cyan-500 transition-all" style={{ width: `${(progress!.done / progress!.total) * 100}%` }} />
            </div>
          )}
          {error && <p className="text-sm text-red-300">⚠ {error}</p>}
        </section>

        {/* Tab campaign */}
        {evaluatedAll.length > 0 && (
          <nav className="flex flex-wrap gap-2">
            {[{ id: "all", name: "Semua" }, ...campaigns, { id: "none", name: "Tanpa campaign" }].map((c) => {
              const n = viewCounts[c.id] ?? 0;
              if (c.id === "none" && n === 0) return null;
              const active = view === c.id;
              return (
                <button key={c.id} type="button" onClick={() => setView(c.id)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold border transition-colors ${active
                    ? "bg-cyan-600 border-cyan-500 text-white" : "border-slate-700 text-fg-muted hover:border-slate-500"}`}>
                  {c.name} <span className={active ? "text-cyan-100" : "text-fg-subtle"}>· {fmt(n)}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Filter platform (warna sama dengan dashboard utama) */}
        {evaluatedAll.length > 0 && (
          <nav className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold text-fg-subtle mr-1">Platform</span>
            {(["all", "tiktok", "youtube", "instagram"] as PlatformFilter[]).map((p) => {
              const active = platform === p;
              return (
                <button key={p} type="button" onClick={() => setPlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${p === "all"
                    ? active ? "bg-slate-200 text-slate-900 border-slate-200" : "border-slate-700 text-fg-muted hover:border-slate-500"
                    : `${PLATFORM_BADGE[p]} ${active ? "ring-2 ring-offset-1 ring-offset-slate-950 ring-current" : "opacity-80 hover:opacity-100"}`}`}>
                  {p === "all" ? "Semua" : PLATFORM_LABEL[p]} · {fmt(platformCounts[p])}
                </button>
              );
            })}
          </nav>
        )}

        {/* Ringkasan */}
        {unique.length > 0 && (
          <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Kpi label="Total views lolos" value={fmt(totals.views)} accent />
            <Kpi label="Video lolos" value={fmt(totals.lolos)} tone="ok" />
            <Kpi label="Gugur (hashtag kurang)" value={fmt(totals.gugur)} tone="bad" />
            <Kpi label="Gagal dibaca" value={fmt(totals.error)} tone="warn" />
            <Kpi label="Belum di-scan" value={fmt(pending.length)} />
          </section>
        )}

        {/* Per clipper */}
        {summary.length > 0 && (
          <section className="card-elevated overflow-hidden">
            <div className="hidden sm:grid grid-cols-[2fr_1fr_repeat(4,_0.7fr)_24px] gap-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-fg-subtle border-b border-slate-800">
              <span>Clipper</span><span className="text-right">Views lolos</span><span className="text-right">Lolos</span>
              <span className="text-right">Gugur</span><span className="text-right">Error</span><span className="text-right">Duplikat</span><span />
            </div>
            {summary.map((s, i) => (
              <div key={s.clipper} className="border-b border-slate-800 last:border-0">
                <button type="button" onClick={() => setOpenClipper(openClipper === s.clipper ? null : s.clipper)}
                  className="w-full grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_1fr_repeat(4,_0.7fr)_24px] gap-3 px-4 py-3 text-left hover:bg-slate-800/40 items-center">
                  <span className="font-semibold truncate"><span className="text-fg-subtle mr-2">{i + 1}.</span>{s.clipper}
                    <span className="block sm:hidden text-xs text-fg-subtle font-normal">
                      {s.lolos} lolos · {s.gugur} gugur · {s.error} error
                    </span>
                  </span>
                  <span className="text-right font-mono font-semibold text-cyan-300">{fmt(s.views)}</span>
                  <span className="hidden sm:block text-right font-mono text-emerald-300">{s.lolos}</span>
                  <span className="hidden sm:block text-right font-mono text-red-300">{s.gugur}</span>
                  <span className="hidden sm:block text-right font-mono text-amber-300">{s.error}</span>
                  <span className="hidden sm:block text-right font-mono text-fg-subtle">{s.duplikat}</span>
                  <ChevronDown className={`hidden sm:block w-4 h-4 transition-transform ${openClipper === s.clipper ? "rotate-180" : ""}`} />
                </button>
                {openClipper === s.clipper && (
                  <ClipperDetail s={s} campaignName={campaignName} campaigns={campaigns} onManual={saveManual} />
                )}
              </div>
            ))}
          </section>
        )}

        {viewDuplicates.length > 0 && (
          <section className="card-elevated p-4 text-sm">
            <p className="font-semibold flex items-center gap-1.5 text-amber-300"><Copy className="w-4 h-4" /> {viewDuplicates.length} link disetor lebih dari 1 clipper (cuma dihitung sekali)</p>
            <ul className="mt-2 space-y-1 text-xs text-fg-muted font-mono">
              {viewDuplicates.slice(0, 20).map((d, i) => (
                <li key={i} className="truncate">{d.link.clipper} → sudah punya {d.ownerClipper}: {d.link.url}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

function Kpi({ label, value, accent, tone }: { label: string; value: string; accent?: boolean; tone?: "ok" | "bad" | "warn" }) {
  const color = accent ? "text-cyan-300" : tone === "ok" ? "text-emerald-300" : tone === "bad" ? "text-red-300" : tone === "warn" ? "text-amber-300" : "text-fg";
  return (
    <div className="card-elevated p-4">
      <p className="text-xs uppercase tracking-wider text-fg-subtle font-bold">{label}</p>
      <p className={`mt-1 text-2xl font-bold font-mono ${color}`}>{value}</p>
    </div>
  );
}

/** Form kecil untuk video yang gagal dibaca: admin buka link, cek hashtag, isi views → dihitung lolos. */
function ManualInput({
  r,
  campaigns,
  onSave,
}: {
  r: EvaluatedVideo;
  campaigns: Campaign[];
  onSave: (key: string, v: ManualEntry | null) => void;
}) {
  const [views, setViews] = useState("");
  const [campaignId, setCampaignId] = useState<string>(r.campaignId ?? campaigns[0]?.id ?? "");
  return (
    <span className="flex items-center gap-1.5 shrink-0">
      <input inputMode="numeric" value={views} onChange={(e) => setViews(e.target.value.replace(/[^\d]/g, ""))}
        placeholder="views" className="field !py-1 !px-2 w-24 text-xs" />
      <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="field !py-1 !px-1.5 text-xs">
        {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button type="button" disabled={!views}
        onClick={() => onSave(r.link.key, { views: Number(views), campaignId: campaignId || null })}
        className="text-xs px-2 py-1 rounded border border-emerald-700/60 text-emerald-300 hover:border-emerald-500 disabled:opacity-40">
        Lolos manual
      </button>
    </span>
  );
}

function ClipperDetail({
  s,
  campaignName,
  campaigns,
  onManual,
}: {
  s: ClipperSummary;
  campaignName: (id: string | null) => string;
  campaigns: Campaign[];
  onManual: (key: string, v: ManualEntry | null) => void;
}) {
  return (
    <div className="px-4 pb-4 space-y-4 bg-slate-950/30">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-fg-subtle pt-3 mb-2">Per akun</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {s.accounts.map((a) => (
            <div key={a.platform + a.account} className="rounded-lg border border-slate-800 p-3">
              <p className="text-sm font-semibold truncate">
                <PlatformBadge p={a.platform} />{" "}@{a.account}
              </p>
              <p className="text-xs text-fg-muted mt-1 font-mono">
                {fmt(a.views)} views · {a.lolos} lolos · {a.gugur} gugur{a.error ? ` · ${a.error} error` : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-fg-subtle mb-2">Video</p>
        <ul className="space-y-1.5">
          {s.videos.map((r) => (
            <li key={r.link.key} className="rounded-lg border border-slate-800 p-2.5 text-sm flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <span className="shrink-0">
                {r.verdict === "lolos" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  : r.verdict === "gugur" ? <XCircle className="w-4 h-4 text-red-400" />
                  : <AlertTriangle className="w-4 h-4 text-amber-400" />}
              </span>
              <PlatformBadge p={platformOf(r.video, r.link.url)} />
              <a href={r.link.url} target="_blank" rel="noreferrer" className="truncate flex-1 min-w-[12rem] hover:text-cyan-300" title={r.video.caption}>
                {r.verdict === "error" && r.video.authorName && r.video.authorName !== "unknown"
                  ? `@${r.video.authorName.replace(/^@/, "")} · ${r.link.url}`
                  : r.video.title || r.link.url}
              </a>
              <span className={`text-xs shrink-0 px-1.5 py-0.5 rounded border ${r.campaignId ? "border-cyan-800/60 text-cyan-300" : "border-slate-700 text-fg-subtle"}`}
                title={CAMPAIGN_SOURCE_LABEL[r.campaignSource ?? "none"]}>
                {campaignName(r.campaignId)}
              </span>
              <span className="text-xs text-fg-subtle shrink-0">tab: {r.link.sheet}</span>
              <span className="font-mono text-xs shrink-0 w-24 sm:text-right">{fmt(r.video.views || 0)} views</span>
              {r.verdict === "gugur" && (
                <span className="text-xs text-red-300 shrink-0">
                  {r.typoRejected
                    ? `typo kebanyakan (min 2 hashtag harus persis): ${r.typoHashtags.map((t) => `#${t.found}`).join(" ")}`
                    : r.missingHashtags.length > 0
                      ? `kurang: ${r.missingHashtags.map((t) => `#${t}`).join(" ")}`
                      : "tidak ada hashtag campaign"}
                </span>
              )}
              {r.verdict === "lolos" && r.typoHashtags.length > 0 && (
                <span className="text-xs text-amber-300 shrink-0"
                  title={r.typoHashtags.map((t) => `#${t.found} → #${t.required}`).join(", ")}>
                  typo ditoleransi: {r.typoHashtags.map((t) => `#${t.found}`).join(" ")}
                </span>
              )}
              {r.verdict === "error" && (
                // Baris sendiri supaya judul/link video tidak kepotong
                <div className="w-full pl-6 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-amber-300">{r.video.errorMessage || "gagal dibaca"}</span>
                  <ManualInput r={r} campaigns={campaigns} onSave={onManual} />
                </div>
              )}
              {r.manual && (
                <span className="text-xs text-emerald-300 shrink-0 flex items-center gap-1.5">
                  diisi manual
                  <button type="button" onClick={() => onManual(r.link.key, null)}
                    className="text-fg-subtle hover:text-red-300 underline underline-offset-2">batal</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
