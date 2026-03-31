import { streamText } from "ai";
import { gateway, type GatewayModelId } from "@ai-sdk/gateway";
import type { Db, QueryOptions } from "jazz-tools/backend";

import { app } from "../../../../schema";
import { defaultModel } from "@/lib/models";
import { getJazzBackendDb, getJazzBackendContext } from "@/lib/jazz-backend";

const CHAT_DEBUG =
  process.env.JAZZ_CHAT_DEBUG === "1";
const QUERY_TIMEOUT_MS = parsePositiveInt(process.env.JAZZ_QUERY_TIMEOUT_MS, 6000);

type InputMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type MessageRow = {
  id: string;
  chat: string;
  role: string;
  content: string;
  created_at: string;
};

type QueryInput = { _build?: () => string } | string;

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();

  const body = (await request.json()) as {
    chatId?: string;
    latestUserMessage?: string;
    model?: string;
    sessionUserId?: string;
  };

  const chatId = typeof body.chatId === "string" ? body.chatId.trim() : "";
  if (!chatId) {
    return Response.json({ error: "chatId is required." }, { status: 400 });
  }

  const latestUserMessage =
    typeof body.latestUserMessage === "string"
      ? body.latestUserMessage.trim()
      : "";

  const modelId = (body.model || defaultModel) as GatewayModelId;
  const sessionUserId =
    typeof body.sessionUserId === "string" && body.sessionUserId.trim()
      ? body.sessionUserId.trim()
      : null;
  debugLog(requestId, "request_received", {
    chatId,
    hasLatestUserMessage: latestUserMessage.length > 0,
    latestUserMessageLength: latestUserMessage.length,
    modelId,
    sessionUserId,
  });

  try {
    const db = getJazzBackendDb();

    await generateAndPersistAssistantMessage(
      db,
      chatId,
      latestUserMessage,
      modelId,
      requestId,
      sessionUserId
    );
    debugLog(requestId, "request_completed", {
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate assistant response.";
    const statusCode = findErrorStatusCode(error);

    debugLog(requestId, "request_failed", {
      durationMs: Date.now() - startedAt,
      statusCode,
      error: summarizeError(error),
    });

    if (message.includes("ChatNotSyncedToEdge")) {
      return jsonWithRequestId(
        { error: "Chat is not synced to server yet. Please retry." },
        409,
        requestId
      );
    }

    if (message.includes("UuidForeignKeyViolation")) {
      return jsonWithRequestId(
        { error: "Chat is not synced to server yet. Please retry." },
        409,
        requestId
      );
    }

    if (statusCode === 429 || message.includes("429")) {
      return jsonWithRequestId(
        {
          error:
            "Upstream model returned a rate limit (429). Please retry in a few seconds.",
        },
        429,
        requestId
      );
    }

    return jsonWithRequestId({ error: message }, 500, requestId);
  }

  return new Response(null, {
    status: 202,
    headers: { "x-chat-request-id": requestId },
  });
}

async function generateAndPersistAssistantMessage(
  db: Db,
  chatId: string,
  latestUserMessage: string,
  modelId: GatewayModelId,
  requestId: string,
  sessionUserId: string | null
) {
  debugLog(requestId, "generation_started", {
    chatId,
    hasLatestUserMessage: latestUserMessage.length > 0,
    modelId,
    sessionUserId,
  });

  // TEMP DEBUG: bypass presence gating so we can verify history-query behavior.
  // Re-enable getChatPresence() and ChatNotSyncedToEdge guard after tracing.
  // const chatPresence = await getChatPresence(client, chatId, requestId).catch((error) => {
  //   console.error("error getting chat presence", error);
  //   throw error;
  // });
  // debugLog(requestId, "chat_presence", chatPresence);
  //
  // if (!chatPresence.existsDeferred) {
  //   throw new Error("ChatNotSyncedToEdge");
  // }

  const historyFromDb = await loadChatHistory(db, chatId, requestId);
  if (sessionUserId) {
    await debugCompareSessionVisibility(db, chatId, requestId, sessionUserId);
  }
  const messagesForModel = buildHistoryForModel(historyFromDb, latestUserMessage);
  debugLog(requestId, "history_loaded", {
    historyRows: historyFromDb.length,
    messagesForModel: messagesForModel.length,
  });

  if (messagesForModel.length === 0) {
    debugLog(requestId, "history_empty");
    return;
  }

  const createdAt = new Date().toISOString();
  const assistantId = await createAssistantPlaceholderWithRetry(
    db,
    chatId,
    createdAt,
    requestId
  );
  debugLog(requestId, "assistant_placeholder_created", { assistantId });

  try {
    const result = streamText({
      model: gateway(modelId),
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI assistant. Keep answers concise and practical.",
        },
        ...messagesForModel.slice(-20),
      ],
    });

    let text = "";
    let lastUpdateAt = 0;
    let chunkCount = 0;

    for await (const chunk of result.textStream) {
      chunkCount += 1;
      text += chunk;

      const now = Date.now();
      if (now - lastUpdateAt > 100) {
        db.update(app.messages, assistantId, { content: text });
        lastUpdateAt = now;
      }
    }

    await db.updateDurable(
      app.messages,
      assistantId,
      {
        content: text.trim()
          ? text
          : "Sorry, I couldn't generate a response. Please try again.",
      },
      { tier: "edge" }
    );
    debugLog(requestId, "assistant_stream_completed", {
      chunkCount,
      totalChars: text.length,
    });
  } catch (error) {
    debugLog(requestId, "assistant_stream_failed", {
      error: summarizeError(error),
      statusCode: findErrorStatusCode(error),
    });
    await db.updateDurable(
      app.messages,
      assistantId,
      {
        content: "Sorry, I couldn't generate a response. Please try again.",
      },
      { tier: "edge" }
    );
  }
}

async function createAssistantPlaceholderWithRetry(
  db: Db,
  chatId: string,
  createdAt: string,
  requestId: string
): Promise<string> {
  const maxAttempts = 4;
  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    try {
      const row = await db.insertDurable(
        app.messages,
        {
          chat: chatId,
          role: "assistant",
          content: "",
          created_at: createdAt,
        },
        { tier: "edge" }
      );
      return row.id;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const isForeignKeyRace = message.includes("UuidForeignKeyViolation");
      debugLog(requestId, "assistant_placeholder_retry", {
        attempt: attempt + 1,
        isForeignKeyRace,
        error: summarizeError(error),
      });

      if (!isForeignKeyRace || attempt === maxAttempts - 1) {
        throw error;
      }

      attempt += 1;
      await delay(150 * 2 ** attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to create assistant placeholder.");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadChatHistory(
  db: Db,
  chatId: string,
  requestId: string
): Promise<InputMessage[]> {
  const historyQuery = app.messages
    .where({ chat: chatId })
    .orderBy("created_at", "asc")
    .limit(40);
  const options = { tier: "edge", localUpdates: "deferred" } as const;
  const rows = await runTimedQuery(
    () => db.all(historyQuery, options),
    historyQuery,
    options,
    requestId,
    "history_query"
  );
  debugLog(requestId, "history_query_result", { chatId, rowCount: rows.length });

  return rows
    .map((message) => ({
      role: normalizeRole(message.role),
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0);
}

async function debugCompareSessionVisibility(
  backendDb: Db,
  chatId: string,
  requestId: string,
  sessionUserId: string
) {
  const sessionDb = getJazzBackendContext().forSession({
    user_id: sessionUserId,
    claims: {},
  });
  const chatQuery = app.chats.where({ id: chatId }).limit(1);
  const messageQuery = app.messages.where({ chat: chatId }).limit(1);
  const options = { tier: "edge", localUpdates: "deferred" } as const;

  const [backendChatRows, sessionChatRows, backendMessageRows, sessionMessageRows] =
    await Promise.all([
      runTimedQuery(
        () => backendDb.all(chatQuery, options),
        chatQuery,
        options,
        requestId,
        "debug_backend_chat_visibility"
      ),
      runTimedQuery(
        () => sessionDb.all(chatQuery, options),
        chatQuery,
        options,
        requestId,
        "debug_session_chat_visibility"
      ),
      runTimedQuery(
        () => backendDb.all(messageQuery, options),
        messageQuery,
        options,
        requestId,
        "debug_backend_message_visibility"
      ),
      runTimedQuery(
        () => sessionDb.all(messageQuery, options),
        messageQuery,
        options,
        requestId,
        "debug_session_message_visibility"
      ),
    ]);

  debugLog(requestId, "debug_visibility_comparison", {
    chatId,
    sessionUserId,
    backendChatRows: backendChatRows.length,
    sessionChatRows: sessionChatRows.length,
    backendMessageRows: backendMessageRows.length,
    sessionMessageRows: sessionMessageRows.length,
  });
}

function buildHistoryForModel(
  historyFromDb: InputMessage[],
  latestUserMessage: string
): InputMessage[] {
  const history = [...historyFromDb];
  if (!latestUserMessage) {
    return history;
  }

  const lastMessage = history[history.length - 1];
  const alreadyPresent =
    lastMessage?.role === "user" && lastMessage.content === latestUserMessage;

  if (!alreadyPresent) {
    history.push({ role: "user", content: latestUserMessage });
  }

  return history;
}

function normalizeRole(role: string): InputMessage["role"] {
  if (role === "assistant" || role === "system" || role === "user") {
    return role;
  }
  return "user";
}

async function getChatPresence(db: Db, chatId: string, requestId: string) {
  const chatQuery = app.chats.where({ id: chatId }).limit(1);
  const recentQuery = app.chats.orderBy("created_at", "desc").limit(5);
  const immediateOptions = {
    tier: "edge",
    localUpdates: "immediate",
  } as const;
  const deferredOptions = {
    tier: "edge",
    localUpdates: "deferred",
  } as const;

  const immediateRows = await runTimedQuery(
    () => db.all(chatQuery, immediateOptions),
    chatQuery,
    immediateOptions,
    requestId,
    "chat_presence_immediate"
  );

  const deferredRows = await runTimedQuery(
    () => db.all(chatQuery, deferredOptions),
    chatQuery,
    deferredOptions,
    requestId,
    "chat_presence_deferred"
  );

  const recentDeferredRows = await runTimedQuery(
    () => db.all(recentQuery, deferredOptions),
    recentQuery,
    deferredOptions,
    requestId,
    "chat_presence_recent_deferred"
  );

  return {
    chatId,
    existsImmediate: immediateRows.length > 0,
    existsDeferred: deferredRows.length > 0,
    recentDeferredChatIds: recentDeferredRows.map((row) => row.id),
  };
}

async function runTimedQuery<TRow>(
  execute: () => Promise<TRow[]>,
  query: QueryInput,
  options: QueryOptions,
  requestId: string,
  label: string
): Promise<TRow[]> {
  const startedAt = Date.now();
  const querySummary = summarizeQuery(query);
  debugLog(requestId, `${label}_start`, {
    timeoutMs: QUERY_TIMEOUT_MS,
    options,
    query: querySummary,
  });

  try {
    const rows = await withTimeout(
      execute(),
      QUERY_TIMEOUT_MS,
      `${label} timed out after ${QUERY_TIMEOUT_MS}ms`
    );

    debugLog(requestId, `${label}_ok`, {
      durationMs: Date.now() - startedAt,
      rowCount: rows.length,
    });
    return rows;
  } catch (error) {
    debugLog(requestId, `${label}_error`, {
      durationMs: Date.now() - startedAt,
      options,
      query: querySummary,
      error: summarizeError(error),
    });
    throw error;
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(message));
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

function summarizeQuery(query: QueryInput) {
  const rawQuery = safeBuildQuery(query);
  if (!rawQuery) {
    return { kind: typeof query };
  }

  try {
    const parsed = JSON.parse(rawQuery) as Record<string, unknown>;
    const relationIr =
      typeof parsed.relation_ir === "object" && parsed.relation_ir !== null
        ? (parsed.relation_ir as Record<string, unknown>)
        : null;

    return {
      table: parsed.table ?? relationIr?.table ?? null,
      conditions: parsed.conditions ?? relationIr?.filters ?? [],
      orderBy: parsed.orderBy ?? relationIr?.order_by ?? [],
      limit: parsed.limit ?? relationIr?.limit ?? null,
      hops: parsed.hops ?? relationIr?.hops ?? [],
    };
  } catch {
    return { rawQuery };
  }
}

function safeBuildQuery(query: QueryInput): string | null {
  if (typeof query === "string") {
    return query;
  }

  if (!query || typeof query !== "object") {
    return null;
  }

  const withBuilder = query as { _build?: () => string };
  if (typeof withBuilder._build !== "function") {
    return null;
  }

  try {
    return withBuilder._build();
  } catch {
    return null;
  }
}

function createRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function jsonWithRequestId(body: unknown, status: number, requestId: string) {
  return Response.json(body, {
    status,
    headers: {
      "x-chat-request-id": requestId,
    },
  });
}

function debugLog(requestId: string, event: string, payload?: unknown) {
  if (!CHAT_DEBUG) {
    return;
  }

  if (typeof payload === "undefined") {
    console.info(`[api/chat][${requestId}] ${event}`);
    return;
  }

  console.info(`[api/chat][${requestId}] ${event}`, payload);
}

function summarizeError(error: unknown) {
  if (!(error instanceof Error)) {
    return { nonError: String(error) };
  }

  const summary: Record<string, unknown> = {
    name: error.name,
    message: error.message,
    stack: error.stack?.split("\n").slice(0, 2).join(" | "),
  };

  const record = error as Error & { status?: unknown; statusCode?: unknown; code?: unknown };
  if (typeof record.statusCode !== "undefined") {
    summary.statusCode = record.statusCode;
  }
  if (typeof record.status !== "undefined") {
    summary.status = record.status;
  }
  if (typeof record.code !== "undefined") {
    summary.code = record.code;
  }

  return summary;
}

function findErrorStatusCode(error: unknown): number | null {
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) {
      continue;
    }

    seen.add(current);
    const record = current as Record<string, unknown>;

    for (const key of ["statusCode", "status"]) {
      const value = record[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    for (const key of ["cause", "response", "error"]) {
      const value = record[key];
      if (typeof value === "object" && value !== null) {
        queue.push(value);
      }
    }
  }

  return null;
}
