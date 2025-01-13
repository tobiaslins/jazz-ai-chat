import { useAccount } from "jazz-react";
import { Chat } from "./schema";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function useCreateChat() {
  const router = useRouter();
  const { me } = useAccount();
  const [loading, setLoading] = useState(false);

  const createChat = async () => {
    setLoading(true);
    const response = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ userId: me.id }),
    });
    const { chatId } = await response.json();

    const loaded = await me?.ensureLoaded({ root: { chats: [] } });

    const loadChat = await Chat.load(chatId, me, {});
    console.log("loadChat", loadChat);
    if (!loadChat) return;
    loaded?.root.chats?.push(loadChat);

    router.push(`/chat/${chatId}`);
  };

  return { createChat, loading };
}
