import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel 배포: output/basePath 불필요 (SSR 완전 지원)
  // GitHub Pages 배포 시: output: "export", basePath: "/job-navigator" 추가
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
