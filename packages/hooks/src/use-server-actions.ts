import { useCallback, useState, useTransition } from 'react';
import { useMultithreadingContext } from '../components/MultithreadingProvider.tsx';

export interface ServerActionConfig {
  timeout?: number;
  retries?: number;
  priority?: 'low' | 'normal' | 'high';
  cache?: boolean;
  revalidate?: string[];
}

export interface ServerActionResult<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export function useServerAction<TInput, TOutput>(
  actionName: string,
  config: ServerActionConfig = {}
) {
  const { nativeModule, isInitialized } = useMultithreadingContext();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ServerActionResult<TOutput>>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  });

  const execute = useCallback(
    async (input: TInput): Promise<TOutput> => {
      if (!isInitialized || !nativeModule) {
        throw new Error('Multithreading not initialized');
      }

      return new Promise((resolve, reject) => {
        startTransition(async () => {
          setResult((prev) => ({
            ...prev,
            isLoading: true,
            error: null,
            isSuccess: false,
            isError: false,
          }));

          try {
            let output: TOutput;

            switch (actionName) {
              case 'parallel_compute':
                output = await nativeModule.rayonParallelMap(
                  input,
                  'compute',
                  config.priority === 'high' ? 2 : 4
                );
                break;

              case 'async_process':
                output = await nativeModule.tokioSpawnTask('process', input);
                break;

              case 'heavy_computation':
                output = await nativeModule.benchmarkParallelOperations(
                  Array.isArray(input) ? input.length : 1000,
                  'parallel_square'
                );
                break;

              case 'data_transform':
                output = await nativeModule.rayonParallelFilter(input, 'transform');
                break;

              case 'background_task':
                output = await nativeModule.tokioSpawnBlocking('background', input);
                break;

              default:
                throw new Error(`Unknown server action: ${actionName}`);
            }

            setResult({
              data: output,
              error: null,
              isLoading: false,
              isSuccess: true,
              isError: false,
            });

            resolve(output);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Server action failed';

            setResult({
              data: null,
              error: errorMessage,
              isLoading: false,
              isSuccess: false,
              isError: true,
            });

            reject(error);
          }
        });
      });
    },
    [actionName, config, isInitialized, nativeModule, startTransition]
  );

  const reset = useCallback(() => {
    setResult({
      data: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  }, []);

  return {
    execute,
    reset,
    isPending,
    ...result,
  };
}

export function useParallelServerAction<TInput extends any[], TOutput>(
  actionName: string,
  config: ServerActionConfig = {}
) {
  const { nativeModule, isInitialized } = useMultithreadingContext();
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<ServerActionResult<TOutput[]>>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  });

  const executeParallel = useCallback(
    async (inputs: TInput): Promise<TOutput[]> => {
      if (!isInitialized || !nativeModule) {
        throw new Error('Multithreading not initialized');
      }

      return new Promise((resolve, reject) => {
        startTransition(async () => {
          setResults((prev) => ({
            ...prev,
            isLoading: true,
            error: null,
            isSuccess: false,
            isError: false,
          }));

          try {
            const chunkSize = Math.ceil(inputs.length / (config.priority === 'high' ? 2 : 4));

            const outputs: TOutput[] = await nativeModule.rayonParallelMap(
              inputs,
              actionName,
              chunkSize
            );

            setResults({
              data: outputs,
              error: null,
              isLoading: false,
              isSuccess: true,
              isError: false,
            });

            resolve(outputs);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Parallel server action failed';

            setResults({
              data: null,
              error: errorMessage,
              isLoading: false,
              isSuccess: false,
              isError: true,
            });

            reject(error);
          }
        });
      });
    },
    [actionName, config, isInitialized, nativeModule, startTransition]
  );

  const reset = useCallback(() => {
    setResults({
      data: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  }, []);

  return {
    executeParallel,
    reset,
    isPending,
    ...results,
  };
}

export function createServerAction<TInput, TOutput>(
  actionName: string,
  implementation: (input: TInput, nativeModule: any) => Promise<TOutput>,
  config: ServerActionConfig = {}
) {
  return function useCreatedServerAction() {
    const { nativeModule, isInitialized } = useMultithreadingContext();
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<ServerActionResult<TOutput>>({
      data: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });

    const execute = useCallback(
      async (input: TInput): Promise<TOutput> => {
        if (!isInitialized || !nativeModule) {
          throw new Error('Multithreading not initialized');
        }

        return new Promise((resolve, reject) => {
          startTransition(async () => {
            setResult((prev) => ({
              ...prev,
              isLoading: true,
              error: null,
              isSuccess: false,
              isError: false,
            }));

            try {
              const output = await implementation(input, nativeModule);

              setResult({
                data: output,
                error: null,
                isLoading: false,
                isSuccess: true,
                isError: false,
              });

              resolve(output);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : `${actionName} failed`;

              setResult({
                data: null,
                error: errorMessage,
                isLoading: false,
                isSuccess: false,
                isError: true,
              });

              reject(error);
            }
          });
        });
      },
      [implementation, isInitialized, nativeModule, startTransition]
    );

    const reset = useCallback(() => {
      setResult({
        data: null,
        error: null,
        isLoading: false,
        isSuccess: false,
        isError: false,
      });
    }, []);

    return {
      execute,
      reset,
      isPending,
      ...result,
    };
  };
}
