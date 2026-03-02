import { streamText } from "ai";
import { gateway, type GatewayModelId } from "@ai-sdk/gateway";
import { transformRows, translateQuery } from "jazz-tools/backend";

import { app } from "../../../../schema/app";
import { defaultModel } from "@/lib/models";
import {
  backendContext,
  getJazzBackendClient,
  getJazzBackendRequester,
  type BackendRequester,
} from "@/lib/jazz-backend";

const CHAT_DEBUG =
  process.env.JAZZ_CHAT_DEBUG === "1" || process.env.NODE_ENV !== "production";

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

import { deriveLocalPrincipalId } from "jazz-tools/backend";

export async function POST(request: Request) {
  // const requestId = createRequestId();
  // const startedAt = Date.now();

  // const body = (await request.json()) as {
  //   chatId?: string;
  //   latestUserMessage?: string;
  //   model?: string;
  // };

  const jazzBackendClient = await getJazzBackendClient();


  const userId = await deriveLocalPrincipalId(
    backendContext.appId,
    "anonymous",
    "next-api-route-assistant",
  );

  console.log({userId});
  
  const scoped = await jazzBackendClient.forSession({
    user_id: userId,
    claims: { auth_mode: "local", local_mode: "anonymous" },
  });
  
  const rows = await scoped.query(app.messages.where({}));

  console.log(rows);

  return Response.json({ rows });


  // const chatId = typeof body.chatId === "string" ? body.chatId.trim() : "";
  // if (!chatId) {
  //   return Response.json({ error: "chatId is required." }, { status: 400 });
  // }

  // const latestUserMessage =
  //   typeof body.latestUserMessage === "string"
  //     ? body.latestUserMessage.trim()
  //     : "";

  // const modelId = (body.model || defaultModel) as GatewayModelId;
  // debugLog(requestId, "request_received", {
  //   chatId,
  //   hasLatestUserMessage: latestUserMessage.length > 0,
  //   latestUserMessageLength: latestUserMessage.length,
  //   modelId,
  // });

  // try {
  //   const requester = await getJazzBackendRequester();
  //   await generateAndPersistAssistantMessage(
  //     requester,
  //     chatId,
  //     latestUserMessage,
  //     modelId,
  //     requestId
  //   );
  //   debugLog(requestId, "request_completed", {
  //     durationMs: Date.now() - startedAt,
  //   });
  // } catch (error) {
  //   const message =
  //     error instanceof Error ? error.message : "Failed to generate assistant response.";
  //   const statusCode = findErrorStatusCode(error);

  //   debugLog(requestId, "request_failed", {
  //     durationMs: Date.now() - startedAt,
  //     statusCode,
  //     error: summarizeError(error),
  //   });

  //   if (message.includes("UuidForeignKeyViolation")) {
  //     return jsonWithRequestId(
  //       { error: "Chat is not synced to server yet. Please retry." },
  //       409,
  //       requestId
  //     );
  //   }

  //   if (statusCode === 429 || message.includes("429")) {
  //     return jsonWithRequestId(
  //       {
  //         error:
  //           "Upstream model returned a rate limit (429). Please retry in a few seconds.",
  //       },
  //       429,
  //       requestId
  //     );
  //   }

  //   return jsonWithRequestId({ error: message }, 500, requestId);
  // }

  // return new Response(null, {
  //   status: 202,
  //   headers: { "x-chat-request-id": requestId },
  // });
}

async function generateAndPersistAssistantMessage(
  requester: BackendRequester,
  chatId: string,
  latestUserMessage: string,
  modelId: GatewayModelId,
  requestId: string
) {
  const historyFromDb = await loadChatHistory(requester, chatId, requestId);


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
    requester,
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
        await requester.update(assistantId, {
          content: { type: "Text", value: text },
        });
        lastUpdateAt = now;
      }
    }

    await requester.update(assistantId, {
      content: {
        type: "Text",
        value: text.trim()
          ? text
          : "Sorry, I couldn't generate a response. Please try again.",
      },
    });
    debugLog(requestId, "assistant_stream_completed", {
      chunkCount,
      totalChars: text.length,
    });
  } catch (error) {
    debugLog(requestId, "assistant_stream_failed", {
      error: summarizeError(error),
      statusCode: findErrorStatusCode(error),
    });
    await requester.update(assistantId, {
      content: {
        type: "Text",
        value: "Sorry, I couldn't generate a response. Please try again.",
      },
    });
  }
}

async function createAssistantPlaceholderWithRetry(
  requester: BackendRequester,
  chatId: string,
  createdAt: string,
  requestId: string
): Promise<string> {
  const maxAttempts = 4;
  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    try {
      return requester.create("messages", [
        { type: "Uuid", value: chatId },
        { type: "Text", value: "assistant" },
        { type: "Text", value: "" },
        { type: "Text", value: createdAt },
      ]);
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
  requester: BackendRequester,
  chatId: string,
  requestId: string
): Promise<InputMessage[]> {
  const builder = app.messages.where({ chat: chatId }).orderBy("created_at", "asc").limit(40);
  const rows = await requester.query(translateQuery(builder._build(), app.wasmSchema));
  debugLog(requestId, "history_query_result", { chatId, rowCount: rows.length });

  const messages = transformRows<MessageRow>(rows, app.wasmSchema, "messages");

  console.log(messages);

  return messages
    .map((message) => ({
      role: normalizeRole(message.role),
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0);
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

function createRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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
