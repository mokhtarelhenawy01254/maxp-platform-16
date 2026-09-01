import { useState, useCallback, useRef } from "react";

interface UseStudioHistoryOptions<T> {
  maxHistory?: number;
}

export function useStudioHistory<T>(initialPresent: T, options?: UseStudioHistoryOptions<T>) {
  const maxHistory = options?.maxHistory ?? 30;
  const [history, setHistory] = useState<{
    past: T[];
    present: T;
    future: T[];
  }>({
    past: [],
    present: initialPresent,
    future: [],
  });

  const lastRecordedRef = useRef<string>(JSON.stringify(initialPresent));

  const set = useCallback(
    (newPresent: T | ((curr: T) => T), recordHistory = true) => {
      setHistory((curr) => {
        const resolved = typeof newPresent === "function" ? (newPresent as (c: T) => T)(curr.present) : newPresent;
        const resolvedStr = JSON.stringify(resolved);

        if (resolvedStr === lastRecordedRef.current) {
          return curr;
        }

        if (!recordHistory) {
          lastRecordedRef.current = resolvedStr;
          return {
            ...curr,
            present: resolved,
          };
        }

        const newPast = [...curr.past, curr.present].slice(-maxHistory);
        lastRecordedRef.current = resolvedStr;

        return {
          past: newPast,
          present: resolved,
          future: [],
        };
      });
    },
    [maxHistory]
  );

  const undo = useCallback(() => {
    setHistory((curr) => {
      if (curr.past.length === 0) return curr;
      const previous = curr.past[curr.past.length - 1];
      const newPast = curr.past.slice(0, curr.past.length - 1);
      lastRecordedRef.current = JSON.stringify(previous);

      return {
        past: newPast,
        present: previous,
        future: [curr.present, ...curr.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((curr) => {
      if (curr.future.length === 0) return curr;
      const next = curr.future[0];
      const newFuture = curr.future.slice(1);
      lastRecordedRef.current = JSON.stringify(next);

      return {
        past: [...curr.past, curr.present],
        present: next,
        future: newFuture,
      };
    });
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
