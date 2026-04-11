"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, MousePointer2 } from "lucide-react";
import { useAll, useDb } from "jazz-tools/react";

import { app } from "../../../schema";
import { Button } from "@/components/ui/button";

const CURSOR_DEBUG =
  process.env.NEXT_PUBLIC_CHAT_DEBUG === "1" || process.env.NODE_ENV !== "production";
const CURSOR_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0891b2",
] as const;
const CURSOR_CLIENT_STORAGE_KEY = "jazz-ai-chat:cursor-demo-client-id";
const CURSOR_EXPIRY_MS = 10_000;
const CURSOR_HEARTBEAT_MS = 4_000;
const CURSOR_UPDATE_INTERVAL_MS = 40;
const DEFAULT_CURSOR_POINT = { x: 500, y: 500 };

type CursorPoint = {
  x: number;
  y: number;
};

export function RenderCursorRoom({ roomId }: { roomId: string }) {
  const db = useDb();
  const [clientId, setClientId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [localPoint, setLocalPoint] = useState<CursorPoint>(DEFAULT_CURSOR_POINT);
  const [hasLocalPoint, setHasLocalPoint] = useState(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const presenceIdRef = useRef<string | null>(null);
  const latestPointRef = useRef<CursorPoint>(DEFAULT_CURSOR_POINT);
  const flushTimerRef = useRef<number | null>(null);
  const updateInFlightRef = useRef(false);
  const pendingFlushRef = useRef(false);

  const roomQuery = useMemo(() => app.cursor_rooms.where({ id: roomId }).limit(1), [roomId]);
  const presencesQuery = useMemo(
    () => app.cursor_presences.where({ room: roomId }).orderBy("updated_at", "desc"),
    [roomId]
  );
  const roomRows = useAll(roomQuery);
  const presenceRows = useAll(presencesQuery) ?? [];
  const roomLoaded = roomRows !== undefined;
  const room = roomRows?.[0] ?? null;

  useEffect(() => {
    setClientId(getCursorClientId());
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const identity = useMemo(() => {
    if (!clientId) {
      return null;
    }

    const color = CURSOR_COLORS[hashString(clientId) % CURSOR_COLORS.length];
    return {
      color,
      label: `Guest ${clientId.slice(0, 4).toUpperCase()}`,
    };
  }, [clientId]);

  const presences = useMemo(() => {
    const latestByClient = new Map<string, (typeof presenceRows)[number]>();

    for (const presence of presenceRows) {
      const existing = latestByClient.get(presence.client_id);
      if (!existing || presence.updated_at > existing.updated_at) {
        latestByClient.set(presence.client_id, presence);
      }
    }

    return Array.from(latestByClient.values());
  }, [presenceRows]);

  const myPresence = useMemo(() => {
    if (!clientId) {
      return null;
    }

    return presences.find((presence) => presence.client_id === clientId) ?? null;
  }, [clientId, presences]);

  useEffect(() => {
    if (myPresence) {
      presenceIdRef.current = myPresence.id;
    }
  }, [myPresence]);

  useEffect(() => {
    if (!room || !clientId || !identity || myPresence) {
      return;
    }

    let cancelled = false;
    const nowIso = new Date().toISOString();

    void db
      .insertDurable(
        app.cursor_presences,
        {
          room: roomId,
          client_id: clientId,
          color: identity.color,
          label: identity.label,
          updated_at: nowIso,
          x: latestPointRef.current.x,
          y: latestPointRef.current.y,
        },
        { tier: "edge" }
      )
      .then((presence) => {
        if (cancelled) {
          return;
        }

        presenceIdRef.current = presence.id;
        debugLog("presence_created", { roomId, presenceId: presence.id, clientId });

        if (pendingFlushRef.current) {
          void flushPresence(
            db,
            presenceIdRef,
            latestPointRef,
            updateInFlightRef,
            pendingFlushRef
          );
        }
      })
      .catch((error) => {
        debugLog("presence_create_failed", {
          roomId,
          clientId,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, db, identity, myPresence, room, roomId]);

  useEffect(() => {
    if (!myPresence || !identity) {
      return;
    }

    if (myPresence.color === identity.color && myPresence.label === identity.label) {
      return;
    }

    void db
      .updateDurable(
        app.cursor_presences,
        myPresence.id,
        { color: identity.color, label: identity.label },
        { tier: "edge" }
      )
      .catch((error) => {
        debugLog("presence_identity_sync_failed", {
          roomId,
          presenceId: myPresence.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }, [db, identity, myPresence, roomId]);

  useEffect(() => {
    if (!myPresence) {
      return;
    }

    const heartbeat = window.setInterval(() => {
      queuePresenceFlush(flushTimerRef, pendingFlushRef, () => {
        void flushPresence(db, presenceIdRef, latestPointRef, updateInFlightRef, pendingFlushRef);
      }, 0);
    }, CURSOR_HEARTBEAT_MS);

    return () => {
      window.clearInterval(heartbeat);
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [db, myPresence]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCopied(false);
    }, 1500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [copied]);

  useEffect(() => {
    return () => {
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
      }
    };
  }, []);

  const activePresences = useMemo(() => {
    return presences.filter((presence) => now - Date.parse(presence.updated_at) <= CURSOR_EXPIRY_MS);
  }, [now, presences]);

  const visiblePresences = useMemo(() => {
    if (!clientId || !identity) {
      return activePresences;
    }

    let foundLocalPresence = false;
    const nextPresences = activePresences.map((presence) => {
      if (presence.client_id !== clientId) {
        return presence;
      }

      foundLocalPresence = true;
      if (!hasLocalPoint) {
        return presence;
      }

      return {
        ...presence,
        x: localPoint.x,
        y: localPoint.y,
      };
    });

    if (!foundLocalPresence && hasLocalPoint) {
      nextPresences.unshift({
        id: `local-preview-${clientId}`,
        room: roomId,
        client_id: clientId,
        color: identity.color,
        label: identity.label,
        updated_at: new Date(now).toISOString(),
        x: localPoint.x,
        y: localPoint.y,
      });
    }

    return nextPresences;
  }, [activePresences, clientId, hasLocalPoint, identity, localPoint.x, localPoint.y, now, roomId]);

  const renderedBoardPresences = useMemo(() => {
    if (!clientId) {
      return visiblePresences;
    }

    return visiblePresences.filter((presence) => presence.client_id !== clientId);
  }, [clientId, visiblePresences]);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const board = boardRef.current;
    if (!board) {
      return;
    }

    const rect = board.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const x = clampInt(((event.clientX - rect.left) / rect.width) * 1000, 0, 1000);
    const y = clampInt(((event.clientY - rect.top) / rect.height) * 1000, 0, 1000);
    latestPointRef.current = { x, y };
    setLocalPoint({ x, y });
    setHasLocalPoint(true);

    queuePresenceFlush(
      flushTimerRef,
      pendingFlushRef,
      () => {
        void flushPresence(db, presenceIdRef, latestPointRef, updateInFlightRef, pendingFlushRef);
      },
      CURSOR_UPDATE_INTERVAL_MS
    );
  }

  async function handleCopyLink() {
    if (typeof window === "undefined") {
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch (error) {
      debugLog("copy_link_failed", {
        roomId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="mb-4 flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-sky-300/80">
              <MousePointer2 className="h-4 w-4" />
              Cursor Sync Demo
            </div>
            <h1 className="text-xl font-semibold text-white">
              {room?.title ?? (roomLoaded ? "Cursor room" : "Loading room...")}
            </h1>
            <p className="text-sm text-slate-300">
              Share this room and move inside the board to broadcast your cursor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {visiblePresences.length} live
            </span>
            <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={handleCopyLink}>
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy room link"}
            </Button>
            <Link
              href="/cursor"
              className="rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
            >
              New room
            </Link>
            <Link
              href="/chat/new"
              className="rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
            >
              Back to chat
            </Link>
          </div>
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_280px]">
          <section
            ref={boardRef}
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerMove}
            className="relative min-h-[60vh] overflow-hidden rounded-[32px] border border-sky-400/30 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(12,18,32,0.92))] shadow-[0_20px_80px_rgba(8,47,73,0.45)]"
          >
            <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.09)_1px,transparent_1px)] bg-[size:56px_56px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.14),_transparent_55%)]" />

            {!roomLoaded ? (
              <div className="relative z-10 flex h-full items-center justify-center text-sm text-slate-300">
                Loading room...
              </div>
            ) : !room ? (
              <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-slate-300">
                <p>Room not found or not synced yet.</p>
                <Link href="/cursor" className="text-sky-300 hover:text-sky-200">
                  Create a new cursor room
                </Link>
              </div>
            ) : (
              <>
                <div className="relative z-10 flex h-full flex-col justify-between p-5 sm:p-6">
                  <div className="max-w-md space-y-2 rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.2em] text-sky-300/80">
                      Shared surface
                    </p>
                    <p className="text-sm text-slate-200">
                      Every active client writes normalized X/Y coordinates into Jazz. The markers below
                      are the live subscription result for this room.
                    </p>
                  </div>

                  <div className="text-xs text-slate-400">
                    Room ID: <span className="font-mono text-slate-300">{roomId}</span>
                  </div>
                </div>

                {renderedBoardPresences.map((presence) => {
                  const isMe = presence.client_id === clientId;
                  return (
                    <CursorMarker
                      key={presence.client_id}
                      color={presence.color}
                      isMe={isMe}
                      label={isMe ? `${presence.label} (you)` : presence.label}
                      x={presence.x}
                      y={presence.y}
                    />
                  );
                })}
              </>
            )}
          </section>

          <aside className="rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur">
            <h2 className="text-sm font-semibold text-white">Participants</h2>
            <div className="mt-4 space-y-3">
              {visiblePresences.length === 0 ? (
                <p className="text-sm text-slate-300">
                  Nobody is broadcasting yet. Move your pointer inside the board to join.
                </p>
              ) : (
                visiblePresences.map((presence) => {
                  const isMe = presence.client_id === clientId;
                  return (
                    <div
                      key={presence.client_id}
                      className="rounded-2xl border border-white/10 bg-slate-950/40 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: presence.color }}
                        />
                        <div>
                          <p className="text-sm font-medium text-white">
                            {presence.label}
                            {isMe ? " (you)" : ""}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatCursorPosition(presence.x, presence.y)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function CursorMarker({
  color,
  isMe,
  label,
  x,
  y,
}: {
  color: string;
  isMe: boolean;
  label: string;
  x: number;
  y: number;
}) {
  return (
    <div
      className="pointer-events-none absolute z-20 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-75 motion-safe:duration-200"
      style={{
        left: `${x / 10}%`,
        top: `${y / 10}%`,
        transition:
          isMe
            ? "left 90ms cubic-bezier(0.22, 1, 0.36, 1), top 90ms cubic-bezier(0.22, 1, 0.36, 1)"
            : "left 140ms cubic-bezier(0.22, 1, 0.36, 1), top 140ms cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "left, top",
      }}
    >
      <div className="-translate-x-[10%] -translate-y-[10%]">
        <div
          className="absolute left-1 top-1 h-6 w-6 rounded-full blur-md motion-safe:animate-ping"
          style={{ backgroundColor: color }}
        />

        <div className="relative flex items-start gap-2">
          <div className="rounded-full border border-white/30 bg-slate-950/75 p-1 shadow-lg">
            <MousePointer2 className="h-4 w-4" style={{ color }} fill={color} />
          </div>
          <div
            className={`rounded-full border px-2 py-1 text-xs font-medium shadow-lg ${
              isMe ? "border-white/40 bg-white text-slate-950" : "border-white/20 bg-slate-950/80 text-white"
            }`}
          >
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

function queuePresenceFlush(
  timerRef: React.MutableRefObject<number | null>,
  pendingFlushRef: React.MutableRefObject<boolean>,
  flush: () => void,
  delayMs: number
) {
  pendingFlushRef.current = true;

  if (timerRef.current !== null) {
    return;
  }

  timerRef.current = window.setTimeout(() => {
    timerRef.current = null;
    flush();
  }, delayMs);
}

async function flushPresence(
  db: ReturnType<typeof useDb>,
  presenceIdRef: React.MutableRefObject<string | null>,
  latestPointRef: React.MutableRefObject<CursorPoint>,
  updateInFlightRef: React.MutableRefObject<boolean>,
  pendingFlushRef: React.MutableRefObject<boolean>
) {
  const presenceId = presenceIdRef.current;
  if (!presenceId || !pendingFlushRef.current) {
    return;
  }

  if (updateInFlightRef.current) {
    return;
  }

  updateInFlightRef.current = true;
  pendingFlushRef.current = false;

  try {
    await db.updateDurable(
      app.cursor_presences,
      presenceId,
      {
        updated_at: new Date().toISOString(),
        x: latestPointRef.current.x,
        y: latestPointRef.current.y,
      },
      { tier: "edge" }
    );
  } catch (error) {
    debugLog("presence_update_failed", {
      presenceId,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    updateInFlightRef.current = false;

    if (pendingFlushRef.current) {
      await flushPresence(db, presenceIdRef, latestPointRef, updateInFlightRef, pendingFlushRef);
    }
  }
}

function getCursorClientId() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const existing = window.sessionStorage.getItem(CURSOR_CLIENT_STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const nextId = window.crypto.randomUUID();
    window.sessionStorage.setItem(CURSOR_CLIENT_STORAGE_KEY, nextId);
    return nextId;
  } catch {
    return createFallbackClientId();
  }
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function formatCursorPosition(x: number, y: number) {
  return `${(x / 10).toFixed(1)}%, ${(y / 10).toFixed(1)}%`;
}

function createFallbackClientId() {
  return `guest-${Math.random().toString(36).slice(2, 10)}`;
}

function debugLog(event: string, payload?: unknown) {
  if (!CURSOR_DEBUG) {
    return;
  }

  if (typeof payload === "undefined") {
    console.info(`[cursor-room] ${event}`);
    return;
  }

  console.info(`[cursor-room] ${event}`, payload);
}
