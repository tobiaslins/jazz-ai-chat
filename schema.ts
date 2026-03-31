import { schema as s } from "jazz-tools";

const schema = {
  chats: s.table({
    title: s.string(),
    created_at: s.string(),
    owner_id: s.string()
  }),
  messages: s.table({
    role: s.string(),
    content: s.string(),
    chat: s.ref("chats").optional(),
    created_at: s.string()
  }),
};

type AppSchema = s.Schema<typeof schema>;
export const app: s.App<AppSchema> = s.defineApp(schema);

export type Chat = s.RowOf<typeof app.chats>;
export type ChatQueryBuilder = typeof app.chats;


// import { col, table } from "jazz-tools";

// table("chats", {
//   title: col.string(),
//   created_at: col.string(),
//   owner_id: col.string(),
// });

// table("messages", {
//   chat: col.ref("chats"),
//   role: col.string(),
//   content: col.string(),
//   created_at: col.string(),
// });
