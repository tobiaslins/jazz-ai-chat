"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDb, useSession } from "jazz-tools/react";

import { app } from "../../../../../schema1/app";

const CHAT_DEBUG =
  process.env.NEXT_PUBLIC_CHAT_DEBUG === "1" || process.env.NODE_ENV !== "production";

export default function NewChatPage() {
  const db = useDb();
  const session = useSession();
  const sessionUserId = session?.user_id ?? null;
  const router = useRouter();
  const createChatPromiseRef = useRef<Promise<{ chatId: string; title: string }> | null>(null);
  const syncStartedRef = useRef(false);

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

      // Local-first create avoids blocking this page when edge/global sync is slow.
      createChatPromiseRef.current = db
        .insertDurable(app.chats, chatData, {tier: 'edge'})
        .then((chat) => {
          console.log("chat", chat);
          return { chatId: chat.id, title: chatData.title }
        });
      debugLog("chat_create_started");
    }

    void createChatPromiseRef.current
      .then(({ chatId, title }) => {
        debugLog("chat_created_local", { chatId });

        if (isActive) {
          router.replace(`/chat/${chatId}`);
        }

        if (!syncStartedRef.current) {
          syncStartedRef.current = true;
          // Best-effort sync in background. The send flow can retry if this is not done yet.
          void withTimeout(
            db.updateDurable(app.chats, chatId, { title }, { tier: "edge" }),
            3000
          )
            .then(() => {
              debugLog("chat_synced_edge", { chatId });
            })
            .catch((error) => {
              debugLog("chat_sync_edge_failed", {
                chatId,
                error: error instanceof Error ? error.message : String(error),
              });
            });
        }
      })
      .catch((error) => {
        debugLog("chat_create_failed", {
          error: error instanceof Error ? error.message : String(error),
        });
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
