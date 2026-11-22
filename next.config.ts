import type { NextConfig } from "next";

const config: NextConfig = {
  distDir: process.env.AYOSDITO_E2E === "1" ? ".next-e2e" : ".next",
  devIndicators: false,
  experimental: { serverActions: { bodySizeLimit: "16mb" } },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
