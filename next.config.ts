import type { NextConfig } from "next";
import { getSiteUrl } from "./lib/site";

// SPEC section 7. Referrer-Policy must stay strict-origin-when-cross-origin:
// YouTube embeds fail with Error 153 when no referrer is sent.
const securityHeaders = [
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Inlined into server and browser code at build time, so every generated clip link uses the
  // production origin. Preview builds get it too: VERCEL_PROJECT_PRODUCTION_URL is always production.
  env: {
    NEXT_PUBLIC_SITE_URL: getSiteUrl(),
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // The browser must always fetch the latest worker, never a cached copy.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
