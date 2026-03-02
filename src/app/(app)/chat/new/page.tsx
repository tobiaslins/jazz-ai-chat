"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDb } from "jazz-tools/react";

import { app } from "../../../../../schema/app";

const CHAT_DEBUG =
  process.env.NEXT_PUBLIC_CHAT_DEBUG === "1" || process.env.NODE_ENV !== "production";

export default function NewChatPage() {
  const db = useDb();
  const router = useRouter();
  const didCreateRef = useRef(false);

  useEffect(() => {
    if (didCreateRef.current) return;
    didCreateRef.current = true;

    let cancelled = false;

    void (async () => {
      const now = new Date().toISOString();
      const chatData = {
        title: "New chat",
        created_at: now,
      };

      // Local-first create avoids blocking this page when edge/core sync is slow.
      const chatId = db.insert(app.chats, chatData);
      debugLog("chat_created_local", { chatId });

      if (!cancelled) {
        router.replace(`/chat/${chatId}`);
      }

      // Best-effort sync in background. The send flow can retry if this is not done yet.
      void withTimeout(
        db.updateWithAck(app.chats, chatId, { title: chatData.title }, "edge"),
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
    })();

    return () => {
      cancelled = true;
    };
  }, [db, router]);

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
