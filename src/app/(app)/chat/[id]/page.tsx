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

  if (requestType.isRSCRequest || true) {
    // Don't prefetch the chat, just render it
    // don't prerender now bc of permissions
    return <RenderChat />;
  }

  const { id } = await params;
  const worker = await getWorker();
  const chat = await Chat.load(id, {
    loadAs: worker,
    resolve: {
      messages: { $each: { text: true } },
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
        ...(m?.type === "text" ? { text: m?.text?.toString() } : {}),
        ...(m?.type === "image" ? { image: m?.image?.toString() } : {}),
      })),
  };

  return <RenderChat preloadedChat={chatWithOrdered} />;
}
