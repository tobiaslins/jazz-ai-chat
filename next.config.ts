import type { NextConfig } from "next";

const webpack = require("webpack") as {
  NormalModuleReplacementPlugin: new (
    resourceRegExp: RegExp,
    newResource: (resource: { request: string }) => void
  ) => unknown;
};

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "jazz-tools",
    "jazz-napi",
    "jazz-napi-darwin-arm64",
    "jazz-napi-darwin-x64",
    "jazz-napi-linux-x64-gnu",
    "jazz-napi-win32-x64-msvc",
  ],
  // webpack: (config, { isServer }) => {
  //   config.plugins = config.plugins ?? [];
  //   config.plugins.push(
  //     new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
  //       resource.request = resource.request.replace(/^node:/, "");
  //     })
  //   );

  //   if (!isServer) {
  //     config.resolve = config.resolve ?? {};
  //     config.resolve.fallback = {
  //       ...(config.resolve.fallback ?? {}),
  //       fs: false,
  //       module: false,
  //       path: false,
  //     };
  //     config.resolve.alias = {
  //       ...(config.resolve.alias ?? {}),
  //       "node:fs": false,
  //       "node:module": false,
  //       "node:path": false,
  //     };
  //   }

  //   if (isServer) {
  //     config.resolve = config.resolve ?? {};
  //     config.resolve.symlinks = false;
  //   }
  //   return config;
  // },
};

export default nextConfig;
