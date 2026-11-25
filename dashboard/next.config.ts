import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: { appIsrStatus: false, buildActivity: false },
  // A separate output folder lets a public test build (CG_PUBLIC=1) run beside the dev server.
  distDir: process.env.CG_DIST || ".next",
};

export default nextConfig;
