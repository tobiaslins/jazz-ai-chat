import { withJazz } from "jazz-tools/dev/next";


export default withJazz(
  {},
  {
    server: false,
    adminSecret: process.env.JAZZ_ADMIN_SECRET
  },
);
