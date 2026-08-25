"use client";

import * as React from "react";
import { type ReactNode } from "react";
import {
  createJazzClient as createJazzClientFromPackage,
  JazzClientProvider as JazzClientProviderFromPackage,
  useAll as useAllFromPackage,
  useAllSuspense as useAllSuspenseFromPackage,
  useDb as useDbFromPackage,
  useJazzClient as useJazzClientFromPackage,
  useSession as useSessionFromPackage,
} from "jazz-tools/react";
import { BrowserAuthSecretStore } from "jazz-tools";
import type { QueryBuilder, QueryOptions } from "jazz-tools/react-core";

import { getJazzAuthSecretStorageKey } from "@/lib/jazz-client-config";

type JazzClient = Awaited<ReturnType<typeof createJazzClientFromPackage>>;
type DbConfig = Parameters<typeof createJazzClientFromPackage>[0];
type Session = JazzClient["session"];

type JazzClientProviderProps = {
  client: JazzClient;
  children: ReactNode;
};

type JazzProviderProps = {
  config: DbConfig;
  fallback?: ReactNode;
  children: ReactNode;
};

type CachedClientEntry = {
  configKey: string;
  createJazzClient: typeof createJazzClient;
  initPromise: Promise<JazzClient>;
  refs: number;
  releaseTimer: ReturnType<typeof setTimeout> | null;
};

let cachedClientEntry: CachedClientEntry | null = null;

export async function createJazzClient(config: DbConfig) {
  const resolvedConfig = await resolveJazzClientConfig(config);
  return createJazzClientFromPackage(resolvedConfig);
}

function acquireClient(
  configKey: string,
  config: DbConfig,
  createClient: typeof createJazzClient
): Promise<JazzClient> {
  if (
    cachedClientEntry?.configKey !== configKey ||
    cachedClientEntry?.createJazzClient !== createClient
  ) {
    cachedClientEntry = {
      configKey,
      createJazzClient: createClient,
      initPromise: createClient(config),
      refs: 0,
      releaseTimer: null,
    };
  }

  cachedClientEntry.refs += 1;
  if (cachedClientEntry.releaseTimer) {
    clearTimeout(cachedClientEntry.releaseTimer);
    cachedClientEntry.releaseTimer = null;
  }

  return cachedClientEntry.initPromise;
}

async function resolveJazzClientConfig(config: DbConfig): Promise<DbConfig> {
  if (config.secret || config.jwtToken || typeof window === "undefined") {
    return config;
  }

  const localFirstSecret = await new BrowserAuthSecretStore({
    key: getJazzAuthSecretStorageKey(config.appId),
  }).getOrCreateSecret();

  const { jwtToken: _jwtToken, cookieSession: _cookieSession, ...secretConfig } = config;

  return {
    ...secretConfig,
    secret: localFirstSecret,
  };
}

function releaseClient(configKey: string) {
  if (!cachedClientEntry || cachedClientEntry.configKey !== configKey) {
    return;
  }

  cachedClientEntry.refs = Math.max(0, cachedClientEntry.refs - 1);
  if (cachedClientEntry.refs > 0 || cachedClientEntry.releaseTimer) {
    return;
  }

  const entry = cachedClientEntry;
  entry.releaseTimer = setTimeout(() => {
    if (entry.refs > 0) {
      entry.releaseTimer = null;
      return;
    }

    void entry.initPromise.then((resolved) => resolved.shutdown()).catch(() => {});
    if (cachedClientEntry === entry) {
      cachedClientEntry = null;
    }
  }, 0);
}

export function JazzClientProvider({ client, children }: JazzClientProviderProps) {
  return (
    <JazzClientProviderFromPackage client={client}>
      {children}
    </JazzClientProviderFromPackage>
  );
}

export function JazzProvider({ config, fallback, children }: JazzProviderProps) {
  const configKey = JSON.stringify(config);
  const [client, setClient] = React.useState<JazzClient | null>(null);
  const [error, setError] = React.useState<unknown>(null);

  React.useEffect(() => {
    let active = true;
    const pendingClient = acquireClient(configKey, config, createJazzClient);

    void pendingClient.then(
      (resolved) => {
        if (!active) {
          return;
        }
        setClient(resolved);
      },
      (reason) => {
        if (!active) {
          return;
        }
        setError(reason);
      }
    );

    return () => {
      active = false;
      releaseClient(configKey);
    };
  }, [config, configKey]);

  if (error) {
    throw error;
  }

  if (!client) {
    return <>{fallback ?? null}</>;
  }

  return <JazzClientProvider client={client}>{children}</JazzClientProvider>;
}

export function useJazzClient(): JazzClient {
  return useJazzClientFromPackage() as JazzClient;
}

export function useDb(): JazzClient["db"] {
  return useDbFromPackage();
}

export function useSession(): Session {
  return useSessionFromPackage();
}

export function useAll<T extends { id: string }>(
  query?: QueryBuilder<T>,
  options?: QueryOptions
): T[] | undefined {
  return useAllFromPackage<T>(query, options).data;
}

export function useAllSuspense<T extends { id: string }>(
  query?: QueryBuilder<T>,
  options?: QueryOptions
): T[] {
  return useAllSuspenseFromPackage<T>(query, options);
}
