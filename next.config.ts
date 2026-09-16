import { withJazz } from "jazz-tools/dev/next";

export default withJazz(
  {
    outputFileTracingIncludes: {
      "/api/chat": [
        "./node_modules/jazz-napi/jazz-napi.linux-x64-gnu.node",
        "./node_modules/.pnpm/jazz-napi@2.0.0-alpha.55/node_modules/jazz-napi/jazz-napi.linux-x64-gnu.node",
      ],
    },
  },
  {
    server: false,
    adminSecret: process.env.JAZZ_ADMIN_SECRET,
  },
);
