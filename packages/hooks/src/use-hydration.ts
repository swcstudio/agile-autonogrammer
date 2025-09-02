import { useEffect, useMemo, useRef, useState } from 'react';
import { useMultithreadingContext } from '../components/MultithreadingProvider.tsx';

export interface HydrationConfig {
  enableStreaming?: boolean;
  chunkSize?: number;
  priority?: 'low' | 'normal' | 'high';
  fallback?: any;
  timeout?: number;
}

export interface HydrationState<T> {
  data: T | null;
  isHydrating: boolean;
  isHydrated: boolean;
  error: string | null;
  progress: number;
  chunks: T[];
}

export function useHydration<T>(key: string, serverData: T | null, config: HydrationConfig = {}) {
  const { nativeModule, isInitialized } = useMultithreadingContext();
  const [state, setState] = useState<HydrationState<T>>({
    data: serverData,
    isHydrating: false,
    isHydrated: false,
    error: null,
    progress: 0,
    chunks: [],
  });

  const hydratedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const hydrate = useMemo(
    () => async () => {
      if (hydratedRef.current || !isInitialized || !nativeModule) {
        return;
      }

      hydratedRef.current = true;
      abortControllerRef.current = new AbortController();

      setState((prev) => ({
        ...prev,
        isHydrating: true,
        error: null,
        progress: 0,
      }));

      try {
        if (config.enableStreaming && Array.isArray(serverData)) {
          await hydrateWithStreaming(serverData);
        } else {
          await hydrateComplete(serverData!);
        }

        setState((prev) => ({
          ...prev,
          isHydrating: false,
          isHydrated: true,
          progress: 100,
        }));
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        setState((prev) => ({
          ...prev,
          isHydrating: false,
          error: error instanceof Error ? error.message : 'Hydration failed',
          data: config.fallback || prev.data,
        }));
      }
    },
    [key, serverData, config, isInitialized, nativeModule]
  );

  const hydrateWithStreaming = async (data: T) => {
    if (!Array.isArray(data)) return;

    const chunkSize = config.chunkSize || Math.ceil(data.length / 4);
    const chunks: any[] = [];

    for (let i = 0; i < data.length; i += chunkSize) {
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Hydration aborted');
      }

      const chunk = data.slice(i, i + chunkSize);

      const processedChunk = await nativeModule.rayonParallelMap(
        chunk,
        'hydrate_chunk',
        Math.min(chunkSize, 100)
      );

      chunks.push(...processedChunk);

      setState((prev) => ({
        ...prev,
        chunks: [...prev.chunks, ...processedChunk],
        progress: Math.min(100, ((i + chunkSize) / data.length) * 100),
      }));

      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    setState((prev) => ({
      ...prev,
      data: chunks as T,
    }));
  };

  const hydrateComplete = async (data: T) => {
    if (!data) return;

    let processedData: T;

    if (Array.isArray(data)) {
      processedData = await nativeModule.rayonParallelMap(
        data,
        'hydrate_complete',
        config.chunkSize || 4
      );
    } else {
      processedData = await nativeModule.tokioSpawnTask('hydrate_object', data);
    }

    setState((prev) => ({
      ...prev,
      data: processedData,
      progress: 100,
    }));
  };

  const rehydrate = async () => {
    hydratedRef.current = false;
    setState((prev) => ({
      ...prev,
      isHydrated: false,
      chunks: [],
      progress: 0,
    }));
    await hydrate();
  };

  const abort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState((prev) => ({
      ...prev,
      isHydrating: false,
    }));
  };

  useEffect(() => {
    if (serverData && !hydratedRef.current) {
      const timeoutId = setTimeout(hydrate, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [hydrate, serverData]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    rehydrate,
    abort,
  };
}

export function useStreamingHydration<T>(
  key: string,
  serverDataStream: AsyncIterable<T>,
  config: HydrationConfig = {}
) {
  const { nativeModule, isInitialized } = useMultithreadingContext();
  const [state, setState] = useState<HydrationState<T[]>>({
    data: [],
    isHydrating: false,
    isHydrated: false,
    error: null,
    progress: 0,
    chunks: [],
  });

  const processStream = async () => {
    if (!isInitialized || !nativeModule) return;

    setState((prev) => ({
      ...prev,
      isHydrating: true,
      error: null,
    }));

    try {
      const processedChunks: T[] = [];
      let chunkCount = 0;

      for await (const chunk of serverDataStream) {
        const processedChunk = await nativeModule.tokioSpawnTask('process_stream_chunk', chunk);

        processedChunks.push(processedChunk);
        chunkCount++;

        setState((prev) => ({
          ...prev,
          chunks: [...prev.chunks, processedChunk],
          data: [...processedChunks],
          progress: Math.min(100, chunkCount * 10),
        }));

        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      setState((prev) => ({
        ...prev,
        isHydrating: false,
        isHydrated: true,
        progress: 100,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isHydrating: false,
        error: error instanceof Error ? error.message : 'Streaming hydration failed',
      }));
    }
  };

  useEffect(() => {
    processStream();
  }, [key, isInitialized]);

  return state;
}

export function useSuspenseHydration<T>(
  key: string,
  serverData: T | null,
  config: HydrationConfig = {}
) {
  const { nativeModule, isInitialized } = useMultithreadingContext();
  const promiseRef = useRef<Promise<T> | null>(null);

  if (!isInitialized || !nativeModule) {
    throw new Promise((resolve) => {
      const checkInitialized = () => {
        if (isInitialized && nativeModule) {
          resolve(undefined);
        } else {
          setTimeout(checkInitialized, 100);
        }
      };
      checkInitialized();
    });
  }

  if (!promiseRef.current && serverData) {
    promiseRef.current = (async () => {
      if (Array.isArray(serverData)) {
        return await nativeModule.rayonParallelMap(
          serverData,
          'suspense_hydrate',
          config.chunkSize || 4
        );
      } else {
        return await nativeModule.tokioSpawnTask('suspense_hydrate_object', serverData);
      }
    })();
  }

  if (promiseRef.current) {
    throw promiseRef.current;
  }

  return serverData;
}
