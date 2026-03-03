"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createJazzClient,
  JazzProvider,
  type JazzClient,
} from "jazz-tools/react";

const DEFAULT_APP_ID = "759301e8-cc0c-5b12-bd6f-81892d359dc0";
const DEFAULT_SERVER_URL =
  process.env.NODE_ENV === "production" ? undefined : "http://127.0.0.1:1625";

let sharedClientPromise: Promise<JazzClient> | null = null;
let sharedClientConfigKey: string | null = null;



function getSharedJazzClient(
  config: Parameters<typeof createJazzClient>[0]
): Promise<JazzClient> {
  const key = JSON.stringify(config);

  if (!sharedClientPromise || sharedClientConfigKey !== key) {
    sharedClientConfigKey = key;
    sharedClientPromise = createJazzClient(config).catch((error) => {
      if (sharedClientConfigKey === key) {
        sharedClientPromise = null;
      }
      throw error;
    });
  }

  return sharedClientPromise;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [client, setClient] = useState<JazzClient | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientConfig = useMemo(
    () => ({
      appId: process.env.NEXT_PUBLIC_JAZZ_APP_ID || DEFAULT_APP_ID,
      serverUrl: process.env.NEXT_PUBLIC_JAZZ_SERVER_URL || DEFAULT_SERVER_URL,

      env: process.env.NODE_ENV === "production" ? "prod" : "dev",
      userBranch: "main",
      localAuthMode: "anonymous",
    } as Parameters<typeof createJazzClient>[0]),
    []
  );

  useEffect(() => {
    let cancelled = false;

    console.log("clientConfig", clientConfig);

    void getSharedJazzClient(clientConfig)
      .then((nextClient) => {
        if (cancelled) return;
        setClient(nextClient);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to initialize Jazz");
      });

    return () => {
      cancelled = true;
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
