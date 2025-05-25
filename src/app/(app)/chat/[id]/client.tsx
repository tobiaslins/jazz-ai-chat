"use client";

import { useAccount, useCoState } from "jazz-react";
import { Chat, ChatAccount, ChatMessage, Reactions } from "../../schema";
import { CoPlainText, Group, type ID } from "jazz-tools";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import { useParams } from "next/navigation";
import Markdown from "react-markdown";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

export function RenderChat({
  chatId,
  preloadedChat,
}: {
  chatId: ID<Chat>;
  preloadedChat?: Chat;
}) {
  const chat = useCoState(Chat, chatId, {
    resolve: {
      messages: { $each: { text: true, reactions: true } },
    },
  });
  const { me } = useAccount(ChatAccount);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFirstRender, setIsFirstRender] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: isFirstRender ? "instant" : "smooth",
    });

    if (isFirstRender && (chat?.messages?.length ?? 0) > 0) {
      setIsFirstRender(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(scrollToBottom, [chat?.messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chat || !message.trim()) return;

    setIsLoading(true);

    const chatMessage = ChatMessage.create(
      {
        content: message, // TODO: remove
        role: "user",
        text: CoPlainText.create(message, { owner: chat._owner }),
        reactions: Reactions.create([], { owner: chat._owner }),
      },
      { owner: chat._owner }
    );

    chat.messages?.push(chatMessage);
    setMessage("");

    await chatMessage.waitForSync();

    // sendMessageToWorker(chatMessage);

    try {
      await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          chatId,
          userId: me?.id,
          lastMessageId: chatMessage?.id,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log(data);
        });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  const orderedMessages = (chat || preloadedChat)?.messages?.toSorted(
    (a, b) =>
      (a?._edits?.role?.madeAt?.getTime() ?? 0) -
      (b?._edits?.role?.madeAt?.getTime() ?? 0)
  );

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        {/* <SidebarTrigger /> */}
        <h1 className="text-2xl font-bold text-gray-800">
          {preloadedChat?.name || chat?.name || "Chat"}
        </h1>
        <Button
          variant="outline"
          onClick={() => {
            chat?._owner.castAs(Group).addMember("everyone", "reader");
            navigator.clipboard.writeText(window.location.href);
            toast.success("Copied to clipboard");
          }}
        >
          Share
        </Button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {orderedMessages?.map((message, index) => (
            <motion.div
              key={message?.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className={`flex ${
                message?.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl rounded-lg p-3 ${
                  message?.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-800"
                }`}
              >
                <Markdown className={"min-h-[24px]"}>
                  {message?.text?.toString()}
                </Markdown>
                <span className="text-xs mt-1 block opacity-75 h-[16px]">
                  {message?._edits?.text?.by?.profile?.name ?? ""}
                </span>
                {Object.entries(message?.reactions?.perSession ?? {}).map(
                  ([sessionId, reaction]) => (
                    <span
                      key={sessionId}
                      className="text-xs mt-1 block opacity-75"
                    >
                      {reaction.value}
                    </span>
                  )
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="bg-white p-4 shadow-lg">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            autoFocus
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
          />
          <Button type="submit">
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Send className="w-6 h-6" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
