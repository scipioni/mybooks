import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // better-sqlite3 ships a native addon; keep it external to the server
  // bundle so Next's file tracing copies the actual binary into the
  // standalone build instead of trying to webpack-bundle it.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
