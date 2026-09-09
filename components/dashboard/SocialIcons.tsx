import React from "react";

export function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} fill-current`} viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

export function DiscordIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} fill-current`} viewBox="0 0 127.14 96.36">
      <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.68 1.76 1.36 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.91-72.15ZM42.45 65.69c-6.32 0-11.53-5.8-11.53-12.89s5.09-12.89 11.53-12.89c6.48 0 11.65 5.86 11.53 12.89 0 7.09-5.08 12.89-11.53 12.89Zm42.24 0c-6.32 0-11.53-5.8-11.53-12.89s5.09-12.89 11.53-12.89c6.48 0 11.65 5.86 11.53 12.89 0 7.09-5.05 12.89-11.53 12.89Z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="max-w-7xl mx-auto w-full mt-12 pt-6 border-t border-[#1e293b] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
      <p>© 2026 BolaMata Currency. All rights reserved.</p>
      <div className="flex items-center gap-4">
        <a
          href="https://www.instagram.com/bolamatacurrency/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-pink-400 transition-colors"
        >
          <InstagramIcon className="w-4 h-4" />
          <span>Instagram</span>
        </a>
        <a
          href="https://discord.gg/bolamatacurrency"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-indigo-400 transition-colors"
        >
          <DiscordIcon className="w-4 h-4" />
          <span>Discord</span>
        </a>
      </div>
    </footer>
  );
}