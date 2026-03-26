import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['pdfjs-dist'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
