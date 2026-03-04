"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAll, useDb, useSession } from "jazz-tools/react";

import { app } from "../../../../schema/app";
import { Button } from "@/components/ui/button";

type OrderColumn = "created_at" | "role" | "content";
type OrderDirection = "asc" | "desc";

type OrderOption = {
  label: string;
  column: OrderColumn;
  direction: OrderDirection;
};

const PREVIEW_LIMIT = 100;
const INSERT_CHUNK_SIZE = 250;

const ORDER_OPTIONS: OrderOption[] = [
  { label: "Newest first", column: "created_at", direction: "desc" },
  { label: "Oldest first", column: "created_at", direction: "asc" },
  { label: "Role A->Z", column: "role", direction: "asc" },
  { label: "Content A->Z", column: "content", direction: "asc" },
];

export function RenderBenchmark() {
  const db = useDb();
  const session = useSession();
  const sessionUserId = session?.user_id ?? null;

  const [order, setOrder] = useState<OrderOption>(ORDER_OPTIONS[0]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [lastInsertMs, setLastInsertMs] = useState<number | null>(null);
  const benchmarkChatQuery = useMemo(
    () => app.chats.where({ title: "Benchmark chat" }).orderBy("created_at", "asc").limit(1),
    []
  );
  const benchmarkChats = useAll(benchmarkChatQuery) ?? [];
  const benchmarkChatId = benchmarkChats[0]?.id;

  const previewQuery = useMemo(
    () => app.messages.orderBy(order.column, order.direction).limit(PREVIEW_LIMIT),
    [order]
  );
  const preview = useAll(previewQuery) ?? [];
  const allMessages = useAll(app.messages) ?? [];
  const totalCount = allMessages.length;

  useEffect(() => {
    if (!sessionUserId) return;
    if (benchmarkChatId) return;

    db.insert(app.chats, {
      title: "Benchmark chat",
      created_at: new Date().toISOString(),
      owner_id: sessionUserId,
    });
  }, [benchmarkChatId, db, sessionUserId]);

  const insertBulk = useCallback(
    async (count: number) => {
      if (busy) return;
      if (!benchmarkChatId) {
        setStatus("Waiting for benchmark chat to initialize...");
        return;
      }

      setBusy(true);
      setStatus(`Inserting ${count.toLocaleString()} messages...`);

      try {
        const startedAt = performance.now();
        const baseTs = Date.now();

        for (let i = 0; i < count; i++) {
          db.insert(app.messages, {
            chat: benchmarkChatId,
            role: i % 2 === 0 ? "user" : "assistant",
            content: `Benchmark message ${i + 1} (${baseTs})`,
            created_at: new Date(baseTs + i).toISOString(),
          });

          if ((i + 1) % INSERT_CHUNK_SIZE === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        const elapsedMs = performance.now() - startedAt;
        setLastInsertMs(elapsedMs);
        setStatus(
          `Inserted ${count.toLocaleString()} messages in ${elapsedMs.toFixed(
            1
          )}ms`
        );
      } catch (error) {
        setStatus(
          error instanceof Error ? `Insert failed: ${error.message}` : "Insert failed."
        );
      } finally {
        setBusy(false);
      }
    },
    [benchmarkChatId, busy, db]
  );

  const clearAllMessages = useCallback(async () => {
    if (busy) return;

    setBusy(true);
    setStatus("Deleting all messages...");

    try {
      const rows = await db.all(app.messages);

      for (let i = 0; i < rows.length; i++) {
        db.deleteFrom(app.messages, rows[i].id);

        if ((i + 1) % INSERT_CHUNK_SIZE === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      setStatus(`Deleted ${rows.length.toLocaleString()} messages.`);
      setLastInsertMs(null);
    } catch (error) {
      setStatus(
        error instanceof Error ? `Delete failed: ${error.message}` : "Delete failed."
      );
    } finally {
      setBusy(false);
    }
  }, [busy, db]);

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col bg-white p-4 sm:p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Jazz2 Benchmark</h1>
          <p className="text-sm text-gray-600">
            Local Jazz benchmark only. This page does not call <code>/api/chat</code>.
          </p>
        </div>

        <Link href="/" className="text-sm text-blue-700 hover:underline">
          Back to chat
        </Link>
      </header>

      <section className="mb-4 rounded-lg border p-4">
        <p className="text-sm text-gray-700">
          Total messages: <span className="font-semibold">{totalCount.toLocaleString()}</span>
        </p>
        <p className="mt-1 text-sm text-gray-700">Status: {status}</p>
        {lastInsertMs !== null ? (
          <p className="mt-1 text-sm text-gray-700">
            Last insert time: {lastInsertMs.toFixed(1)}ms
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => void insertBulk(1000)} disabled={busy}>
            Insert 1,000
          </Button>
          <Button onClick={() => void insertBulk(10_000)} disabled={busy}>
            Insert 10,000
          </Button>
          <Button variant="outline" onClick={() => void clearAllMessages()} disabled={busy}>
            Delete all
          </Button>
        </div>
      </section>

      <section className="mb-4 rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-semibold">Order By</h2>
        <div className="flex flex-wrap gap-2">
          {ORDER_OPTIONS.map((option) => {
            const isActive =
              option.column === order.column && option.direction === order.direction;

            return (
              <Button
                key={`${option.column}-${option.direction}`}
                variant={isActive ? "default" : "outline"}
                disabled={busy}
                onClick={() => setOrder(option)}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border">
        <div className="border-b px-4 py-3 text-sm font-semibold">
          Preview ({preview.length.toLocaleString()} rows, max {PREVIEW_LIMIT})
        </div>

        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full table-auto text-left text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b">
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Created At</th>
                <th className="px-3 py-2">Content</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((message) => (
                <tr key={message.id} className="border-b align-top">
                  <td className="px-3 py-2">{message.role}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{message.created_at}</td>
                  <td className="px-3 py-2">{message.content}</td>
                </tr>
              ))}
              {preview.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-gray-500" colSpan={3}>
                    No messages yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
