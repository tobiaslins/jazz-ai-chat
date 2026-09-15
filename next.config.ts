import { withJazz } from "jazz-tools/dev/next";


export default withJazz(
  {
    outputFileTracingIncludes: {
      "/api/chat": [
        "./node_modules/@garden-co/jazz-napi-linux-x64-gnu/**/*",
        "./node_modules/.pnpm/@garden-co+jazz-napi-linux-x64-gnu@2.0.0-alpha.54/node_modules/@garden-co/jazz-napi-linux-x64-gnu/**/*",
      ],
    },
  },
  {
    server: false,
    adminSecret: process.env.JAZZ_ADMIN_SECRET
  },
);
