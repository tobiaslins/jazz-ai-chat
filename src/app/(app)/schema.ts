import { co, CoMap, CoList, Account, CoPlainText, CoFeed, z } from "jazz-tools";

export const Reactions = co.feed(z.string());

export const ChatMessage = co.map({
  content: z.string(),
  text: co.plainText(),
  role: z.enum(["user", "system", "assistant"]),
  reactions: z.optional(Reactions),
});

export const ListOfChatMessages = co.list(ChatMessage);

export const Chat = co.map({
  name: z.string(),
  messages: ListOfChatMessages,
});
export type Chat = co.loaded<typeof Chat>;
export const ListOfChats = co.list(Chat);

export const UserRoot = co.map({
  chats: ListOfChats,
});

export const ChatAccount = co
  .account({
    root: UserRoot,
    profile: co.map({
      name: z.string(),
    }),
  })
  .withMigration(async (account) => {
    console.log("migrate", account._refs.root);
    if (!account._refs.root) {
      account.root = UserRoot.create({
        chats: ListOfChats.create([], account),
      });
    }
  });
export type ChatAccount = co.loaded<typeof ChatAccount>;
