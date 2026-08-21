import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  compiler: {
    styledComponents: true,
  },
  serverExternalPackages: ["@3xhaust/gitdb"],
};

export default nextConfig;
