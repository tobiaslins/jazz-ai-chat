import { type ID } from "jazz-tools";
import { Chat } from "../../schema";
import { RenderChat } from "./client";
import { use } from "react";
import { getWorker, worker } from "@/app/api/chat/route";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const worker = await getWorker();
  const chat = await Chat.load(id, {
    loadAs: worker,
    resolve: {
      messages: { $each: { text: true, reactions: true } },
    },
  });

  return <RenderChat chatId={id as ID<Chat>} preloadedChat={chat?.toJSON()} />;
}
