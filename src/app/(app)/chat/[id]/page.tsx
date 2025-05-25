import { type ID } from "jazz-tools";
import { Chat } from "../../schema";
import { RenderChat } from "./client";
import { use } from "react";

export const dynamic = "force-dynamic";

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return <RenderChat chatId={id as ID<Chat>} />;
}
