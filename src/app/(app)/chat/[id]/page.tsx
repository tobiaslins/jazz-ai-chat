import { Chat } from "../../schema";
import { RenderChat } from "../../render-chat";
import { getWorker } from "@/app/worker";
import { detectRequestType } from "../../next-helper";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const requestType = await detectRequestType();

  if (requestType.isRSCRequest) {
    // Don't prefetch the chat, just render it
    return <RenderChat />;
  }

  const { id } = await params;
  const worker = await getWorker();
  const chat = await Chat.load(id, {
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

  return <RenderChat preloadedChat={chatWithOrdered} />;
}
