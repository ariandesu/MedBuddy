import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera for photographing papers, microphone for voice questions.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()" },
];

// Production only: `next dev` needs eval and a websocket. 'unsafe-inline' is for the
// inline scripts and styles Next renders. jsDelivr serves tesseract.js's worker,
// WASM core and language data; 'wasm-unsafe-eval' and blob: workers run them.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",
  "worker-src 'self' blob:",
  "connect-src 'self' https://cdn.jsdelivr.net",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  /* MediSathi: force-dynamic per page (request-time demo mode), incompatible with cacheComponents */
  cacheComponents: false,
  // Don't auto-append agent rules to AGENTS.md on `next dev`.
  agentRules: false,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // Pages only: uploaded PDFs open in the browser's viewer from /api.
      ...(process.env.NODE_ENV === "production"
        ? [{ source: "/((?!api/).*)", headers: [{ key: "Content-Security-Policy", value: CSP }] }]
        : []),
    ];
  },
  // Old pages were merged into /records and /show-doctor; keep old links working.
  async redirects() {
    return [
      { source: "/documents", destination: "/records", permanent: false },
      { source: "/timeline", destination: "/records?tab=timeline", permanent: false },
      { source: "/summary", destination: "/show-doctor?tab=summary", permanent: false },
      { source: "/report", destination: "/show-doctor", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
