import { head } from "@vercel/blob";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { SharePayload } from "@/lib/social/types";
import ShareView from "@/components/dashboard/ShareView";
import { Footer } from "@/components/dashboard/SocialIcons";

export const dynamic = "force-dynamic";

async function loadShare(id: string): Promise<SharePayload | null> {
  if (!/^[a-f0-9]{6,32}$/i.test(id)) return null;

  try {
    const blobDetails = await head(`shares/${id}.json`);
    if (!blobDetails || !blobDetails.url) return null;

    const res = await fetch(blobDetails.url, { cache: "no-store" });
    if (!res.ok) return null;

    return (await res.json()) as SharePayload;
  } catch {
    return null;
  }
}

function NotFoundView() {
  return (
    <main className="min-h-screen text-slate-100 p-3 sm:p-6 md:p-8 font-sans flex flex-col justify-between items-center overflow-x-hidden">
      <div className="max-w-md w-full text-center space-y-4 my-auto px-2">
        <div className="bg-white rounded-xl px-3.5 py-3 shadow-lg shadow-black/30 inline-block">
          <Image
            src="/logo-bolamata.png"
            alt="Bola Mata Currency Clippers Agency"
            width={1048}
            height={136}
            className="h-5 sm:h-6 w-auto object-contain"
          />
        </div>
        <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-950/40 border border-amber-900/50 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
        </div>
        <h1 className="text-base sm:text-lg font-bold text-white">Link Tidak Ditemukan</h1>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          Link share ini tidak valid atau sudah dihapus oleh pembuatnya. Hubungi pengirim link untuk
          mendapatkan link yang baru.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors"
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

  return (
    <main className="min-h-screen text-slate-100 p-3 sm:p-6 md:p-8 font-sans flex flex-col justify-between overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full">
        <ShareView payload={payload} />
      </div>
      <Footer />
    </main>
  );
}