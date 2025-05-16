import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/asimov-hawks",
  devIndicators: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
