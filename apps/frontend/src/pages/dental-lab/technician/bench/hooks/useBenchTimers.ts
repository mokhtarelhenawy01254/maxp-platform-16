import { useState, useEffect, useCallback } from "react";
import { TimerState } from "../types/dentalTechBenchTypes";

export function useBenchTimers() {
  const [timers, setTimers] = useState<Record<string, TimerState>>({});

  useEffect(() => {
    const hasRunningTimers = Object.values(timers).some((t) => t.running);
    if (!hasRunningTimers) return;

    const interval = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const [id, state] of Object.entries(next)) {
          if (state.running) {
            next[id] = { ...state, elapsedSeconds: state.elapsedSeconds + 1 };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timers]);

  const toggleTimer = useCallback((caseId: string) => {
    setTimers((prev) => {
      const current = prev[caseId] || { running: false, elapsedSeconds: 0 };
      return {
        ...prev,
        [caseId]: {
          ...current,
          running: !current.running,
        },
      };
    });
  }, []);

  const fmtTimer = useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    if (hrs > 0) return `${hrs}:${pad(mins)}:${pad(secs)}`;
    return `${pad(mins)}:${pad(secs)}`;
  }, []);

  return {
    timers,
    toggleTimer,
    fmtTimer,
  };
}
