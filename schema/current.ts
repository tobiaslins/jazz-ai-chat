import { col, table } from "jazz-tools";

table("messages", {
  role: col.string(),
  content: col.string(),
  created_at: col.string(),
});
