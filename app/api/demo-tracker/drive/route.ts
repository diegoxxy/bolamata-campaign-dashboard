import { NextResponse } from "next/server";

/**
 * DEMO: baca folder Google Drive PRIVAT lewat Google Apps Script (scripts/apps-script/ClippersTrackerBridge.gs).
 * Script jalan sebagai akun admin, jadi folder tidak perlu dibuka publik & tidak butuh Google Cloud.
 *
 * Env:
 *   GOOGLE_APPS_SCRIPT_URL    = URL web app hasil Deploy (…/macros/s/…/exec)
 *   GOOGLE_APPS_SCRIPT_TOKEN  = token rahasia, harus sama dengan TOKEN di script
 *
 *   GET ?status=1                        → sudah terpasang atau belum (+ ping ke script)
 *   GET ?folder=<link atau ID folder>   → daftar file tracker
 *   GET ?file=<ID>                       → isi file sebagai .xlsx
 */
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const GSHEET_MIME = "application/vnd.google-apps.spreadsheet";
const ALLOWED_MIMES = new Set([
  GSHEET_MIME,
  XLSX_MIME,
  "application/vnd.ms-excel",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
  "text/csv",
]);
const ID_RE = /^[A-Za-z0-9_-]{10,}$/;

interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

interface ScriptResponse {
  error?: string;
  code?: string;
  ok?: boolean;
  files?: DriveFileInfo[];
  data?: string;
  mimeType?: string;
}

/** Terima link folder ("drive.google.com/drive/folders/<id>?usp=...") atau ID mentah. */
function parseFolderId(input: string): string | null {
  const s = input.trim();
  const m = s.match(/folders\/([A-Za-z0-9_-]+)/) || s.match(/[?&]id=([A-Za-z0-9_-]+)/);
  const id = m ? m[1] : s;
  return ID_RE.test(id) ? id : null;
}

function config() {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL?.trim();
  const token = process.env.GOOGLE_APPS_SCRIPT_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

/** Panggil web app Apps Script. Error dari script selalu dikirim sebagai JSON {error}. */
async function callScript(params: Record<string, string>): Promise<ScriptResponse> {
  const cfg = config();
  if (!cfg) throw new Error("NOT_CONFIGURED");
  const url = new URL(cfg.url);
  url.searchParams.set("token", cfg.token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  // Apps Script membalas lewat redirect ke googleusercontent.com — fetch mengikutinya otomatis.
  const res = await fetch(url, { cache: "no-store", redirect: "follow" });
  const text = await res.text();
  try {
    return JSON.parse(text) as ScriptResponse;
  } catch {
    // Biasanya halaman login Google = deploy belum diset "Who has access: Anyone"
    if (/accounts\.google\.com|ServiceLogin|<html/i.test(text)) {
      return {
        error:
          "Apps Script minta login. Deploy ulang web app dengan 'Execute as: Me' dan 'Who has access: Anyone'.",
        code: "NEEDS_LOGIN",
      };
    }
    return { error: `Balasan Apps Script tidak terbaca (HTTP ${res.status}).`, code: "BAD_RESPONSE" };
  }
}

const NOT_CONFIGURED_MSG =
  "Apps Script belum dipasang. Isi GOOGLE_APPS_SCRIPT_URL dan GOOGLE_APPS_SCRIPT_TOKEN di .env.local (lokal) atau Vercel → Environment Variables, lalu restart server.";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  try {
    if (params.get("status")) {
      if (!config()) return NextResponse.json({ configured: false, error: NOT_CONFIGURED_MSG });
      const ping = await callScript({ action: "ping" });
      return NextResponse.json(
        { configured: true, ok: !!ping.ok, error: ping.error ?? null },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!config()) return NextResponse.json({ error: NOT_CONFIGURED_MSG, code: "NOT_CONFIGURED" }, { status: 500 });

    // 1) Daftar file di folder
    const folderInput = params.get("folder");
    if (folderInput) {
      const folderId = parseFolderId(folderInput);
      if (!folderId) return NextResponse.json({ error: "Link/ID folder tidak valid." }, { status: 400 });

      const r = await callScript({ action: "list", folder: folderId });
      if (r.error) return NextResponse.json({ error: r.error, code: r.code }, { status: 502 });

      const all = r.files ?? [];
      const files = all
        .filter((f) => ALLOWED_MIMES.has(f.mimeType))
        .sort((a, b) => a.name.localeCompare(b.name, "id"));
      return NextResponse.json(
        { folderId, files, skipped: all.length - files.length },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // 2) Isi satu file
    const fileId = params.get("file");
    if (fileId) {
      if (!ID_RE.test(fileId)) return NextResponse.json({ error: "ID file tidak valid." }, { status: 400 });
      const r = await callScript({ action: "file", id: fileId });
      if (r.error || !r.data) {
        return NextResponse.json({ error: r.error || "File kosong.", code: r.code }, { status: 502 });
      }
      return new Response(Buffer.from(r.data, "base64"), {
        headers: { "Content-Type": r.mimeType || XLSX_MIME, "Cache-Control": "no-store" },
      });
    }

    return NextResponse.json({ error: "Butuh parameter ?folder= atau ?file=" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghubungi Apps Script" },
      { status: 502 }
    );
  }
}
