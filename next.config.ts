import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Abaikan error TypeScript saat proses build di Vercel
    ignoreBuildErrors: true,
  },
};

export default nextConfig;