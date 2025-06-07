"use client";

import { useAccount, useCoState } from "jazz-react";
import { Chat, ChatAccount, ChatMessage, ListOfChatMessages } from "./schema";
import { CoPlainText, Group, type ID, Account } from "jazz-tools";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";
import { Loader2, Send, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Markdown from "react-markdown";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "react-hot-toast";
import clsx from "clsx";
import { track } from "@vercel/analytics";
import { ModelSelector } from "@/components/ui/model-selector";
import { ModelId, defaultModel } from "@/lib/models";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { darcula } from "react-syntax-highlighter/dist/esm/styles/prism";

export function RenderChat({ preloadedChat }: { preloadedChat?: Chat }) {
  const params = useParams();
  const chatId = params.id as string | undefined;
  const chat = useCoState(Chat, chatId || undefined, {
    resolve: {
      messages: { $each: { text: true } },
    },
  });
  const { me } = useAccount(ChatAccount);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const selectedModel = chat?.model || preloadedChat?.model || defaultModel;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasInitiallyScrolled, setHasInitiallyScrolled] = useState(false);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const router = useRouter();

  const chatToUse = chat || preloadedChat;

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
    if (!message.trim() || !me) return;

    setIsLoading(true);

    try {
      let currentChat = chat;
      let currentChatId = chatId;

      // Create a new chat if none exists
      if (!currentChat && !currentChatId) {
        const group = Group.create();
        const worker = await Account.load(
          "co_zm1eobD4gAy4hfPrsKR7vuEShYz" as ID<Account>,
          {
            loadAs: me,
          }
        );
        if (!worker) return;
        group.addMember(worker, "writer");

        currentChat = await Chat.create(
          {
            messages: ListOfChatMessages.create([], { owner: group }),
            name: "Unnamed",
            model: selectedModel,
          },
          {
            owner: group,
          }
        );

        currentChatId = currentChat.id;

        // Update user's chat list
        const loadedMe = await me.ensureLoaded({
          resolve: { root: { chats: true } },
        });
        loadedMe.root.chats.push(currentChat);

        // Navigate to the new chat using instant navigation
        window.history.pushState(null, "", `/chat/${currentChat.id}`);
        router.push(`/chat/${currentChat.id}`);

        track("Create Chat");
      }

      if (!currentChat) return;

      const chatMessage = ChatMessage.create(
        {
          content: message,
          role: "user",
          text: CoPlainText.create(message, { owner: currentChat._owner }),
        },
        { owner: currentChat._owner }
      );

      currentChat.messages?.push(chatMessage);
      setMessage("");

      await chatMessage.waitForSync();

      try {
        await fetch("/api/chat", {
          method: "POST",
          body: JSON.stringify({
            chatId: currentChatId,
            userId: me?.id,
            lastMessageId: chatMessage?.id,
            model: selectedModel,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            console.log(data);
          });
      } catch (error) {
        console.error(error);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const orderedMessages = chatToUse?.messages?.toSorted(
    (a, b) =>
      (a?._edits?.role?.madeAt?.getTime() ?? 0) -
      (b?._edits?.role?.madeAt?.getTime() ?? 0)
  );

  const role = chat?._owner?.myRole() || "admin"; // Default to admin for new chats

  useEffect(() => {
    if (chat && chat?.model !== selectedModel) {
      chat.model = selectedModel;
    }
  }, [selectedModel, chat]);

  return (
    <div className="flex flex-col h-full max-w-full w-full mx-auto bg-white relative">
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 safe-area-inset-top">
        <div className="flex items-center justify-between px-4 py-3 pt-safe">
          <div className="flex items-center space-x-3">
            <SidebarTrigger />
            <div>
              <h1 className="font-semibold text-gray-900">
                {chat?.name || preloadedChat?.name || "New Chat"}
              </h1>
            </div>
          </div>
          <div className="flex items-center">
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
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              onClick={async () => {
                if (
                  chat &&
                  me?.root?.chats &&
                  window.confirm("Are you sure you want to delete this chat?")
                ) {
                  const chatIdx = me.root.chats.findIndex(
                    (c) => c?.id === chat.id
                  );
                  if (chatIdx > -1) {
                    me.root.chats.splice(chatIdx, 1);
                    router.push("/");
                  }
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence>
          {orderedMessages?.map((message) => (
            <motion.div
              key={message?.id}
              className={`flex ${
                message?.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 min-h-[36px] ${
                  message?.role === "user"
                    ? "bg-blue-500 text-white rounded-br-md"
                    : "bg-gray-100 text-gray-900 rounded-bl-md"
                }`}
              >
                <Markdown
                  className={clsx(
                    "text-sm",
                    message?.text?.toString() ? "" : "text-gray-500"
                  )}
                  components={{
                    code({ className, children }) {
                      const match = /language-(\w+)/.exec(className || "");
                      return match ? (
                        <SyntaxHighlighter
                          PreTag="div"
                          language={match[1]}
                          style={darcula}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className}>{children}</code>
                      );
                    },
                  }}
                >
                  {message?.text?.toString() || "..."}
                </Markdown>
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
                window.location.href = "/";
              }}
            >
              New chat
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`sticky bottom-0 z-50 bg-white border-t border-gray-200 transition-all duration-200 ${
            isKeyboardVisible ? "pb-2" : ""
          }`}
        >
          <form
            onSubmit={sendMessage}
            className="flex items-center space-x-3 px-4 py-3 lg:flex-row flex-col"
          >
            <div className="flex-1 flex items-center space-x-3 justify-center">
              <div className="flex-1 relative min-w-80">
                <Input
                  type="text"
                  placeholder="Type a message..."
                  value={message}
                  autoFocus
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-md border-gray-300 pr-12 py-2 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ fontSize: "16px" }}
                />
              </div>
              <div className="items-start justify-start flex-1 max-w-60 lg:flex hidden">
                <ModelSelector
                  selectedModel={selectedModel}
                  setSelectedModel={(model) => {
                    if (chat) {
                      chat.model = model;
                    }
                  }}
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="rounded-full w-10 h-10 p-0 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="lg:hidden block">
              <ModelSelector
                singleLine
                selectedModel={selectedModel}
                setSelectedModel={(model) => {
                  if (chat) {
                    chat.model = model;
                  }
                }}
              />
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
