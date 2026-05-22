import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.API_BASE_URL ?? "http://localhost:8000"}/api/v1/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${process.env.API_BASE_URL ?? "http://localhost:8000"}/uploads/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [{ hostname: "localhost" }],
  },
};

export default nextConfig;
