"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDb, useSession } from "@/lib/jazz-react-client";

import { app } from "../../../../../schema";

const CHAT_DEBUG =
  process.env.NEXT_PUBLIC_CHAT_DEBUG === "1" || process.env.NODE_ENV !== "production";

export default function NewChatPage() {
  const db = useDb();
  const session = useSession();
  const sessionUserId = session?.user_id ?? null;
  const router = useRouter();
  const createChatPromiseRef = useRef<
    Promise<{ chatId: string; title: string }>
    | null
  >(null);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionUserId) {
      return;
    }

    let isActive = true;

    if (!createChatPromiseRef.current) {
      const now = new Date().toISOString();
      const chatData = {
        title: "New chat",
        created_at: now,
        owner_id: sessionUserId,
      };

      const insertedChat = db.insert(app.chats, chatData);
      createChatPromiseRef.current = withTimeout(
        insertedChat.wait({ tier: "edge" }),
        10000
      ).then((chat) => ({
        chatId: chat.id,
        title: chatData.title,
      }));
      debugLog("chat_create_started");
    }

    void createChatPromiseRef.current
      .then(({ chatId }) => {
        debugLog("chat_created_edge", { chatId });

        if (isActive) {
          router.replace(`/chat/${chatId}`);
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        debugLog("chat_create_failed", {
          error: message,
        });
        if (isActive) {
          setCreateError(message);
        }
      });

    return () => {
      isActive = false;
    };
  }, [db, router, sessionUserId]);

  if (!sessionUserId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-sm text-gray-600">
        Initializing session...
      </div>
    );
  }

  if (createError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-sm text-red-700">
        Failed to create chat: {createError}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-sm text-gray-600">
      Creating chat...
    </div>
  );
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    void promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

function debugLog(event: string, payload?: unknown) {
  if (!CHAT_DEBUG) {
    return;
  }

  if (typeof payload === "undefined") {
    console.info(`[chat-new] ${event}`);
    return;
  }

  console.info(`[chat-new] ${event}`, payload);
}
