import { withJazz } from "jazz-tools/dev/next";


export default withJazz(
  {
    outputFileTracingIncludes: {
      "/api/chat": [
        "./node_modules/@garden-co/jazz-napi-linux-x64-gnu/**/*",
        "./node_modules/.pnpm/@garden-co+jazz-napi-linux-x64-gnu@2.0.0-alpha.55/node_modules/@garden-co/jazz-napi-linux-x64-gnu/**/*",
      ],
    },
    outputFileTracingExcludes: {
      "/api/chat": [
        "./node_modules/.pnpm/jazz-napi@2.0.0-alpha.55/node_modules/jazz-napi/jazz-napi.darwin-*.node",
        "./node_modules/.pnpm/jazz-napi@2.0.0-alpha.55/node_modules/jazz-napi/jazz-napi.win32-*.node",
        "./node_modules/jazz-napi/jazz-napi.darwin-*.node",
        "./node_modules/jazz-napi/jazz-napi.win32-*.node",
      ],
    },
  },
  {
    server: false,
    adminSecret: process.env.JAZZ_ADMIN_SECRET
  },
);
