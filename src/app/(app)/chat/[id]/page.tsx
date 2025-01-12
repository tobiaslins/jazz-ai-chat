"use client";

import { useAccount, useCoState } from "jazz-react";
import { Chat, ChatMessage } from "../../schema";
import { Group, type ID } from "jazz-tools";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import { useParams } from "next/navigation";
import Markdown from "react-markdown";

export default function ChatPage() {
  const { id } = useParams();

  return <RenderChat chatId={id as ID<Chat>} />;
}

function RenderChat({ chatId }: { chatId: ID<Chat> }) {
  const chat = useCoState(Chat, chatId, { messages: [{}] });
  const { me } = useAccount();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(scrollToBottom, [chat?.messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chat || !message.trim()) return;

    setIsLoading(true);
    const chatMessage = ChatMessage.create(
      { content: message, role: "user" },
      { owner: chat._owner }
    );

    chat.messages?.push(chatMessage);
    setMessage("");

    await me.waitForAllCoValuesSync();

    try {
      await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          chatId,
          userId: me?.id,
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

  if (!chat) {
    return <div>Loading...</div>;
  }

  const orderedMessages = chat.messages?.toSorted(
    (a, b) =>
      a?._edits.role?.madeAt?.getTime() - b?._edits.role?.madeAt?.getTime()
  );

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-2xl font-bold text-gray-800">
          {chat?.name || "Chat"}
        </h1>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {orderedMessages?.map((message, index) => (
            <motion.div
              key={message?.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
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
                <Markdown>{message?.content}</Markdown>
                <span className="text-xs mt-1 block opacity-75">
                  {message._edits.content.by?.profile?.name}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="bg-white p-4 shadow-lg">
        <div className="flex items-center space-x-2">
          <input
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <button
            type="submit"
            className="bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Send className="w-6 h-6" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
