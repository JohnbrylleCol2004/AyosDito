import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const developmentTunnel = "xj7hfvk5-3000.asse.devtunnels.ms";

const config = (phase: string): NextConfig => ({
  allowedDevOrigins: ["192.168.56.1", "192.168.1.4", developmentTunnel],
  distDir: process.env.AYOSDITO_E2E === "1" ? ".next-e2e" : ".next",
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
      // VS Code port forwarding can retain the tunnel host on localhost requests.
      // These explicit exceptions apply only to the development server.
      ...(phase === PHASE_DEVELOPMENT_SERVER
        ? { allowedOrigins: ["localhost:3000", developmentTunnel] }
        : {}),
    },
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/offline.html",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
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
});
export default config;
