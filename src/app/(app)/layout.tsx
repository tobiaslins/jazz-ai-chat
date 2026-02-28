"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createJazzClient,
  JazzProvider,
  type JazzClient,
} from "jazz-tools/react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [client, setClient] = useState<JazzClient | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientConfig = useMemo(
    () => ({
      appId:
        process.env.NEXT_PUBLIC_JAZZ_APP_ID ||
        "759301e8-cc0c-5b12-bd6f-81892d359dc0",
      serverUrl: process.env.NEXT_PUBLIC_JAZZ_SERVER_URL || undefined,
      localAuthMode: "anonymous" as const,
    }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    let created: JazzClient | null = null;

    installJazzWorkerFetchPatch();

    void createJazzClient(clientConfig)
      .then((nextClient) => {
        if (cancelled) {
          void nextClient.shutdown();
          return;
        }
        created = nextClient;
        setClient(nextClient);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to initialize Jazz");
      });

    return () => {
      cancelled = true;
      if (created) {
        void created.shutdown();
      }
    };
  }, [clientConfig]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-sm text-red-600">
        Jazz initialization failed: {error}
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-sm text-gray-600">
        Connecting to Jazz...
      </div>
    );
  }

  return <JazzProvider client={client}>{children}</JazzProvider>;
}

function installJazzWorkerFetchPatch() {
  const globalRef = globalThis as typeof globalThis & {
    __jazzWorkerPatchInstalled?: boolean;
    Worker: typeof Worker;
  };

  if (globalRef.__jazzWorkerPatchInstalled) return;
  if (typeof window === "undefined" || typeof Worker === "undefined") return;

  const OriginalWorker = Worker;

  class PatchedWorker extends OriginalWorker {
    constructor(scriptURL: string | URL, options?: WorkerOptions) {
      const target =
        typeof scriptURL === "string" ? scriptURL : scriptURL.toString();

      if (target.includes("jazz-worker.js")) {
        const bootstrap = `
const __jazzOriginalFetch = self.fetch.bind(self);
self.fetch = (input, init) => {
  if (typeof input === "string" && input.startsWith("/")) {
    input = new URL(input, self.location.origin).toString();
  }
  return __jazzOriginalFetch(input, init);
};
import(${JSON.stringify(target)});
`;

        const blobUrl = URL.createObjectURL(
          new Blob([bootstrap], { type: "text/javascript" })
        );

        super(blobUrl, { ...(options || {}), type: "module" });
        queueMicrotask(() => URL.revokeObjectURL(blobUrl));
        return;
      }

      super(scriptURL, options);
    }
  }

  globalRef.Worker = PatchedWorker as unknown as typeof Worker;
  globalRef.__jazzWorkerPatchInstalled = true;
}
