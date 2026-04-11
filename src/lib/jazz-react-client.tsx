"use client";

import * as React from "react";
import { use, type ReactNode } from "react";
import {
  createJazzClient as createJazzClientFromPackage,
} from "jazz-tools/react";
import type { QueryBuilder, QueryOptions } from "jazz-tools/react-core";

export const createJazzClient = createJazzClientFromPackage;

type JazzClient = Awaited<ReturnType<typeof createJazzClientFromPackage>>;
type DbConfig = Parameters<typeof createJazzClientFromPackage>[0];
type AuthState = ReturnType<JazzClient["db"]["getAuthState"]>;
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

type JazzContextValue = {
  client: JazzClient;
  authState: AuthState;
};

type CachedClientEntry = {
  configKey: string;
  createJazzClient: typeof createJazzClientFromPackage;
  initPromise: Promise<JazzClient>;
  refs: number;
  releaseTimer: ReturnType<typeof setTimeout> | null;
};

type QueryCacheEntry<T> = {
  state:
    | { status: "pending"; promise: Promise<T[]> }
    | { status: "fulfilled"; data: T[] }
    | { status: "rejected"; error: unknown };
  subscribe(listener: {
    onfulfilled(): void;
    onDelta(): void;
    onError(): void;
  }): () => void;
};

const JazzContext = React.createContext<JazzContextValue | null>(null);
const SUSPEND_FOREVER: Promise<never> = new Promise(() => {});

let cachedClientEntry: CachedClientEntry | null = null;

function acquireClient(
  configKey: string,
  config: DbConfig,
  createClient: typeof createJazzClientFromPackage
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
  const [authState, setAuthState] = React.useState(() => client.db.getAuthState());

  React.useEffect(() => {
    setAuthState(client.db.getAuthState());
    return client.db.onAuthChanged((nextAuthState) => {
      setAuthState(nextAuthState);
    });
  }, [client]);

  return <JazzContext.Provider value={{ client, authState }}>{children}</JazzContext.Provider>;
}

export function JazzProvider({ config, fallback, children }: JazzProviderProps) {
  const configKey = JSON.stringify(config);
  const [client, setClient] = React.useState<JazzClient | null>(null);
  const [error, setError] = React.useState<unknown>(null);

  React.useEffect(() => {
    let active = true;
    const pendingClient = acquireClient(configKey, config, createJazzClientFromPackage);

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
  const ctx = React.useContext(JazzContext);
  if (!ctx) {
    throw new Error("useDb must be used within <JazzProvider>");
  }
  return ctx.client;
}

export function useDb(): JazzClient["db"] {
  return useJazzClient().db;
}

export function useSession(): Session {
  return useJazzClient().session ?? null;
}

function useAllBase<T extends { id: string }>(
  query?: QueryBuilder<T>,
  queryOptions?: QueryOptions,
  options?: { suspense?: boolean }
): T[] | undefined {
  const { suspense = false } = options ?? {};
  const { manager } = useJazzClient();

  const entry = React.useMemo(() => {
    if (!query) {
      return null;
    }

    const typedManager = manager as {
      makeQueryKey(query: QueryBuilder<T>, options?: QueryOptions): string;
      getCacheEntry<TItem>(key: string): QueryCacheEntry<TItem>;
    };

    const key = typedManager.makeQueryKey(query, queryOptions);
    return typedManager.getCacheEntry<T>(key);
  }, [manager, query, queryOptions]);

  const dispatch = React.useReducer(
    (_state: QueryCacheEntry<T>["state"] | undefined, action: QueryCacheEntry<T>["state"]) =>
      action,
    entry?.state
  )[1];

  React.useLayoutEffect(() => {
    if (!entry) {
      return;
    }

    return entry.subscribe({
      onfulfilled: () => {
        dispatch(entry.state);
      },
      onDelta: () => {
        dispatch(entry.state);
      },
      onError: () => {
        dispatch(entry.state);
      },
    });
  }, [entry]);

  if (!entry) {
    if (suspense) {
      return use(SUSPEND_FOREVER as Promise<T[]>);
    }
    return undefined;
  }

  const state = entry.state;

  if (suspense) {
    if (state.status === "pending") {
      return use(state.promise);
    }

    if (state.status === "rejected") {
      throw state.error;
    }
  }

  return state.status === "fulfilled" ? state.data : undefined;
}

export function useAll<T extends { id: string }>(
  query?: QueryBuilder<T>,
  options?: QueryOptions
): T[] | undefined {
  return useAllBase<T>(query, options, { suspense: false });
}

export function useAllSuspense<T extends { id: string }>(
  query?: QueryBuilder<T>,
  options?: QueryOptions
): T[] {
  return useAllBase<T>(query, options, { suspense: true }) as T[];
}
