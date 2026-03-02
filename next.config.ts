import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "jazz-tools",
    "jazz-napi",
    "jazz-napi-darwin-arm64",
    "jazz-napi-darwin-x64",
    "jazz-napi-linux-x64-gnu",
    "jazz-napi-win32-x64-msvc",
  ],
};

export default nextConfig;
