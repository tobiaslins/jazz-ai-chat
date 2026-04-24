const DEFAULT_SERVER_URL =
  "https://v2.sync.jazz.tools/";
const REQUIRED_PUBLIC_APP_ID_ENV = "NEXT_PUBLIC_JAZZ_APP_ID";
const PUBLIC_APP_ID = process.env.NEXT_PUBLIC_JAZZ_APP_ID?.trim();
const LOCAL_AUTH_TOKEN_STORAGE_PREFIX = "jazz-tools:local-auth-token:";
const SYNTHETIC_USERS_STORAGE_PREFIX = "jazz-tools:synthetic-users:";
const LOCAL_FIRST_SECRET_STORAGE_PREFIX = "jazz-auth-secret:";

if (!PUBLIC_APP_ID) {
  throw new Error(
    `[jazz-client] Missing ${REQUIRED_PUBLIC_APP_ID_ENV}. Set it in your environment before starting the app.`
  );
}

export const APP_ID = PUBLIC_APP_ID;

export const jazzClientConfig = {
  appId: APP_ID,
  serverUrl: process.env.NEXT_PUBLIC_JAZZ_SERVER_URL || DEFAULT_SERVER_URL,
  env: process.env.NODE_ENV === "production" ? "prod" : "dev",
  userBranch: "main",
  runtimeSources: {
    workerUrl: "/jazz-runtime/worker/jazz-worker.js",
    wasmUrl: "/jazz-runtime/pkg/jazz_wasm_bg.wasm",
  },
};

export function getJazzAuthSecretStorageKey(appId = APP_ID) {
  return `${LOCAL_FIRST_SECRET_STORAGE_PREFIX}${appId}`;
}

export function clearJazzBrowserIdentityStorage(appId = APP_ID) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(
      `${LOCAL_AUTH_TOKEN_STORAGE_PREFIX}${appId}:anonymous`
    );
    window.localStorage.removeItem(`${LOCAL_AUTH_TOKEN_STORAGE_PREFIX}${appId}:demo`);
    window.localStorage.removeItem(`${SYNTHETIC_USERS_STORAGE_PREFIX}${appId}`);
    window.localStorage.removeItem(getJazzAuthSecretStorageKey(appId));
  } catch {
    // Ignore localStorage access failures in restricted browser contexts.
  }
}
