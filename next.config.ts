import path from "node:path";

import { withJazz } from "jazz-tools/dev/next";

const useWasmBackend = process.env.VERCEL === "1";

export default withJazz(
  useWasmBackend
    ? {
        outputFileTracingIncludes: {
          "/api/chat": [
            "./node_modules/jazz-wasm/pkg/jazz_wasm_bg.wasm",
            "./node_modules/.pnpm/jazz-wasm@2.0.0-alpha.55/node_modules/jazz-wasm/pkg/jazz_wasm_bg.wasm",
          ],
        },
        turbopack: {
          resolveAlias: {
            "jazz-napi": "./src/lib/jazz-napi-vercel.ts",
          },
        },
        webpack(config: { resolve?: { alias?: Record<string, string> } }) {
          config.resolve ??= {};
          config.resolve.alias = {
            ...config.resolve.alias,
            "jazz-napi": path.resolve("src/lib/jazz-napi-vercel.ts"),
          };
          return config;
        },
      }
    : {},
  {
    server: false,
    adminSecret: process.env.JAZZ_ADMIN_SECRET,
  },
);
