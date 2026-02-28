import { JazzClient } from "jazz-tools/backend";

import { app } from "../../schema/app";

const DEFAULT_APP_ID = "759301e8-cc0c-5b12-bd6f-81892d359dc0";
const DEFAULT_SERVER_URL = "http://127.0.0.1:1625";

let jazzBackendClientPromise: Promise<JazzClient> | null = null;

export function getJazzBackendClient() {
  if (!jazzBackendClientPromise) {
    const appId = process.env.NEXT_PUBLIC_JAZZ_APP_ID || DEFAULT_APP_ID;
    const serverUrl =
      process.env.NEXT_PUBLIC_JAZZ_SERVER_URL || DEFAULT_SERVER_URL;

    jazzBackendClientPromise = JazzClient.connect({
      appId,
      schema: app.wasmSchema,
      serverUrl,
      localAuthMode: "anonymous",
      localAuthToken: "next-api-route-assistant",
      env: process.env.NODE_ENV === "production" ? "prod" : "dev",
      userBranch: "main",
    });
  }

  return jazzBackendClientPromise;
}
