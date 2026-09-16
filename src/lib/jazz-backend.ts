import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import type { Db, JazzClient } from "jazz-tools/backend";

import { app } from "../../schema";
import permissions from "../../permissions";

const DEFAULT_SERVER_URL = "https://v2.sync.jazz.tools/";
const REQUIRED_APP_ID_ENV = "JAZZ_APP_ID";
const REQUIRED_BACKEND_SECRET_ENV = "JAZZ_BACKEND_SECRET";
const JAZZ_NAPI_PACKAGE_NAME = "@garden-co/jazz-napi-linux-x64-gnu";
const JAZZ_NAPI_PACKAGE_DIR = "jazz-napi-linux-x64-gnu";
const JAZZ_NAPI_BINARY = "jazz-napi.linux-x64-gnu.node";
const SYNC_TRACE_ENABLED = process.env.JAZZ_SYNC_TRACE === "1";
const APP_ID = process.env.JAZZ_APP_ID?.trim();
const SERVER_URL =
  process.env.JAZZ_SERVER_URL ||
  process.env.NEXT_PUBLIC_JAZZ_SERVER_URL ||
  DEFAULT_SERVER_URL;
const BACKEND_SECRET =
  process.env.JAZZ_BACKEND_SECRET?.trim() ||
  (isLocalJazzServerUrl(SERVER_URL) ? "TEST_SECRET" : undefined);

if (!APP_ID) {
  throw new Error(
    `[jazz-backend] Missing ${REQUIRED_APP_ID_ENV}. Set it in your environment before starting the app.`
  );
}

if (!BACKEND_SECRET) {
  throw new Error(
    `[jazz-backend] Missing ${REQUIRED_BACKEND_SECRET_ENV}. Set it to your Jazz Cloud backend secret before starting the app.`
  );
}

const JAZZ_APP_ID = APP_ID;
const JAZZ_BACKEND_SECRET = BACKEND_SECRET;

let fetchTracingInstalled = false;
installSyncFetchTracing();

type JazzBackendModule = typeof import("jazz-tools/backend");
type BackendSession = Awaited<ReturnType<JazzBackendModule["createJazzSession"]>>;

let backendSessionPromise: Promise<BackendSession> | null = null;

let jazzBackendClient: JazzClient | null = null;

function getBackendSession() {
  if (!backendSessionPromise) {
    configureJazzNapiBinding();
    backendSessionPromise = import("jazz-tools/backend").then(({ createJazzSession }) =>
      createJazzSession({
        appId: JAZZ_APP_ID,
        app,
        permissions,
        driver: {
          type: "memory",
        },
        serverUrl: SERVER_URL,
        initial: { backendSecret: JAZZ_BACKEND_SECRET },
        env: process.env.NODE_ENV === "production" ? "prod" : "dev",
      })
    );
  }

  return backendSessionPromise;
}

export async function getJazzBackendClient() {
  if (!jazzBackendClient) {
    const backendSession = await getBackendSession();
    const snapshot = backendSession.getSnapshot();
    if (snapshot.status !== "ready" || !snapshot.client) {
      throw new Error(`Jazz backend session is not ready: ${snapshot.status}`);
    }
    jazzBackendClient = snapshot.client;
  }

  return jazzBackendClient;
}

export async function getJazzBackendDb(): Promise<Db> {
  return (await getJazzBackendClient()).db;
}

function configureJazzNapiBinding() {
  if (
    process.platform !== "linux" ||
    process.arch !== "x64" ||
    process.env.NAPI_RS_NATIVE_LIBRARY_PATH
  ) {
    return;
  }

  const bindingPath = findJazzNapiBindingPath();
  if (bindingPath) {
    process.env.NAPI_RS_NATIVE_LIBRARY_PATH = bindingPath;
  }
}

function findJazzNapiBindingPath() {
  const nodeModulesPath = path.join(process.cwd(), "node_modules");
  const directPackagePath = path.join(
    nodeModulesPath,
    "@garden-co",
    JAZZ_NAPI_PACKAGE_DIR,
    JAZZ_NAPI_BINARY
  );
  if (existsSync(directPackagePath)) {
    return directPackagePath;
  }

  const pnpmStorePath = path.join(nodeModulesPath, ".pnpm");
  let pnpmPackageNames: string[] = [];
  try {
    pnpmPackageNames = readdirSync(pnpmStorePath);
  } catch {
    return null;
  }

  const pnpmPackageName = pnpmPackageNames.find((name) =>
    name.startsWith(`${JAZZ_NAPI_PACKAGE_NAME.replace("/", "+")}@`)
  );
  if (!pnpmPackageName) {
    return null;
  }

  const pnpmPackagePath = path.join(
    pnpmStorePath,
    pnpmPackageName,
    "node_modules",
    "@garden-co",
    JAZZ_NAPI_PACKAGE_DIR,
    JAZZ_NAPI_BINARY
  );

  return existsSync(pnpmPackagePath) ? pnpmPackagePath : null;
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

function isLocalJazzServerUrl(url: string) {
  return url.startsWith("http://127.0.0.1:") || url.startsWith("http://localhost:");
}
