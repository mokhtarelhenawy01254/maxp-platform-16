import { useState, useCallback, useRef, useEffect } from "react";

export interface UseStudioHistoryOptions<T> {
  maxHistory?: number;
  onChange?: (present: T) => void;
  coalesceMs?: number;
}

function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalizeJson).join(",")}]`;
  }
  const keys = Object.keys(obj).filter((k) => k !== "themeId").sort();
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${canonicalizeJson(obj[k])}`);
  return `{${pairs.join(",")}}`;
}

export function areTokensEquivalent(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  try {
    return canonicalizeJson(a) === canonicalizeJson(b);
  } catch {
    return false;
  }
}

export function useStudioHistory<T>(initialPresent: T, options?: UseStudioHistoryOptions<T>) {
  const maxHistory = options?.maxHistory ?? 30;
  const coalesceMs = options?.coalesceMs ?? 800;
  const onChangeRef = useRef(options?.onChange);
  onChangeRef.current = options?.onChange;
  const lastSetTimeRef = useRef<number>(0);

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
      // If tokens are equivalent (e.g. server echoed save with themeId or key re-ordering),
      // preserve past/future undo history and do not wipe history!
      if (areTokensEquivalent(initialPresent, historyRef.current.present)) {
        lastRecordedRef.current = externalStr;
        const syncedState = {
          ...historyRef.current,
          present: initialPresent,
        };
        historyRef.current = syncedState;
        setHistory(syncedState);
        return;
      }

      // Truly external reset (such as user clicking "Discard" or fresh settings load)
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
      const now = Date.now();
      const shouldCoalesce = coalesceMs > 0 && now - lastSetTimeRef.current < coalesceMs && curr.past.length > 0;
      lastSetTimeRef.current = now;

      let nextHistory;
      if (!recordHistory) {
        nextHistory = {
          ...curr,
          present: resolved,
        };
      } else if (shouldCoalesce) {
        // Coalesce rapid edits (e.g. typing) into single undo step
        nextHistory = {
          past: curr.past,
          present: resolved,
          future: [],
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
    [maxHistory, coalesceMs]
  );

  const undo = useCallback(() => {
    const curr = historyRef.current;
    if (curr.past.length === 0) return undefined;
    const previous = curr.past[curr.past.length - 1];
    const newPast = curr.past.slice(0, curr.past.length - 1);
    lastRecordedRef.current = JSON.stringify(previous);
    lastSetTimeRef.current = 0; // reset coalesce timer on undo

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
    lastSetTimeRef.current = 0; // reset coalesce timer on redo

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
