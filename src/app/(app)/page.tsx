import { RenderChat } from "./render-chat";
import { Chat } from "./schema";
import { use } from "react";
import ChatLayout from "./chat-layout";
import { getWorker } from "../worker";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ chat: string }>;
}) {
  const { chat: chatId } = await searchParams;

  if (!chatId) {
    return (
      <ChatLayout>
        <RenderChat />
      </ChatLayout>
    );
  }

  const worker = await getWorker();
  const chat = await Chat.load(chatId, {
    loadAs: worker,
    resolve: {
      messages: { $each: { text: true, reactions: true } },
    },
  });

  const chatWithOrdered = {
    ...chat?.toJSON(),
    messages: chat?.messages
      ?.toSorted(
        (a, b) =>
          (a?._edits?.role?.madeAt?.getTime() ?? 0) -
          (b?._edits?.role?.madeAt?.getTime() ?? 0)
      )
      .map((m) => ({
        ...m?.toJSON(),
        text: m?.text?.toString(),
      })),
  };

  return (
    <ChatLayout>
      <RenderChat chatId={chatId} preloadedChat={chatWithOrdered} />
    </ChatLayout>
  );
}
