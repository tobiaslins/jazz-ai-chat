"use client";

import { useAccount } from "jazz-react";
import { ChatAccount } from "./schema";
import { useSearchParams } from "next/navigation";
import { RenderChat } from "./render-chat";
import { type ID } from "jazz-tools";
import { Chat } from "./schema";
import { useCreateChat } from "./hooks";
import { useEffect, useState } from "react";
import ChatLayout from "./chat-layout";

export default function Home() {
  const searchParams = useSearchParams();
  const chatId = searchParams.get("chat");
  const isNewChat = searchParams.get("new");
  const { me } = useAccount(ChatAccount, {
    resolve: { root: { chats: { $each: true } } },
  });
  const { createChat, loading } = useCreateChat();
  const [, forceUpdate] = useState({});

  // Listen for popstate events to trigger re-renders
  useEffect(() => {
    const handlePopState = () => {
      forceUpdate({});
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Handle new chat creation
  useEffect(() => {
    if (isNewChat && !loading) {
      // Remove the new parameter and create chat
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      window.history.replaceState(null, "", url.toString());
      createChat();
    }
  }, [isNewChat, createChat, loading]);

  return (
    <ChatLayout>
      {isNewChat ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Creating new chat...</p>
          </div>
        </div>
      ) : (
        <RenderChat chatId={chatId as ID<Chat> | null} />
      )}
    </ChatLayout>
  );
}
