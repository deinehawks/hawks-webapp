import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/asimov-hawks",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
