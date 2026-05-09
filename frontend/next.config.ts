// frontend/next.config.ts
// Abilita immagini esterne da Unsplash (usate nei mock data Tokyo)
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
