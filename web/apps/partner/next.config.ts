import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@indica/ui", "@indica/api-client"],
};

export default nextConfig;
