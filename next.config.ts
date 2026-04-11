import { withJazz } from "jazz-tools/dev/next";


export default withJazz(
  {},
  {
    server: {
      allowAnonymous: true,
      allowDemo: true,
      backendSecret: "TEST_SECRET",
      adminSecret: "TEST_SECRET",
      appId: '019cb2e1-9061-7173-8787-63c03762f6fe',
    },
  },
);