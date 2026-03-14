"use client";

import { useEffect, useState } from "react";
import {
  JazzClientProvider,
  createJazzClient,
  type JazzClient,
} from "jazz-tools/react";

const DEFAULT_SERVER_URL =
  process.env.NODE_ENV === "production" ? undefined : "http://127.0.0.1:1625";
const REQUIRED_PUBLIC_APP_ID_ENV = "NEXT_PUBLIC_JAZZ_APP_ID";
const PUBLIC_APP_ID = process.env.NEXT_PUBLIC_JAZZ_APP_ID?.trim();
const STORAGE_CORRUPTION_MARKERS = [
  "opfs-btree: corrupt data",
  "no valid superblock found in non-empty file",
];

if (!PUBLIC_APP_ID) {
  throw new Error(
    `[jazz-client] Missing ${REQUIRED_PUBLIC_APP_ID_ENV}. Set it in your environment before starting the app.`
  );
}

const APP_ID = PUBLIC_APP_ID;

const clientConfig = {
  appId: APP_ID,
  serverUrl: process.env.NEXT_PUBLIC_JAZZ_SERVER_URL || DEFAULT_SERVER_URL,
  env: process.env.NODE_ENV === "production" ? "prod" : "dev",
  userBranch: "main",
  localAuthMode: "anonymous" as const,
};

export default function JazzProviderClient({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [client, setClient] = useState<JazzClient | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    let resolvedClient: JazzClient | null = null;

    void initializeJazzClient()
      .then((nextClient) => {
        resolvedClient = nextClient;
        if (active) {
          setClient(nextClient);
          return;
        }

        void nextClient.shutdown();
      })
      .catch((nextError) => {
        if (!active) {
          return;
        }

        setError(asError(nextError));
      });

    return () => {
      active = false;
      if (resolvedClient) {
        void resolvedClient.shutdown();
      }
    };
  }, []);

  if (error) {
    throw error;
  }

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-sm text-gray-600">
        Initializing Jazz...
      </div>
    );
  }

  return (
    <JazzClientProvider client={client}>{children}</JazzClientProvider>
  );
}

async function initializeJazzClient() {
  try {
    return await createJazzClient(clientConfig);
  } catch (error) {
    if (!isRecoverableStorageError(error)) {
      throw error;
    }

    console.warn(
      "[jazz-client] Detected corrupted OPFS storage. Clearing local Jazz browser storage and retrying once."
    );
    await clearJazzOpfsStorage(APP_ID);
    return await createJazzClient(clientConfig);
  }
}

function isRecoverableStorageError(error: unknown) {
  const message = asError(error).message.toLowerCase();
  return STORAGE_CORRUPTION_MARKERS.some((marker) =>
    message.includes(marker.toLowerCase())
  );
}

async function clearJazzOpfsStorage(appId: string) {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.storage?.getDirectory !== "function"
  ) {
    throw new Error(
      "Jazz browser storage is corrupted, but OPFS is not available to clear automatically in this environment."
    );
  }

  const rootDirectory = await navigator.storage.getDirectory();
  const fileSuffix = ".opfsbtree";
  const matchingEntries: string[] = [];
  const directoryWithEntries = rootDirectory as FileSystemDirectoryHandle & {
    entries(): AsyncIterable<[string, FileSystemHandle]>;
  };

  for await (const [entryName] of directoryWithEntries.entries()) {
    if (
      entryName.startsWith(appId) &&
      entryName.endsWith(fileSuffix)
    ) {
      matchingEntries.push(entryName);
    }
  }

  await Promise.all(
    matchingEntries.map(async (entryName) => {
      try {
        await rootDirectory.removeEntry(entryName, { recursive: false });
      } catch (error) {
        const message = asError(error).message;
        throw new Error(
          `Failed to clear corrupted Jazz browser storage (${entryName}). ${message}`
        );
      }
    })
  );
}

function asError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}
