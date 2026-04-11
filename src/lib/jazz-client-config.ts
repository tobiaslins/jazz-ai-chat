const DEFAULT_SERVER_URL =
  process.env.NODE_ENV === "production" ? undefined : "http://127.0.0.1:1625";
const REQUIRED_PUBLIC_APP_ID_ENV = "NEXT_PUBLIC_JAZZ_APP_ID";
const PUBLIC_APP_ID = process.env.NEXT_PUBLIC_JAZZ_APP_ID?.trim();
const LOCAL_AUTH_TOKEN_STORAGE_PREFIX = "jazz-tools:local-auth-token:";
const SYNTHETIC_USERS_STORAGE_PREFIX = "jazz-tools:synthetic-users:";

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
  localAuthMode: "anonymous" as const,
};


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
  } catch {
    // Ignore localStorage access failures in restricted browser contexts.
  }
}
