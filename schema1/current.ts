import { col, table } from "jazz-tools";

table("chats", {
  title: col.string(),
  created_at: col.string(),
  owner_id: col.string(),
});

table("messages", {
  chat: col.ref("chats"),
  role: col.string(),
  content: col.string(),
  created_at: col.string(),
});
