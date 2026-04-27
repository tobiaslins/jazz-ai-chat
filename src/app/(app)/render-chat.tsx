"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Send, X } from "lucide-react";
import { useAll, useDb, useSession } from "@/lib/jazz-react-client";

import { app, type Chat } from "../../../schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModelSelector } from "@/components/ui/model-selector";
import { defaultModel, type ModelId } from "@/lib/models";
import { Db } from "jazz-tools";

import { MessageContent } from "./message-content";

const MODEL_STORAGE_KEY = "jazz-chat:selected-model";

function useSelectedModel() {
  const [model, setModel] = useState<ModelId>(defaultModel);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(MODEL_STORAGE_KEY);
      if (stored) setModel(stored as ModelId);
    } catch {}
  }, []);

  const update = (next: ModelId) => {
    setModel(next);
    try {
      window.localStorage.setItem(MODEL_STORAGE_KEY, next);
    } catch {}
  };

  return [model, update] as const;
}

type ChatRole = "user" | "assistant" | "system";
const CHAT_DEBUG =
  process.env.NEXT_PUBLIC_CHAT_DEBUG === "1" || process.env.NODE_ENV !== "production";
const DEFAULT_CHAT_TITLE = "New chat";
const AUTO_TITLE_MAX_LENGTH = 60;

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
  const [model, setModel] = useSelectedModel();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = value.trim();
    if (!chat || !content) return;

    const now = new Date().toISOString();

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

      // Auto-title the chat from the first user message.
      if (!chat.title || chat.title === DEFAULT_CHAT_TITLE) {
        const autoTitle = buildAutoTitle(content);
        if (autoTitle) {
          db.update(app.chats, chatId, { title: autoTitle });
        }
      }

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
            model,
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
    <div className="flex h-[100dvh] w-full flex-col bg-white">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <SidebarTrigger className="-ml-1" />
        <div className="min-w-0 flex-1">
          {chat ? (
            <EditableTitle chat={chat} />
          ) : (
            <h1 className="truncate text-sm font-semibold text-gray-500">
              Chat not found
            </h1>
          )}
        </div>
        <ModelSelector
          selectedModel={model}
          setSelectedModel={setModel}
          singleLine
        />
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
                {isUser ? (
                  <span className="whitespace-pre-wrap">{message.content}</span>
                ) : (
                  <MessageContent content={message.content} />
                )}
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
            disabled={!chat || sending}
          />
          <Button type="submit" size="icon" disabled={!chat || sending || !value.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function EditableTitle({ chat }: { chat: Chat }) {
  const db = useDb();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(chat.title);
    }
  }, [chat.title, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  async function save() {
    const next = draft.trim();
    if (!next || next === chat.title) {
      setEditing(false);
      setDraft(chat.title);
      return;
    }
    try {
      await db.update(app.chats, chat.id, { title: next });
    } finally {
      setEditing(false);
    }
  }

  function cancel() {
    setDraft(chat.title);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void save();
            } else if (event.key === "Escape") {
              event.preventDefault();
              cancel();
            }
          }}
          className="h-7 text-sm"
        />
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={save}>
          <Check className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={cancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="truncate rounded px-1 text-left text-sm font-semibold hover:bg-gray-100"
      title="Click to rename"
    >
      {chat.title?.trim() || "Untitled chat"}
    </button>
  );
}

function buildAutoTitle(content: string): string {
  const firstLine = content.split("\n").find((line) => line.trim().length > 0) ?? content;
  const trimmed = firstLine.trim();
  if (trimmed.length <= AUTO_TITLE_MAX_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, AUTO_TITLE_MAX_LENGTH).trimEnd()}…`;
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
