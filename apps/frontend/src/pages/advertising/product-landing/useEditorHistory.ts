import { useCallback, useEffect, useRef, useState } from "react";

const HISTORY_LIMIT = 60;

interface HistoryState<T> {
  present: T;
  past: T[];
  future: T[];
}

/**
 * Undo/redo history for the landing editor. Drop-in for useState when all
 * writers use the functional form — updateEditor accepts either an updater
 * function or a plain value. resetEditor replaces the state without polluting
 * history (used when switching between landing pages).
 */
export const useEditorHistory = <T,>(initial: T) => {
  const [history, setHistory] = useState<HistoryState<T>>({
    present: initial,
    past: [],
    future: [],
  });

  const updateEditor = useCallback(
    (valueOrUpdater: T | ((current: T) => T)) => {
      setHistory((current) => {
        const next =
          typeof valueOrUpdater === "function"
            ? (valueOrUpdater as (current: T) => T)(current.present)
            : valueOrUpdater;
        if (next === current.present) return current;
        const past = [...current.past, current.present];
        return {
          present: next,
          past: past.length > HISTORY_LIMIT ? past.slice(-HISTORY_LIMIT) : past,
          future: [],
        };
      });
    },
    [],
  );

  const undo = useCallback(() => {
    setHistory((current) => {
      if (current.past.length === 0) return current;
      const previous = current.past[current.past.length - 1];
      return {
        present: previous,
        past: current.past.slice(0, -1),
        future: [current.present, ...current.future].slice(0, HISTORY_LIMIT),
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      if (current.future.length === 0) return current;
      const [next, ...restFuture] = current.future;
      return {
        present: next,
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        future: restFuture,
      };
    });
  }, []);

  const resetEditor = useCallback((value: T) => {
    setHistory({ present: value, past: [], future: [] });
  }, []);

  return {
    editor: history.present,
    updateEditor,
    undo,
    redo,
    resetEditor,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
};

/**
 * Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y shortcuts. Attach once at the builder root;
 * swallows events inside text inputs only for undo-friendly behavior (native
 * input undo keeps working through the same handler).
 */
export const useUndoKeyboardShortcuts = (
  undo: () => void,
  redo: () => void,
  enabled = true,
) => {
  const undoRef = useRef(undo);
  const redoRef = useRef(redo);
  undoRef.current = undo;
  redoRef.current = redo;

  useEffect(() => {
    if (!enabled) return;
    const handler = (event: KeyboardEvent) => {
      const isUndoCombo = (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z";
      const isRedoCombo =
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "z") ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y");
      if (!isUndoCombo && !isRedoCombo) return;
      event.preventDefault();
      if (isUndoCombo) undoRef.current();
      else redoRef.current();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [enabled]);
};
