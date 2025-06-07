import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    clientSegmentCache: true,
  },
};

export default nextConfig;
