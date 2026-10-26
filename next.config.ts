import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: "https://nara.trivox.id/api/:path*",
      },
      {
        source: "/backend-storage/:path*",
        destination: "https://nara.trivox.id/storage/:path*",
      },
    ];
  },
  devIndicators: false,
};

export default nextConfig;
