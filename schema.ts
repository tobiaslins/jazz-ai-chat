import { schema as s } from "jazz-tools";

const schema = {
  chats: s.table({
    created_at: s.string(),
    owner_id: s.string(),
    title: s.string(),
  }),
  cursor_rooms: s.table({
    created_at: s.string(),
    owner_id: s.string(),
    title: s.string(),
  }),
  cursor_presences: s.table({
    room: s.ref("cursor_rooms"),
    client_id: s.string(),
    color: s.string(),
    label: s.string(),
    updated_at: s.string(),
    x: s.int(),
    y: s.int(),
  }),
  messages: s.table({
    chat: s.ref("chats"),
    content: s.string(),
    created_at: s.string(),
    role: s.string(),
    done: s.boolean().default(false),
  }),
};

type AppSchema = s.Schema<typeof schema>;
export const app: s.App<AppSchema> = s.defineApp(schema);

export type Chat = s.RowOf<typeof app.chats>;
export type ChatQueryBuilder = typeof app.chats;
export type CursorRoom = s.RowOf<typeof app.cursor_rooms>;
export type CursorPresence = s.RowOf<typeof app.cursor_presences>;


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
