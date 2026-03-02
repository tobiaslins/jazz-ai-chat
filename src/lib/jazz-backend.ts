import {
  JazzClient,
  type AppContext,
  type Value,
  type Row,
} from "jazz-tools/backend";

import { app } from "../../schema/app";

const DEFAULT_APP_ID = "759301e8-cc0c-5b12-bd6f-81892d359dc0";
const DEFAULT_SERVER_URL = "http://127.0.0.1:1625";

export type BackendRequester = {
  create: (table: string, values: Value[]) => Promise<string>;
  query: (query: string) => Promise<Row[]>;
  update: (objectId: string, updates: Record<string, Value>) => Promise<void>;
};

export const backendContext: AppContext = {
  appId:
    process.env.JAZZ_APP_ID ||
    process.env.NEXT_PUBLIC_JAZZ_APP_ID ||
    DEFAULT_APP_ID,
  schema: app.wasmSchema,
  serverUrl:
    process.env.JAZZ_SERVER_URL ||
    process.env.NEXT_PUBLIC_JAZZ_SERVER_URL ||
    DEFAULT_SERVER_URL,
  backendSecret: 'TEST_SECRET',
  env: process.env.NODE_ENV === "production" ? "prod" : "dev",
  userBranch: "main",
  localAuthMode: "anonymous",
  localAuthToken: "next-api-route-assistant",
};


let jazzBackendClientPromise: Promise<JazzClient> | null = null;

export async function getJazzBackendClient() {
  console.log("backendContext", backendContext);

  if (!jazzBackendClientPromise) {
    jazzBackendClientPromise = JazzClient.connect(backendContext).catch((error) => {
      jazzBackendClientPromise = null;
      throw error;
    });
  }

  return jazzBackendClientPromise;
}

function wrapClient(client: JazzClient): BackendRequester {
  return {
    async create(table, values) {
      return Promise.resolve(client.create(table, values));
    },
    async query(query) {
      return client.query(query);
    },
    async update(objectId, updates) {
      await Promise.resolve(client.update(objectId, updates));
    },
  };
}

export async function getJazzBackendRequester(): Promise<BackendRequester> {
  const client = await getJazzBackendClient();


  return wrapClient(client);
}
