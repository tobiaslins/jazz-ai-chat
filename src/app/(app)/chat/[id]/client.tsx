"use client";

import { useAccount, useCoState } from "jazz-react";
import { Chat, ChatAccount, ChatMessage, Reactions } from "../../schema";
import { CoPlainText, Group, type ID } from "jazz-tools";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, MoreVertical, Send } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
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
  const [hasInitiallyScrolled, setHasInitiallyScrolled] = useState(false);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const router = useRouter();

  // Initial scroll to bottom after hydration (not SSR)
  useEffect(() => {
    if (!hasInitiallyScrolled && messagesEndRef.current) {
      setTimeout(() => {
        //   messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
        setHasInitiallyScrolled(true);
      }, 0);
    }
  }, [hasInitiallyScrolled]);

  // Handle scrolling for new messages
  useEffect(() => {
    const currentMessageCount = (chat || preloadedChat)?.messages?.length || 0;

    if (
      hasInitiallyScrolled &&
      currentMessageCount > previousMessageCount &&
      messagesEndRef.current
    ) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
      });
    }

    setPreviousMessageCount(currentMessageCount);
  }, [
    chat?.messages,
    preloadedChat?.messages,
    hasInitiallyScrolled,
    previousMessageCount,
  ]);

  // Handle iOS keyboard visibility
  useEffect(() => {
    const handleResize = () => {
      const viewportHeight =
        window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      setIsKeyboardVisible(viewportHeight < windowHeight * 0.75);
    };

    if (typeof window !== "undefined" && window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      return () =>
        window.visualViewport?.removeEventListener("resize", handleResize);
    }
  }, []);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chat || !message.trim()) return;

    setIsLoading(true);

    const chatMessage = ChatMessage.create(
      {
        content: message,
        role: "user",
        text: CoPlainText.create(message, { owner: chat._owner }),
        reactions: Reactions.create([], { owner: chat._owner }),
      },
      { owner: chat._owner }
    );

    chat.messages?.push(chatMessage);
    setMessage("");

    await chatMessage.waitForSync();

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

  const role = chat?._owner?.myRole();

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="flex flex-col h-full max-w-full w-full mx-auto bg-white relative">
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 safe-area-inset-top">
        <div className="flex items-center justify-between px-4 py-3 pt-safe">
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="font-semibold text-gray-900">
                {chat?.name || preloadedChat?.name || "Chat"}
              </h1>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-2"
            onClick={() => {
              chat?._owner.castAs(Group).addMember("everyone", "reader");
              navigator.clipboard.writeText(window.location.href);
              toast.success("Copied to clipboard");
            }}
          >
            Share
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-safe">
        <AnimatePresence>
          {orderedMessages?.map((message) => (
            <motion.div
              key={message?.id}
              className={`flex ${
                message?.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  message?.role === "user"
                    ? "bg-blue-500 text-white rounded-br-md"
                    : "bg-gray-100 text-gray-900 rounded-bl-md"
                }`}
              >
                <Markdown className="text-sm">
                  {message?.text?.toString()}
                </Markdown>
                <div className="text-xs mt-1">
                  {Object.entries(message?.reactions?.perSession ?? {}).map(
                    ([sessionId, reaction]) => (
                      <span
                        key={sessionId}
                        className={`ml-2 ${
                          message?.role === "user"
                            ? "text-blue-100"
                            : "text-gray-500"
                        }`}
                      >
                        {reaction.value}
                      </span>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {role === "reader" ? (
        <div className="sticky bottom-0 z-50 bg-white border-t border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              You are a reader. You cannot send messages.
            </span>
            <Button
              onClick={() => {
                router.push("/chat/new");
              }}
            >
              New chat
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`sticky bottom-0 z-50 bg-white border-t border-gray-200 transition-all duration-200 ${
            isKeyboardVisible ? "pb-2" : "pb-safe"
          }`}
        >
          <form
            onSubmit={sendMessage}
            className="flex items-center space-x-3 px-4 py-3"
          >
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-md border-gray-300 pr-12 py-2 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ fontSize: "16px" }}
              />
            </div>
            <Button
              type="submit"
              disabled={!message.trim() || isLoading}
              size="sm"
              className="rounded-full w-10 h-10 p-0 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
