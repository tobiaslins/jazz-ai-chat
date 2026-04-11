import { withJazz } from "jazz-tools/dev/next";


export default withJazz(
  {},
  {
    server: {
      allowAnonymous: true,
      allowDemo: true,
      backendSecret: "TEST_SECRET",
    },
  },
);