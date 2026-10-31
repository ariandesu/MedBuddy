import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* MediSathi: force-dynamic per page (request-time demo mode), incompatible with cacheComponents */
  cacheComponents: false,
  // Don't auto-append agent rules to AGENTS.md on `next dev`.
  agentRules: false,
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
