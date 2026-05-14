import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingIncludes: {
    "/api/**/*": ["./prisma/dev.db"],
    "/dashboard/**/*": ["./prisma/dev.db"],
    "/login": ["./prisma/dev.db"],
    "/register": ["./prisma/dev.db"],
    "/admin/**/*": ["./prisma/dev.db"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.rumahotp.io" },
      { protocol: "https", hostname: "app.pakasir.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/api/webhooks/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
