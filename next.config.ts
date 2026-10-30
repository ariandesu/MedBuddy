import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* MediSathi: force-dynamic per page (request-time demo mode), incompatible with cacheComponents */
  cacheComponents: false,
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
