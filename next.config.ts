import type { NextConfig } from "next";

const dev = process.env.NODE_ENV === "development";

// Content Security Policy: the browser only runs scripts, styles, images and fonts from this site.
// 'unsafe-inline' is needed for Next's inline bootstrap scripts and the site's inline styles; 'unsafe-eval'
// and ws: only in dev (hot reload). Vercel Analytics is served from this site in production.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${dev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  // All images are this site's own files (public/images), so no remote image hosts are allowed.
  images: {
    qualities: [25, 50, 75, 100],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  // The admin is local-only. In production, send /admin to a path that doesn't exist, before the
  // real page is matched, so it answers with a true 404 status (the page alone can only render the 404 UI).
  async rewrites() {
    if (process.env.NODE_ENV !== "production") return [];
    return { beforeFiles: [{ source: "/admin/:path*", destination: "/__admin-disabled" }], afterFiles: [], fallback: [] };
  },
};

export default nextConfig;
