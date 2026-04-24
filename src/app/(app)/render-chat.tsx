"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { useAll, useDb, useSession } from "@/lib/jazz-react-client";

import { app } from "../../../schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Db } from "jazz-tools";

type ChatRole = "user" | "assistant" | "system";
const CHAT_DEBUG =
  process.env.NEXT_PUBLIC_CHAT_DEBUG === "1" || process.env.NODE_ENV !== "production";

export function RenderChat({ chatId }: { chatId: string }) {
  const db = useDb();
  const session = useSession();
  const sessionUserId = session?.user_id ?? null;
  const chatQuery = useMemo(() => app.chats.where({ id: chatId }).limit(1), [chatId]);
  const query = useMemo(
    () => app.messages.where({ chat: chatId }).orderBy("created_at", "asc"),
    [chatId]
  );
  const chat = useAll(chatQuery)?.[0] ?? null;
  const messages = useAll(query) ?? [];

  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = value.trim();
    if (!chat || !content || sending) return;

    const now = new Date().toISOString();
    console.log("now", now);

    try {
      await db.insert(
        app.messages,
        {
          chat: chatId,
          role: "user",
          content,
          created_at: now,
          done: false
        },
        
      );

      setValue("");
      setSending(true);
      debugLog("submit_started", { chatId, contentLength: content.length });
      const sendChatRequest = () =>
        fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chatId,
            latestUserMessage: content,
            sessionUserId,
          }),
        });

      let response = await sendChatRequest();
      debugLog("api_response", {
        attempt: 1,
        status: response.status,
        requestId: response.headers.get("x-chat-request-id"),
      });

      // FK race: chat exists locally but is not visible on the server yet.
      // Force an acknowledged chat update, then retry once.
      if (response.status === 409) {
        debugLog("chat_not_synced_retry", { chatId });
        await syncChatToEdgeWithTimeout(db, chatId, chat.title);
        response = await sendChatRequest();
        debugLog("api_response", {
          attempt: 2,
          status: response.status,
          requestId: response.headers.get("x-chat-request-id"),
        });
      }

      if (!response.ok) {
        const body = await safeReadResponseBody(response);
        debugLog("api_error_response", {
          status: response.status,
          requestId: response.headers.get("x-chat-request-id"),
          body,
        });
        throw new Error(`Chat request failed (${response.status})`);
      }
    } catch (error) {
      debugLog("submit_failed", {
        chatId,
        error: error instanceof Error ? error.message : String(error),
      });
      db.insert(app.messages, {
        chat: chatId,
        role: "assistant",
        content: "Sorry, I couldn't generate a response. Please try again.",
        created_at: new Date().toISOString(),
        done: true
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-3xl flex-col bg-white">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-sm font-semibold">Jazz2 Minimal AI Chat</h1>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{chatId.slice(0, 8)}</span>
          <Link href="/chat/new" className="text-xs text-blue-700 hover:underline">
            New chat
          </Link>
        </div>
      </header>

      <main className="flex-1 space-y-3 overflow-y-auto p-4">
        {!chat ? (
          <p className="text-sm text-gray-500">
            Chat not found. Create a <Link href="/chat/new" className="text-blue-700 hover:underline">new chat</Link>.
          </p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-500">
            Start the conversation by sending a message.
          </p>
        ) : null}

        {messages.map((message) => {
          const isUser = normalizeRole(message.role) === "user";
          return (
            <div
              key={message.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  isUser
                    ? "rounded-br-sm bg-blue-600 text-white"
                    : "rounded-bl-sm bg-gray-100 text-gray-900"
                }`}
              >
                {message.content}
              </div>
            </div>
          );
        })}
      </main>

      <form onSubmit={onSubmit} className="border-t p-4">
        <div className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Type a message..."
            disabled={sending || !chat}
          />
          <Button type="submit" size="icon" disabled={sending || !chat || !value.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function normalizeRole(role: string): ChatRole {
  if (role === "assistant" || role === "system" || role === "user") {
    return role;
  }
  return "user";
}

async function safeReadResponseBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "<failed to read response body>";
  }
}

async function syncChatToEdgeWithTimeout(
  db: Db,
  chatId: string,
  title: string
) {
  return withTimeout(
    db.update(app.chats, chatId, { title }).wait({ tier: "edge" }),
    3000
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
    console.info(`[chat-ui] ${event}`);
    return;
  }

  console.info(`[chat-ui] ${event}`, payload);
}
