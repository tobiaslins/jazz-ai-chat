"use client";

import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { useAll, useDb } from "jazz-tools/react";

import { app } from "../../../schema/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatRole = "user" | "assistant" | "system";

type ChatRequestMessage = {
  role: ChatRole;
  content: string;
};

export function RenderChat() {
  const db = useDb();
  const messages = useAll(app.messages.orderBy("created_at", "asc")) ?? [];

  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  const history = useMemo<ChatRequestMessage[]>(
    () =>
      messages.map((message) => ({
        role: normalizeRole(message.role),
        content: message.content,
      })),
    [messages]
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = value.trim();
    if (!content || sending) return;

    const now = new Date().toISOString();
    db.insert(app.messages, {
      role: "user",
      content,
      created_at: now,
    });

    setValue("");
    setSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role: "user", content }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed (${response.status})`);
      }
    } catch {
      db.insert(app.messages, {
        role: "assistant",
        content: "Sorry, I couldn't generate a response. Please try again.",
        created_at: new Date().toISOString(),
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-3xl flex-col bg-white">
      <header className="border-b px-4 py-3">
        <h1 className="text-sm font-semibold">Jazz2 Minimal AI Chat</h1>
      </header>

      <main className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
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
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={sending || !value.trim()}>
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
