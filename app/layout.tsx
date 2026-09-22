import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// DESIGN CONTRACT: --font-sans & --font-mono wajib didefinisikan via @theme
// agar utility `font-sans`/`font-mono` Tailwind v4 resolve ke Geist (bukan
// fallback system-ui). Fix bug: font-sans sebelumnya tak terdefinisi → Geist idle.
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Campaign Analytics Dashboard — Bola Mata Currency",
  description:
    "Verifikasi, agregasi, dan analisis performa kampanye TikTok, YouTube & Instagram secara real-time.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0b0f19] text-slate-100`}
      >
        <div className="app-backdrop" aria-hidden="true" />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
