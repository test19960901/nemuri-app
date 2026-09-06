import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true, // ← これを追加
  images: {
    unoptimized: true,
  },
};

export default nextConfig;