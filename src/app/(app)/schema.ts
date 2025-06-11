import { Account, co, Group, z } from "jazz-tools";

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
  creditsId: z.string().optional(),
});
export type Chat = co.loaded<typeof Chat>;
export const ListOfChats = co.list(Chat);

export const Credits = co.map({
  balance: z.number(),
  lastUpdated: z.string(),
});
export type Credits = co.loaded<typeof Credits>;

export const UserRoot = co.map({
  chats: ListOfChats,
  images: ListOfChatMessages,
  credits: Credits,
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
      const credits = await generateCredits(account);
      account.root = UserRoot.create({
        chats: ListOfChats.create([], account),
        images: ListOfChatMessages.create([], account),
        credits: credits,
      });
    } else {
      const loadedRoot = await UserRoot.load(account._refs.root.id, {
        loadAs: account,
        resolve: {},
      });
      if (!loadedRoot?._refs.credits) {
        if (loadedRoot) {
          console.log("Generating credits");
          const credits = await generateCredits(account);
          loadedRoot.credits = credits;
        }
      }
    }
  });
export type ChatAccount = co.loaded<typeof ChatAccount>;

async function generateCredits(account: ChatAccount) {
  const creditsGroup = Group.create({ owner: account });
  const readonlyGroup = Group.create({ owner: account });
  const serverWorkerId = "co_zm1eobD4gAy4hfPrsKR7vuEShYz";
  try {
    const serverWorker = await Account.load(serverWorkerId, {
      loadAs: account,
    });
    if (serverWorker) {
      creditsGroup.addMember(serverWorker, "admin");
      creditsGroup.extend(readonlyGroup, "reader");
      creditsGroup.removeMember(account);
    }
  } catch (error) {
    console.warn("Could not add server worker to credits group:", error);
  }

  const credits = Credits.create(
    {
      balance: 10,
      lastUpdated: new Date().toISOString(),
    },
    { owner: creditsGroup }
  );

  return credits;
}
