import { useCallback, useEffect, useRef, useState } from 'react';

interface PollingResult<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/*
  The API has no realtime channel, so the game state is read by polling. Pass
  `null` as the interval to stop polling once the game is over.

  Only the most recent request is applied: a poll fired before a play could
  answer after it and put the old state back on screen for a couple of seconds.
  Polling also pauses while the tab is in the background.

  `fetcher` must be memoized by the caller - a new reference restarts the cycle.
*/
export function usePolling<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  intervalMs: number | null
): PollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* Id of the last request started; older responses are ignored. */
  const lastRequestIdRef = useRef(0);

  const run = useCallback(
    async (signal: AbortSignal) => {
      const requestId = ++lastRequestIdRef.current;
      const isStale = () => signal.aborted || requestId !== lastRequestIdRef.current;

      try {
        const result = await fetcher(signal);
        if (isStale()) {
          return;
        }
        setData(result);
        setError(null);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') {
          return;
        }
        if (isStale()) {
          return;
        }
        setError(caught instanceof Error ? caught.message : 'Falha ao consultar o servidor');
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [fetcher]
  );

  /*
    The controller for the current cycle, so a manual refresh is aborted along
    with everything else when the screen unmounts.
  */
  const controllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    const signal = controllerRef.current?.signal;
    if (!signal || signal.aborted) {
      return;
    }
    await run(signal);
  }, [run]);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    void run(controller.signal);

    if (intervalMs === null) {
      return () => controller.abort();
    }

    let timer: number | null = null;

    const stop = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      if (timer !== null) {
        return;
      }
      timer = window.setInterval(() => {
        void run(controller.signal);
      }, intervalMs);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
        return;
      }
      void run(controller.signal);
      start();
    };

    if (!document.hidden) {
      start();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      controller.abort();
      controllerRef.current = null;
    };
  }, [run, intervalMs]);

  return { data, error, isLoading, refresh, setData };
}
