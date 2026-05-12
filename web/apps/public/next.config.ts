import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@indica/ui", "@indica/tracking"],
  // Landings públicas devem ser ISR para SEO
  // Sem dependências que quebrem edge runtime
  experimental: {},
};

export default nextConfig;
