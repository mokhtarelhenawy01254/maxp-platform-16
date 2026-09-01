import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Undo/redo history for controlled designTokens editors.
 *
 * The editor receives `designTokens` from its parent and emits the next state
 * through `onChange`. This hook tracks which states were produced by this
 * editor so it can step back and forward, and it rebaselines (drops history)
 * whenever the incoming state was NOT produced here — e.g. the parent loaded
 * saved settings, switched the theme, or another editor committed.
 */
const HISTORY_LIMIT = 50;

export interface DesignTokensHistoryApi<T> {
  canUndo: boolean;
  canRedo: boolean;
  /** Record a state produced by this editor before emitting it upstream. */
  commit: (next: T) => void;
  /** Step back and return the restored state, or null when nothing to undo. */
  undo: () => T | null;
  /** Step forward and return the restored state, or null when nothing to redo. */
  redo: () => T | null;
}

export function useDesignTokensHistory<T>(
  incoming: T,
): DesignTokensHistoryApi<T> {
  const pastRef = useRef<T[]>([]);
  const presentRef = useRef<T>(incoming);
  const futureRef = useRef<T[]>([]);
  const lastEmittedRef = useRef<T>(incoming);
  const [, setVersion] = useState(0);

  const bump = useCallback(() => {
    setVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    if (lastEmittedRef.current === incoming) {
      return;
    }

    pastRef.current = [];
    futureRef.current = [];
    presentRef.current = incoming;
    lastEmittedRef.current = incoming;
    bump();
  }, [incoming, bump]);

  const commit = useCallback((next: T) => {
    if (!next || typeof next !== "object" || next === presentRef.current) {
      return;
    }

    pastRef.current = [...pastRef.current, presentRef.current].slice(
      -HISTORY_LIMIT,
    );
    futureRef.current = [];
    presentRef.current = next;
    lastEmittedRef.current = next;
    bump();
  }, []);

  const undo = useCallback((): T | null => {
    const past = pastRef.current;
    if (past.length === 0) {
      return null;
    }

    const previous = past[past.length - 1] as T;
    pastRef.current = past.slice(0, -1);
    futureRef.current = [presentRef.current, ...futureRef.current].slice(
      0,
      HISTORY_LIMIT,
    );
    presentRef.current = previous;
    lastEmittedRef.current = previous;
    bump();
    return previous;
  }, []);

  const redo = useCallback((): T | null => {
    const future = futureRef.current;
    if (future.length === 0) {
      return null;
    }

    const next = future[0] as T;
    futureRef.current = future.slice(1);
    pastRef.current = [...pastRef.current, presentRef.current].slice(
      -HISTORY_LIMIT,
    );
    presentRef.current = next;
    lastEmittedRef.current = next;
    bump();
    return next;
  }, []);

  return {
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    commit,
    undo,
    redo,
  };
}

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
};

/**
 * Ctrl/Cmd+Z / Ctrl+Shift+Z (or Ctrl+Y) shortcuts for the editor history.
 * Skips the shortcut while the focus is inside a text field so the browser's
 * native input undo keeps working there.
 */
export function useDesignTokensHistoryShortcuts<T>(
  history: DesignTokensHistoryApi<T>,
  applyRestored: (restored: T) => void,
): void {
  const applyRestoredRef = useRef(applyRestored);

  useEffect(() => {
    applyRestoredRef.current = applyRestored;
  }, [applyRestored]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || (!event.ctrlKey && !event.metaKey)) {
        return;
      }

      const key = event.key.toLowerCase();
      const isUndo = key === "z" && !event.shiftKey;
      const isRedo = (key === "z" && event.shiftKey) || key === "y";
      if (!isUndo && !isRedo) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      const restored = isUndo ? history.undo() : history.redo();
      if (restored !== null && restored !== undefined) {
        event.preventDefault();
        applyRestoredRef.current(restored);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history]);
}