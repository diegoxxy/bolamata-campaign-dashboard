/**
 * BOLAMATA — Clippers Tracker Bridge (Google Apps Script)
 *
 * Jembatan antara folder Drive PRIVAT "CLIPPERS TRACKER" dan dashboard.
 * Script ini jalan sebagai akun Google kamu, jadi folder & file tidak perlu dibuka publik.
 *
 * Pengamanan:
 *  - Setiap request wajib membawa TOKEN rahasia (samakan dengan GOOGLE_APPS_SCRIPT_TOKEN di dashboard).
 *  - Hanya folder di ALLOWED_FOLDER_IDS yang bisa dibaca, dan hanya file yang ada di dalamnya.
 *  - Read-only: script ini tidak pernah mengubah/menghapus file.
 *
 * Endpoint (GET):
 *   ?token=…&action=ping                 → cek koneksi
 *   ?token=…&action=list&folder=<ID>     → daftar file di folder
 *   ?token=…&action=file&id=<ID>         → isi file (.xlsx, base64). Google Sheets di-export ke .xlsx
 */

// 1) Ganti dengan token dari file .env.local dashboard (GOOGLE_APPS_SCRIPT_TOKEN).
const TOKEN = 'TEMPEL_TOKEN_DARI_ENV_LOCAL';

// 2) ID folder yang boleh dibaca. Default: folder CLIPPERS TRACKER.
//    Ambil dari link folder: https://drive.google.com/drive/folders/<ID_INI>
const ALLOWED_FOLDER_IDS = ['1bxM98yJ7ZiXuUytcYUr3n-DP34Pswntc'];

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    if (!TOKEN || TOKEN.indexOf('TEMPEL_') === 0) {
      return json_({ error: 'TOKEN di Apps Script belum diganti.', code: 'NO_TOKEN' });
    }
    if (p.token !== TOKEN) return json_({ error: 'Token salah.', code: 'BAD_TOKEN' });

    if (p.action === 'ping') return json_({ ok: true, folders: ALLOWED_FOLDER_IDS });
    if (p.action === 'list') return json_(listFolder_(p.folder));
    if (p.action === 'file') return json_(getFile_(p.id));
    return json_({ error: 'action tidak dikenal.', code: 'BAD_ACTION' });
  } catch (err) {
    return json_({ error: String((err && err.message) || err), code: 'SCRIPT_ERROR' });
  }
}

function assertAllowedFolder_(folderId) {
  if (ALLOWED_FOLDER_IDS.indexOf(folderId) === -1) {
    throw new Error('Folder ini tidak diizinkan di Apps Script (ALLOWED_FOLDER_IDS): ' + folderId);
  }
}

function listFolder_(folderId) {
  assertAllowedFolder_(folderId);
  const it = DriveApp.getFolderById(folderId).getFiles();
  const files = [];
  while (it.hasNext()) {
    const f = it.next();
    if (f.isTrashed()) continue;
    files.push({
      id: f.getId(),
      name: f.getName(),
      mimeType: f.getMimeType(),
      modifiedTime: f.getLastUpdated().toISOString(),
    });
  }
  return { folderId: folderId, files: files };
}

function getFile_(id) {
  const f = DriveApp.getFileById(id);

  // Cuma file yang ada di folder tracker yang boleh diambil.
  let allowed = false;
  const parents = f.getParents();
  while (parents.hasNext()) {
    if (ALLOWED_FOLDER_IDS.indexOf(parents.next().getId()) !== -1) allowed = true;
  }
  if (!allowed) throw new Error('File ini bukan bagian dari folder tracker.');

  let blob;
  let mime = f.getMimeType();
  if (mime === MimeType.GOOGLE_SHEETS) {
    const url = 'https://docs.google.com/spreadsheets/d/' + id + '/export?format=xlsx';
    const res = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() !== 200) throw new Error('Export Google Sheets gagal (HTTP ' + res.getResponseCode() + ').');
    blob = res.getBlob();
    mime = XLSX_MIME;
  } else {
    blob = f.getBlob();
  }

  return {
    id: id,
    name: f.getName(),
    mimeType: mime,
    modifiedTime: f.getLastUpdated().toISOString(),
    data: Utilities.base64Encode(blob.getBytes()),
  };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Jalankan sekali dari editor (tombol Run) untuk memberi izin akses Drive & cek folder terbaca. */
function testAkses() {
  const r = listFolder_(ALLOWED_FOLDER_IDS[0]);
  Logger.log('Terbaca ' + r.files.length + ' file. Contoh: ' + (r.files[0] ? r.files[0].name : '-'));
}
