import { JazzClient, type AppContext } from "jazz-tools/backend";

import { app } from "../../schema/app";

const DEFAULT_APP_ID = "759301e8-cc0c-5b12-bd6f-81892d359dc0";
const DEFAULT_SERVER_URL = "http://127.0.0.1:1625";

const backendContext: AppContext = {
  appId:
    process.env.JAZZ_APP_ID ||
    process.env.NEXT_PUBLIC_JAZZ_APP_ID ||
    DEFAULT_APP_ID,
  schema: app.wasmSchema,
  serverUrl:
    process.env.JAZZ_SERVER_URL ||
    process.env.NEXT_PUBLIC_JAZZ_SERVER_URL ||
    DEFAULT_SERVER_URL,
  backendSecret: process.env.JAZZ_BACKEND_SECRET,
  localAuthMode: "anonymous",
  localAuthToken: "next-api-route-assistant",
  env: process.env.NODE_ENV === "production" ? "prod" : "dev",
  userBranch: "main",
};

let jazzBackendClientPromise: Promise<JazzClient> | null = null;

export function getJazzBackendClient() {
  if (!jazzBackendClientPromise) {
    jazzBackendClientPromise = JazzClient.connect(backendContext);
  }

  return jazzBackendClientPromise;
}
