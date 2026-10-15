import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/asimov-hawks",
  devIndicators: false,
  outputFileTracingIncludes: {
    "/*": ["./config/workshop-visibility.json"],
  },
  outputFileTracingExcludes: {
    "/*": ["./workshop-data/**/*"],
  },
  webpack(config, { dev, isServer, nextRuntime }) {
    if (!dev && isServer && nextRuntime === "nodejs") {
      // Next 15 applies outputFileTracingExcludes after Webpack's initial NFT
      // scan. Skip runtime datasets before that scan can glob millions of files.
      const tracer = config.plugins?.find(
        (plugin: { constructor?: { name?: string } } | undefined) =>
          plugin?.constructor?.name === "TraceEntryPointsPlugin",
      );
      if (!tracer || !Array.isArray(tracer.traceIgnores)) {
        throw new Error(
          "Cannot exclude workshop data from the initial tracing scan. Check the Next.js tracing plugin after upgrading Next.js.",
        );
      }
      tracer.traceIgnores.push("**/workshop-data/**");
    }
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
