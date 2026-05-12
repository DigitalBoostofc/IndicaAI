import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@indica/ui", "@indica/api-client", "recharts"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
