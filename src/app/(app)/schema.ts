import { co, z } from "jazz-tools";

export const ChatMessage = co.map({
  type: z.enum(["text", "image"]),
  text: co.plainText(),
  image: z.optional(co.image()),
  audio: z.optional(co.fileStream()),
  role: z.enum(["user", "system", "assistant"]),
});
export type ChatMessage = co.loaded<typeof ChatMessage>;

export const ListOfChatMessages = co.list(ChatMessage);

export const Chat = co.map({
  name: z.string(),
  messages: ListOfChatMessages,
  model: z.string().optional(),

  generateAudio: z.boolean().optional(),
});
export type Chat = co.loaded<typeof Chat>;
export const ListOfChats = co.list(Chat);

export const UserRoot = co
  .map({
    chats: ListOfChats,
    images: ListOfChatMessages,
  })
  .withMigration((root) => {
    if (root.images === undefined) {
      root.images = ListOfChatMessages.create([], root._owner);
    }
  });

export const ChatAccount = co
  .account({
    root: UserRoot,
    profile: co.map({
      name: z.string(),
    }),
  })
  .withMigration(async (account) => {
    if (!account._refs.root) {
      account.root = UserRoot.create({
        chats: ListOfChats.create([], account),
        images: ListOfChatMessages.create([], account),
      });
    }
  });
export type ChatAccount = co.loaded<typeof ChatAccount>;
