import { head } from "@vercel/blob";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { SharePayload } from "@/lib/social/types";
import ShareView from "@/components/dashboard/ShareView";
import { Footer } from "@/components/dashboard/SocialIcons";

export const dynamic = "force-dynamic";

async function loadShare(id: string): Promise<SharePayload | null> {
  // Validasi id sederhana
  if (!/^[a-f0-9]{6,32}$/i.test(id)) return null;

  try {
    // Ambil metadata blob publik untuk mendapatkan URL file
    const blobDetails = await head(`shares/${id}.json`);
    if (!blobDetails || !blobDetails.url) return null;

    // Fetch konten JSON langsung dari URL publik
    const res = await fetch(blobDetails.url, { cache: "no-store" });
    if (!res.ok) return null;

    return (await res.json()) as SharePayload;
  } catch {
    return null;
  }
}

function NotFoundView() {
  return (
    <main className="min-h-screen text-slate-100 p-4 md:p-8 font-sans flex flex-col justify-between items-center">
      <div className="max-w-md w-full text-center space-y-4 my-auto">
        <div className="bg-white rounded-xl px-3.5 py-3 shadow-lg shadow-black/30 inline-block">
          <Image
            src="/logo-bolamata.png"
            alt="Bola Mata Currency Clippers Agency"
            width={1048}
            height={136}
            className="h-6 w-auto"
          />
        </div>
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-950/40 border border-amber-900/50 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        </div>
        <h1 className="text-lg font-bold text-white">Link Tidak Ditemukan</h1>
        <p className="text-sm text-slate-400">
          Link share ini tidak valid atau sudah dihapus oleh pembuatnya. Hubungi pengirim link untuk
          mendapatkan link yang baru.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors"
        >
          Ke Halaman Utama
        </Link>
      </div>

      <Footer />
    </main>
  );
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await loadShare(id);

  if (!payload) {
    return <NotFoundView />;
  }

  return <ShareView payload={payload} />;
}