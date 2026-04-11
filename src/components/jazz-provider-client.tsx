"use client";

import { useEffect, useState } from "react";
import {
  JazzProvider,
  createJazzClient,
  type JazzClient,
} from "jazz-tools/react";
import { APP_ID, jazzClientConfig } from "@/lib/jazz-client-config";

const STORAGE_CORRUPTION_MARKERS = [
  "opfs-btree: corrupt data",
  "no valid superblock found in non-empty file",
];

export default function JazzProviderClient({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
 
 
  return (
    <JazzProvider config={jazzClientConfig}>{children}</JazzProvider>
  );
}

async function initializeJazzClient() {
  try {
    return await createJazzClient(jazzClientConfig);
  } catch (error) {
    if (!isRecoverableStorageError(error)) {
      throw error;
    }

    console.warn(
      "[jazz-client] Detected corrupted OPFS storage. Clearing local Jazz browser storage and retrying once."
    );
    await clearJazzOpfsStorage(APP_ID);
    return await createJazzClient(jazzClientConfig);
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
