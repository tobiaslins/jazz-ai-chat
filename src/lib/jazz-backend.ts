import { createJazzContext, type JazzClient } from "jazz-tools/backend";

import { app } from "../../schema1/app";

const DEFAULT_SERVER_URL = "http://127.0.0.1:1625";
const DEFAULT_BACKEND_DATA_PATH = `./data/backend-runtime-${process.pid}`;
const REQUIRED_APP_ID_ENV = "JAZZ_APP_ID";
const SYNC_TRACE_ENABLED = process.env.JAZZ_SYNC_TRACE === "1";
const APP_ID = process.env.JAZZ_APP_ID?.trim();

if (!APP_ID) {
  throw new Error(
    `[jazz-backend] Missing ${REQUIRED_APP_ID_ENV}. Set it in your environment before starting the app.`
  );
}

let fetchTracingInstalled = false;
installSyncFetchTracing();

const backendContext = createJazzContext({
  appId: APP_ID,
  app,
  driver: {
    type:'persistent',
    dataPath: process.env.JAZZ_BACKEND_DATA_PATH || DEFAULT_BACKEND_DATA_PATH,
  },
  serverUrl:
    process.env.JAZZ_SERVER_URL ||
    process.env.NEXT_PUBLIC_JAZZ_SERVER_URL ||
    DEFAULT_SERVER_URL,
  backendSecret: process.env.JAZZ_BACKEND_SECRET || "TEST_SECRET",
  env: process.env.NODE_ENV === "production" ? "prod" : "dev",
  userBranch: "main",
});



let jazzBackendClient: JazzClient | null = null;

export async function getJazzBackendClient() {
  if (!jazzBackendClient) {
    jazzBackendClient = backendContext.asBackend();
  }

  return jazzBackendClient;
}

export function getJazzBackendContext() {
  return backendContext;
}

function installSyncFetchTracing() {
  if (fetchTracingInstalled || !SYNC_TRACE_ENABLED || typeof globalThis.fetch !== "function") {
    return;
  }

  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = resolveFetchUrl(input);
    const isSyncRequest = url.includes("/sync");
    const requestBodySnippet =
      isSyncRequest && typeof init?.body === "string"
        ? init.body.slice(0, 300)
        : undefined;

    const response = await originalFetch(input, init);
    if (isSyncRequest) {
      const responseBody = !response.ok ? await safeReadResponseBody(response) : undefined;
      console.info("[jazz-sync-trace] /sync request", {
        method: init?.method ?? "GET",
        url,
        status: response.status,
        statusText: response.statusText,
        requestBodySnippet,
        responseBody,
      });
    }

    return response;
  };
  fetchTracingInstalled = true;
}

function resolveFetchUrl(input: RequestInfo | URL) {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

async function safeReadResponseBody(response: Response) {
  try {
    return (await response.clone().text()).slice(0, 500);
  } catch {
    return "<failed to read response body>";
  }
}
