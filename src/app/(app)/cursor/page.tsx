"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDb, useSession } from "jazz-tools/react";

import { app } from "../../../../schema";

const CURSOR_DEBUG =
  process.env.NEXT_PUBLIC_CHAT_DEBUG === "1" || process.env.NODE_ENV !== "production";

export default function NewCursorPage() {
  const db = useDb();
  const session = useSession();
  const sessionUserId = session?.user_id ?? null;
  const router = useRouter();
  const createRoomPromiseRef = useRef<Promise<{ roomId: string; title: string }> | null>(null);
  const syncStartedRef = useRef(false);

  useEffect(() => {
    if (!sessionUserId) {
      return;
    }

    let isActive = true;

    if (!createRoomPromiseRef.current) {
      const now = new Date().toISOString();
      const roomData = {
        title: "Cursor demo",
        created_at: now,
        owner_id: sessionUserId,
      };

      createRoomPromiseRef.current = db
        .insertDurable(app.cursor_rooms, roomData, { tier: "edge" })
        .then((room) => ({ roomId: room.id, title: roomData.title }));
      debugLog("cursor_room_create_started");
    }

    void createRoomPromiseRef.current
      .then(({ roomId, title }) => {
        debugLog("cursor_room_created_local", { roomId });

        if (isActive) {
          router.replace(`/cursor/${roomId}`);
        }

        if (!syncStartedRef.current) {
          syncStartedRef.current = true;
          void withTimeout(
            db.updateDurable(app.cursor_rooms, roomId, { title }, { tier: "edge" }),
            3000
          )
            .then(() => {
              debugLog("cursor_room_synced_edge", { roomId });
            })
            .catch((error) => {
              debugLog("cursor_room_sync_edge_failed", {
                roomId,
                error: error instanceof Error ? error.message : String(error),
              });
            });
        }
      })
      .catch((error) => {
        debugLog("cursor_room_create_failed", {
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
      Creating cursor room...
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
  if (!CURSOR_DEBUG) {
    return;
  }

  if (typeof payload === "undefined") {
    console.info(`[cursor-new] ${event}`);
    return;
  }

  console.info(`[cursor-new] ${event}`, payload);
}
