import { RenderChat } from "../../render-chat";

export default async function ChatIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RenderChat chatId={id} />;
}
