import { schema as s } from "jazz-tools";

export default s.defineMigration({
  createTables: {
    "chat_shares": true,
  },
  fromHash: "027de58338eb",
  toHash: "4b87774345d9",
  from: {},
  to: {
  "chat_shares": s.table({
    "chat": s.ref("chats"),
    "user_id": s.string(),
    "can_edit": s.boolean(),
    "created_at": s.string(),
  })
},
});
