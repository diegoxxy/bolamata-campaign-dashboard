/**
 * DEMO Clippers Tracker — logika murni (tanpa React), biar gampang dipindah ke dashboard utama.
 *
 * Alur: file tracker (1 file = 1 clipper) → semua tab, semua link di sel mana pun → di-scan
 * → tiap video masuk ke 1 campaign (dari nama tab, atau ditebak dari hashtag caption)
 * → caption dicek: SEMUA hashtag wajib campaign itu harus ada → rekap per campaign, per clipper & per akun.
 */
import * as XLSX from "xlsx";
import type { VideoItem } from "@/lib/social/types";
import { inputUrlKey, videoKeyFromUrl } from "@/lib/social/dedupe";

/** Satu campaign + hashtag wajibnya. Tab tracker yang namanya mengandung `name` otomatis masuk campaign ini. */
export interface Campaign {
  id: string;
  name: string;
  hashtags: string[]; // tanpa '#', huruf kecil
}

export interface TrackerLink {
  url: string;
  key: string; // kunci unik video (ID video kalau kelihatan dari link)
  clipper: string; // nama file tanpa ekstensi
  sheet: string; // nama tab asal
  sheetCampaignId: string | null; // campaign dari nama tab (mis. tab "BERTAMU"), null kalau tab umum
  fileCampaignId?: string | null; // campaign dari NAMA FILE (mis. "[Nama - BERtamu Project]"), cuma buat tebakan video gagal
}

export interface SheetInfo {
  name: string;
  used: boolean; // false = dilewati manual
  linkCount: number;
  campaignId: string | null;
}

export interface TrackerFile {
  clipper: string; // nama file (tab "Clipper NN" jadi clipper sendiri di TrackerLink)
  fileName: string;
  sheets: SheetInfo[];
  links: TrackerLink[];
}

/** Video hasil scan + caption lengkap (TikTok: title, YouTube: judul + deskripsi, IG: caption). */
export interface ScannedVideo extends VideoItem {
  caption: string;
}

export type Verdict = "lolos" | "gugur" | "error";

export interface EvaluatedVideo {
  link: TrackerLink;
  video: ScannedVideo;
  verdict: Verdict;
  missingHashtags: string[];
  /** Hashtag wajib yang ditulis typo tapi tetap dihitung (lolos). */
  typoHashtags: { required: string; found: string }[];
  /** true = ada typo tapi hashtag yang persis benar kurang dari 2 → gugur. */
  typoRejected: boolean;
  /** Campaign video ini; null = tidak cocok campaign mana pun. */
  campaignId: string | null;
  /** "tab" = dari nama tab tracker, "hashtag" = ditebak dari caption, "manual" = diisi admin. */
  campaignSource: "tab" | "hashtag" | "manual" | "akun" | "clipper" | null;
  /** true = video tidak bisa dibaca otomatis, views & status diisi manual oleh admin. */
  manual?: boolean;
}

const MEDIA_URL_RE =
  /https?:\/\/(?:[a-z0-9-]+\.)*(?:tiktok\.com|youtube\.com|youtu\.be|instagram\.com)\/[^\s"'<>,;)]+/gi;

export function normalizeKeyword(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/** "#BertamuBernadya  #BertamuSpecial, bolamatabernadya" → ["bertamubernadya", "bertamuspecial", "bolamatabernadya"] */
export function parseRequiredHashtags(input: string): string[] {
  const tags = input
    .split(/[\s,;]+/)
    .map((t) => t.replace(/^#+/, "").toLowerCase().trim())
    .filter(Boolean);
  return Array.from(new Set(tags));
}

export function extractHashtags(caption: string): Set<string> {
  const out = new Set<string>();
  for (const m of caption.matchAll(/#([\p{L}\p{N}_]+)/gu)) out.add(m[1].toLowerCase());
  return out;
}

/** Jarak edit (Levenshtein): berapa huruf yang beda/kurang/lebih. */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Toleransi typo: hashtag panjang (≥8 huruf) boleh beda 2 huruf, sedang (5–7) 1 huruf, pendek harus persis. */
function typoLimit(tag: string): number {
  return tag.length >= 8 ? 2 : tag.length >= 5 ? 1 : 0;
}

export interface HashtagMatch {
  missing: string[];
  /** Hashtag wajib yang ketemu tapi typo: { required: "bertamubernadya", found: "bertamubaernadya" } */
  typos: { required: string; found: string }[];
}

/** Cek hashtag wajib di caption. Typo kecil (mis. #bertamubaernadya) tetap dihitung ada, tapi dicatat. */
export function matchHashtags(caption: string, required: string[]): HashtagMatch {
  const have = extractHashtags(caption);
  const requiredSet = new Set(required);
  const used = new Set<string>();
  const missing: string[] = [];
  const typos: HashtagMatch["typos"] = [];

  for (const t of required) {
    if (have.has(t)) continue;
    const limit = typoLimit(t);
    let best: { tag: string; d: number } | null = null;
    if (limit > 0) {
      for (const h of have) {
        // Hashtag yang persis sama dengan hashtag wajib LAIN tidak boleh dipakai sebagai "typo"
        if (requiredSet.has(h) || used.has(h)) continue;
        const d = editDistance(t, h);
        if (d <= limit && (!best || d < best.d)) best = { tag: h, d };
      }
    }
    if (best) {
      used.add(best.tag);
      typos.push({ required: t, found: best.tag });
    } else {
      missing.push(t);
    }
  }
  return { missing, typos };
}

export function missingHashtagsIn(caption: string, required: string[]): string[] {
  return matchHashtags(caption, required).missing;
}

function cleanUrl(raw: string): string {
  return raw.trim().replace(/[.\])}]+$/, "");
}

/** Cuma link VIDEO (bukan link profil/channel). Short link TikTok (vt/vm/t) ikut, ID-nya di-resolve server. */
export function isVideoUrl(url: string): boolean {
  if (videoKeyFromUrl(url)) return true;
  return /^https?:\/\/(?:vt|vm)\.tiktok\.com\/\w+|tiktok\.com\/t\/\w+/i.test(url);
}

/**
 * Nama clipper dari nama file tracker. Variasi yang ada di folder Drive:
 * "Wiwid Wijaksana  - Clipper Tracker", "ulin aldan - Clippers Tracker", "DIEGO - CLIPPER TRACKER",
 * "Fatma Aulia - BERtamu Project", "[Marapthon_thelast - BERtamu Project]", "Muhammad fawaz daffa - BERtamu".
 */
export function clipperNameFromFile(fileName: string): string {
  const name = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/^\s*\[|\]\s*$/g, "")
    .replace(/\s*[-–—]\s*(?:clippers?\s*tracker|bertamu(?:\s*project)?)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return name || fileName;
}

/** Campaign yang namanya terkandung di nama tab ("BERTAMU", "akun2 - Bertamu", "INFIA") — yang namanya terpanjang menang. */
export function campaignForSheet(sheetName: string, campaigns: Campaign[]): Campaign | null {
  const s = normalizeKeyword(sheetName);
  let best: Campaign | null = null;
  for (const c of campaigns) {
    const n = normalizeKeyword(c.name);
    if (n && s.includes(n) && (!best || n.length > normalizeKeyword(best.name).length)) best = c;
  }
  return best;
}

/**
 * Baca 1 file tracker: semua tab (kecuali yang dilewati manual), semua link video di sel mana pun
 * (termasuk hyperlink). Clipper = nama file; kalau file berisi banyak tab "Clipper NN", tiap tab = clipper sendiri.
 * `overrides`: pilihan manual per tab (true = baca, false = lewati).
 */
export function parseTrackerWorkbook(
  data: ArrayBuffer,
  fileName: string,
  campaigns: Campaign[],
  overrides: Record<string, boolean> = {}
): TrackerFile {
  // 1 file = 1 clipper. Nama tab ("Clipper 01", "Clipper 02", ...) cuma penamaan sheet, bukan orang beda.
  const clipper = clipperNameFromFile(fileName);
  const wb = XLSX.read(data, { type: "array" });

  const sheets: SheetInfo[] = [];
  const links: TrackerLink[] = [];
  const seenInFile = new Set<string>();

  for (const name of wb.SheetNames) {
    const used = overrides[name] ?? true;
    const sheetCampaignId = campaignForSheet(name, campaigns)?.id ?? null;
    let linkCount = 0;

    if (used) {
      const ws = wb.Sheets[name];
      for (const addr of Object.keys(ws)) {
        if (addr.startsWith("!")) continue;
        const cell = ws[addr] as XLSX.CellObject;
        // Teks sel + target hyperlink (sel yang tampil "link" tapi isinya hyperlink)
        const texts = [cell.v != null ? String(cell.v) : "", cell.l?.Target ?? ""];
        for (const text of texts) {
          for (const m of text.matchAll(MEDIA_URL_RE)) {
            const url = cleanUrl(m[0]);
            if (!isVideoUrl(url)) continue;
            const key = inputUrlKey(url);
            if (seenInFile.has(key)) continue;
            seenInFile.add(key);
            links.push({ url, key, clipper, sheet: name, sheetCampaignId });
            linkCount++;
          }
        }
      }
    }
    sheets.push({ name, used, linkCount, campaignId: sheetCampaignId });
  }

  return { clipper, fileName, sheets, links };
}

/** Gabung link semua file; link yang sama disetor 2 clipper → yang pertama dipakai, sisanya ditandai duplikat. */
export function collectLinks(files: TrackerFile[]): {
  unique: TrackerLink[];
  duplicates: { link: TrackerLink; ownerClipper: string }[];
} {
  const owner = new Map<string, string>();
  const unique: TrackerLink[] = [];
  const duplicates: { link: TrackerLink; ownerClipper: string }[] = [];
  for (const f of files) {
    for (const l of f.links) {
      const o = owner.get(l.key);
      if (o === undefined) {
        owner.set(l.key, l.clipper);
        unique.push(l);
      } else if (o !== l.clipper) {
        duplicates.push({ link: l, ownerClipper: o });
      }
    }
  }
  return { unique, duplicates };
}

/**
 * Tentukan campaign + lolos/gugur satu video.
 * - Tab tracker bernama campaign (mis. "BERTAMU") → campaign itu, hashtag-nya wajib lengkap.
 * - Tab umum ("Clipper 01") → campaign ditebak dari caption: yang hashtag wajibnya paling banyak terpenuhi.
 *   Kalau tidak ada satu pun hashtag campaign di caption → "tanpa campaign" (gugur).
 */
export function evaluate(link: TrackerLink, video: ScannedVideo, campaigns: Campaign[]): EvaluatedVideo {
  const fromTab = link.sheetCampaignId ? campaigns.find((c) => c.id === link.sheetCampaignId) : undefined;

  if (video.status === "error") {
    return {
      link, video, verdict: "error", missingHashtags: [], typoHashtags: [], typoRejected: false,
      campaignId: fromTab?.id ?? null, campaignSource: fromTab ? "tab" : null,
    };
  }

  const caption = video.caption || video.title || "";
  if (fromTab) {
    return judge(link, video, fromTab, matchHashtags(caption, fromTab.hashtags), "tab");
  }

  let best: { c: Campaign; m: HashtagMatch } | null = null;
  for (const c of campaigns) {
    if (c.hashtags.length === 0) continue;
    const m = matchHashtags(caption, c.hashtags);
    if (m.missing.length === c.hashtags.length) continue; // tidak ada satu pun hashtag campaign ini
    if (!best || m.missing.length < best.m.missing.length) best = { c, m };
  }
  if (!best) {
    return {
      link, video, verdict: "gugur", missingHashtags: [], typoHashtags: [], typoRejected: false,
      campaignId: null, campaignSource: null,
    };
  }
  return judge(link, video, best.c, best.m, "hashtag");
}

/** Minimal hashtag wajib yang harus ditulis PERSIS supaya typo di hashtag lain masih ditoleransi. */
export const MIN_EXACT_FOR_TYPO = 2;

function judge(
  link: TrackerLink,
  video: ScannedVideo,
  c: Campaign,
  m: HashtagMatch,
  source: "tab" | "hashtag"
): EvaluatedVideo {
  const exact = c.hashtags.length - m.missing.length - m.typos.length;
  // Typo ditoleransi cuma kalau minimal 2 hashtag wajib ditulis persis (atau semua, kalau wajibnya < 2).
  const typoRejected = m.typos.length > 0 && exact < Math.min(MIN_EXACT_FOR_TYPO, c.hashtags.length);
  const missing = typoRejected ? [...m.missing, ...m.typos.map((t) => t.required)] : m.missing;
  return {
    link, video,
    verdict: missing.length === 0 ? "lolos" : "gugur",
    missingHashtags: missing,
    typoHashtags: m.typos,
    typoRejected,
    campaignId: c.id,
    campaignSource: source,
  };
}

/**
 * Video yang gagal dibaca (tidak ada caption) dan tidak punya campaign dari nama tab → tebak campaign-nya:
 * 1) dari video lain di AKUN yang sama (campaign terbanyak), kalau tidak ada
 * 2) dari campaign terbanyak CLIPPER itu.
 */
export function inferUnknownCampaigns(results: EvaluatedVideo[]): EvaluatedVideo[] {
  const tally = (key: (r: EvaluatedVideo) => string | null) => {
    const m = new Map<string, Map<string, number>>();
    for (const r of results) {
      const k = key(r);
      if (!k || !r.campaignId) continue;
      const inner = m.get(k) ?? new Map<string, number>();
      inner.set(r.campaignId, (inner.get(r.campaignId) ?? 0) + 1);
      m.set(k, inner);
    }
    return (k: string | null) => {
      const inner = k ? m.get(k) : undefined;
      if (!inner) return null;
      return [...inner.entries()].sort((a, b) => b[1] - a[1])[0][0];
    };
  };
  const accountKey = (r: EvaluatedVideo) => {
    const a = (r.video.authorName || "").replace(/^@/, "").toLowerCase();
    return a && a !== "unknown" ? `${r.video.platform}:${a}` : null;
  };
  const byAccount = tally(accountKey);
  const byClipper = tally((r) => r.link.clipper);

  return results.map((r) => {
    if (r.campaignId || r.verdict !== "error") return r;
    const fromAccount = byAccount(accountKey(r));
    if (fromAccount) return { ...r, campaignId: fromAccount, campaignSource: "akun" };
    const fromClipper = byClipper(r.link.clipper);
    if (fromClipper) return { ...r, campaignId: fromClipper, campaignSource: "clipper" };
    if (r.link.fileCampaignId) return { ...r, campaignId: r.link.fileCampaignId, campaignSource: "clipper" };
    return r;
  });
}

export interface AccountSummary {
  platform: VideoItem["platform"];
  account: string;
  views: number; // views video LOLOS saja
  lolos: number;
  gugur: number;
  error: number;
}

export interface ClipperSummary {
  clipper: string;
  views: number;
  lolos: number;
  gugur: number;
  error: number;
  duplikat: number;
  accounts: AccountSummary[];
  videos: EvaluatedVideo[];
}

export function summarize(
  results: EvaluatedVideo[],
  duplicates: { link: TrackerLink; ownerClipper: string }[],
  clipperOrder: string[]
): ClipperSummary[] {
  const map = new Map<string, ClipperSummary>();
  const get = (c: string) => {
    let s = map.get(c);
    if (!s) {
      s = { clipper: c, views: 0, lolos: 0, gugur: 0, error: 0, duplikat: 0, accounts: [], videos: [] };
      map.set(c, s);
    }
    return s;
  };
  clipperOrder.forEach(get);

  for (const r of results) {
    const s = get(r.link.clipper);
    s.videos.push(r);
    s[r.verdict]++;
    if (r.verdict === "lolos") s.views += r.video.views || 0;

    const account =
      r.verdict === "error" && (!r.video.authorName || r.video.authorName === "unknown")
        ? "(gagal dibaca)"
        : (r.video.authorName || "unknown").replace(/^@/, "");
    let acc = s.accounts.find((a) => a.account === account && a.platform === r.video.platform);
    if (!acc) {
      acc = { platform: r.video.platform, account, views: 0, lolos: 0, gugur: 0, error: 0 };
      s.accounts.push(acc);
    }
    acc[r.verdict]++;
    if (r.verdict === "lolos") acc.views += r.video.views || 0;
  }
  for (const d of duplicates) get(d.link.clipper).duplikat++;

  const out = Array.from(map.values());
  out.forEach((s) => {
    s.accounts.sort((a, b) => b.views - a.views);
    s.videos.sort((a, b) => (b.video.views || 0) - (a.video.views || 0));
  });
  return out.sort((a, b) => b.views - a.views);
}
