import {
  JazzClient,
  type AppContext,
} from "jazz-tools";

import { app } from "../../schema/app";

const DEFAULT_SERVER_URL = "http://127.0.0.1:1625";
const REQUIRED_APP_ID_ENV = "JAZZ_APP_ID";
const APP_ID = process.env.JAZZ_APP_ID?.trim();

if (!APP_ID) {
  throw new Error(
    `[jazz-backend] Missing ${REQUIRED_APP_ID_ENV}. Set it in your environment before starting the app.`
  );
}

export const backendContext: AppContext = {
  appId: APP_ID,
  schema: app.wasmSchema,
  serverUrl:
    process.env.JAZZ_SERVER_URL ||
    process.env.NEXT_PUBLIC_JAZZ_SERVER_URL ||
    DEFAULT_SERVER_URL,
  backendSecret: process.env.JAZZ_BACKEND_SECRET || "TEST_SECRET",
  env: process.env.NODE_ENV === "production" ? "prod" : "dev",
  userBranch: "main",
  localAuthMode: "anonymous",
  localAuthToken: "next-api-route-assistant",
};

let jazzBackendClientPromise: Promise<JazzClient> | null = null;

export async function getJazzBackendClient() {
  if (!jazzBackendClientPromise) {
    jazzBackendClientPromise = JazzClient.connect(backendContext)
      .then((client) => client.asBackend())
      .catch((error) => {
        jazzBackendClientPromise = null;
        throw error;
      });
  }

  return jazzBackendClientPromise;
}
