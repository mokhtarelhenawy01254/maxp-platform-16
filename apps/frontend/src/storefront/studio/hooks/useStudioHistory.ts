import { useState, useCallback, useRef, useEffect } from "react";

export interface UseStudioHistoryOptions<T> {
  maxHistory?: number;
  onChange?: (present: T) => void;
}

export function useStudioHistory<T>(initialPresent: T, options?: UseStudioHistoryOptions<T>) {
  const maxHistory = options?.maxHistory ?? 30;
  const onChangeRef = useRef(options?.onChange);
  onChangeRef.current = options?.onChange;

  const [history, setHistory] = useState<{
    past: T[];
    present: T;
    future: T[];
  }>({
    past: [],
    present: initialPresent,
    future: [],
  });

  const historyRef = useRef(history);
  historyRef.current = history;

  const lastRecordedRef = useRef<string>(JSON.stringify(initialPresent));

  // Re-sync if initialPresent changes from an external source (such as discard or initial load)
  useEffect(() => {
    const externalStr = JSON.stringify(initialPresent);
    if (externalStr !== lastRecordedRef.current) {
      lastRecordedRef.current = externalStr;
      const resetState = {
        past: [],
        present: initialPresent,
        future: [],
      };
      historyRef.current = resetState;
      setHistory(resetState);
    }
  }, [initialPresent]);

  const set = useCallback(
    (newPresent: T | ((curr: T) => T), recordHistory = true) => {
      const curr = historyRef.current;
      const resolved = typeof newPresent === "function" ? (newPresent as (c: T) => T)(curr.present) : newPresent;
      const resolvedStr = JSON.stringify(resolved);

      if (resolvedStr === lastRecordedRef.current) {
        return;
      }

      lastRecordedRef.current = resolvedStr;

      let nextHistory;
      if (!recordHistory) {
        nextHistory = {
          ...curr,
          present: resolved,
        };
      } else {
        const newPast = [...curr.past, curr.present].slice(-maxHistory);
        nextHistory = {
          past: newPast,
          present: resolved,
          future: [],
        };
      }

      historyRef.current = nextHistory;
      setHistory(nextHistory);
      onChangeRef.current?.(resolved);
    },
    [maxHistory]
  );

  const undo = useCallback(() => {
    const curr = historyRef.current;
    if (curr.past.length === 0) return undefined;
    const previous = curr.past[curr.past.length - 1];
    const newPast = curr.past.slice(0, curr.past.length - 1);
    lastRecordedRef.current = JSON.stringify(previous);

    const nextHistory = {
      past: newPast,
      present: previous,
      future: [curr.present, ...curr.future],
    };

    historyRef.current = nextHistory;
    setHistory(nextHistory);
    onChangeRef.current?.(previous);
    return previous;
  }, []);

  const redo = useCallback(() => {
    const curr = historyRef.current;
    if (curr.future.length === 0) return undefined;
    const next = curr.future[0];
    const newFuture = curr.future.slice(1);
    lastRecordedRef.current = JSON.stringify(next);

    const nextHistory = {
      past: [...curr.past, curr.present],
      present: next,
      future: newFuture,
    };

    historyRef.current = nextHistory;
    setHistory(nextHistory);
    onChangeRef.current?.(next);
    return next;
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return {
    state: history.present,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
