"use client";

import { ProgressiveImg, useAccount, useCoState } from "jazz-react";
import { Chat, ChatAccount, ChatMessage, ListOfChatMessages } from "./schema";
import {
  CoPlainText,
  Group,
  type ID,
  Account,
  createInviteLink,
  consumeInviteLink,
} from "jazz-tools";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://jazz-ai-chat.vercel.app/"
    : "http://localhost:3001/";

export function RenderChat({ preloadedChat }: { preloadedChat?: Chat }) {
  const params = useParams();
  const chatId = params.id as string | undefined;
  const chat = useCoState(Chat, chatId || undefined, {
    resolve: {
      messages: { $each: { text: true, image: true } },
    },
  });
  const { me } = useAccount(ChatAccount);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [newlyCreatedChatId, setNewlyCreatedChatId] = useState<ID<Chat> | null>(
    null
  );
  const newlyCreatedChat = useCoState(Chat, newlyCreatedChatId || undefined);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasInitiallyScrolled, setHasInitiallyScrolled] = useState(false);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const router = useRouter();

  const chatToUse = chat || newlyCreatedChat || preloadedChat;

  // Only show author if there are others
  const hasOtherMembers =
    chat?._owner?.members?.length && chat?._owner?.members?.length > 2;

  const selectedModel = chatToUse?.model || defaultModel;

  // Create a new chat object in memory if we're on the new chat page
  useEffect(() => {
    if (chatId || !me || newlyCreatedChatId) return;

    const group = Group.create({ owner: me });

    const workerPromise = Account.load(
      "co_zm1eobD4gAy4hfPrsKR7vuEShYz" as ID<Account>,
      { loadAs: me }
    );

    workerPromise.then((worker) => {
      if (!worker) return;
      group.addMember(worker, "writer");

      const newChat = Chat.create(
        {
          messages: ListOfChatMessages.create([], { owner: group }),
          name: "Unnamed",
          model: selectedModel,
          generateAudio: false,
        },
        { owner: group }
      );

      setNewlyCreatedChatId(newChat.id);
    });
  }, [chatId, me, newlyCreatedChatId, selectedModel]);

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
    const currentMessageCount =
      (chat || preloadedChat || newlyCreatedChat)?.messages?.length || 0;

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
    newlyCreatedChat?.messages,
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

  useEffect(() => {
    const redeemInvite = async () => {
      try {
        const inviteURL = window.location.href;

        if (!inviteURL.includes("#/invite/")) return;

        // Consume the invite link
        const redeemed = await consumeInviteLink({
          invitedObjectSchema: Chat,
          inviteURL,
        });

        if (redeemed) {
          const loadedChat = await Chat.load(redeemed.valueID, { loadAs: me });
          const loadedMe = await me.ensureLoaded({
            resolve: { root: { chats: true } },
          });

          // Check if chat is already in the list to avoid duplicates
          if (
            loadedChat &&
            loadedMe.root?.chats &&
            !loadedMe.root.chats.some((c) => c?.id === loadedChat.id)
          ) {
            loadedMe.root.chats.push(loadedChat);
          }
          // Navigate to the chat page
          if (loadedChat) {
            router.push(`/chat/${loadedChat.id}`);
          }

          toast.success("Successfully joined chat!");
        } else {
          toast.error("Failed to redeem invite link.");
        }
      } catch (error) {
        console.error("Failed to redeem invite:", error);
        toast.error("Failed to redeem invite link.");
      }
    };

    if (me) {
      redeemInvite();
    }
  }, [me, router]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const chatForMessage = chat || newlyCreatedChat;

    if (!message.trim() || !me || !chatForMessage) return;

    setIsLoading(true);

    try {
      console.log("chat", chat, newlyCreatedChat);
      if (!chat && newlyCreatedChat) {
        // This is the first message in a new chat.
        // Add the chat to our list of chats.
        const loadedMe = await me.ensureLoaded({
          resolve: { root: { chats: true } },
        });
        loadedMe.root.chats.push(newlyCreatedChat);
        // And navigate to the new chat's URL.
        router.push(`/chat/${newlyCreatedChat.id}`);
        track("Create Chat");
      }

      const currentChat = chatForMessage;
      const currentChatId = chatId || currentChat.id;

      const chatMessage = ChatMessage.create(
        {
          type: "text",
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

  if (chat === null && chatId) {
    return (
      <div className="flex flex-col h-full max-w-full w-full mx-auto bg-white relative">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Chat not found</div>
        </div>
      </div>
    );
  }

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
            <div className="flex items-center space-x-2 mr-2">
              <Switch
                id="audio-generation"
                checked={!!chatToUse?.generateAudio}
                onCheckedChange={(checked: boolean) => {
                  if (chatToUse) {
                    chatToUse.generateAudio = checked;
                    if (checked) {
                      toast.success(
                        "New chat messages will be automatically converted to audio"
                      );
                    }
                    track("Toggle Audio Generation", {
                      chatId: chatToUse.id,
                      enabled: checked,
                    });
                  }
                }}
              />
              <Label htmlFor="audio-generation">Audio</Label>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2"
                  disabled={!chat}
                >
                  Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => {
                    if (!chat) return;
                    const link = createInviteLink(chat, "reader", BASE_URL);
                    navigator.clipboard.writeText(link);
                    toast.success("Read-only invite link copied to clipboard");
                  }}
                >
                  Share as viewer
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (!chat) return;
                    const link = createInviteLink(chat, "writer", BASE_URL);
                    navigator.clipboard.writeText(link);
                    toast.success("Writer invite link copied to clipboard");
                  }}
                >
                  Share as collaborator
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (!chat) return;
                    chat._owner.castAs(Group).addMember("everyone", "reader");
                    navigator.clipboard.writeText(window.location.href);
                    toast.success(
                      "Chat is now public. Link copied to clipboard."
                    );
                  }}
                >
                  Make public
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              disabled={!chat}
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
          {orderedMessages?.map((message, idx) => (
            <motion.div
              key={message?.id}
              className={clsx(
                "w-full flex",
                message?.role === "user" && message?._edits.text?.by?.isMe
                  ? "justify-end"
                  : "justify-start"
              )}
            >
              <div className="flex flex-col md:max-w-[80%]">
                <div
                  className={clsx(
                    "w-full min-w-0 rounded-2xl px-4 py-2 min-h-[36px] break-words relative",
                    message?.role === "user"
                      ? "bg-blue-500 text-white rounded-br-md"
                      : "bg-gray-100 text-gray-900 rounded-bl-md",
                    message?._edits.text?.by?.isMe ? "" : ""
                  )}
                >
                  {message?.image ? (
                    <ProgressiveImg
                      image={chat?.messages[idx]?.image} // The image definition to load
                      targetWidth={300} // Looks for the best available resolution for a 800px image
                    >
                      {({ src }) => (
                        <img
                          src={src}
                          alt="Gallery image"
                          className="gallery-image max-w-64 min-w-64"
                        />
                      )}
                    </ProgressiveImg>
                  ) : (
                    <Markdown
                      className={clsx(
                        "text-sm",
                        message?.text?.toString() ? "" : "text-gray-500"
                      )}
                      components={{
                        code({ className, children }) {
                          const match = /language-(\w+)/.exec(className || "");
                          return match ? (
                            <div className="overflow-x-auto">
                              <SyntaxHighlighter
                                PreTag="div"
                                language={match[1]}
                                style={darcula}
                              >
                                {String(children).replace(/\n$/, "")}
                              </SyntaxHighlighter>
                            </div>
                          ) : (
                            <code className={className}>{children}</code>
                          );
                        },
                      }}
                    >
                      {message?.text?.toString() || "..."}
                    </Markdown>
                  )}
                  {message?.audio ? <AudioMessage message={message} /> : null}
                </div>

                {hasOtherMembers && !message?._edits.text?.by?.isMe && (
                  <div className="text-[8px] ml-1 mt-0.5 text-gray-500">
                    {message?._edits.text?.by?.profile?.name}
                  </div>
                )}
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
                router.push("/");
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
              <div className="flex-1 relative ">
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
                    if (chatToUse) {
                      chatToUse.model = model;
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
                  if (chatToUse) {
                    chatToUse.model = model;
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

function AudioMessage({ message }: { message: ChatMessage }) {
  const url = useMemo(() => {
    const audio = message.audio;
    if (!audio) return;
    const blob = audio?.toBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    return url;
  }, [message.audio]);

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  if (!url) {
    return null;
  }
  return (
    <div className="flex items-center gap-2 p-1 rounded absolute -bottom-4 -right-4">
      <button
        onClick={togglePlay}
        className="w-6 h-6 rounded-full bg-gray-400 hover:bg-blue-600 flex items-center justify-center text-white"
      >
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <audio ref={audioRef} src={url} className="hidden" />
    </div>
  );
}
