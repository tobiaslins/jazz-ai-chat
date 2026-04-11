import { RenderCursorRoom } from "../../render-cursor-room";

export default async function CursorRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RenderCursorRoom roomId={id} />;
}
