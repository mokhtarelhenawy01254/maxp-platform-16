import { toast } from 'react-hot-toast';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { envConfig } from "../config/environment";
import { tokenManager } from "../utils/tokenManager";

interface TimerState {
  id: string | null;
  taskId: string | null;
  startTime: number | null; // Timestamp
  isRunning: boolean;
  isPaused: boolean;
  taskTitle: string | null;
  projectId: string | null;
  projectName: string | null;
}

interface TimerContextType {
  activeTimer: TimerState;
  activeTimers: TimerState[];
  elapsedSeconds: number;
  elapsedSecondsByTask: Record<string, number>;
  startTimer: (
    taskId: string,
    taskTitle: string,
    projectName?: string,
  ) => Promise<void>;
  stopTimer: (taskId: string, timerId?: string) => Promise<void>;
  pauseTimer: (taskId: string, timerId?: string) => Promise<void>;
  resumeTimer: (taskId: string, timerId?: string) => Promise<void>;
  syncTimerState: () => Promise<void>;
  getTimerForTask: (taskId: string) => TimerState | null;
  getElapsedSecondsForTask: (taskId: string) => number;
}

const getAccessToken = (): string | null => tokenManager.getAccessToken();

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const emptyTimerState: TimerState = {
  id: null,
  taskId: null,
  startTime: null,
  isRunning: false,
  isPaused: false,
  taskTitle: null,
  projectId: null,
  projectName: null,
};

const normalizeTimer = (timerData: any): TimerState => ({
  id: timerData?.id || null,
  taskId: timerData?.taskId || null,
  startTime: timerData?.startTime
    ? new Date(timerData.startTime).getTime()
    : timerData?.startTimeMs || Date.now(),
  isRunning: timerData?.isRunning ?? !timerData?.isPaused,
  isPaused: Boolean(timerData?.isPaused),
  taskTitle: timerData?.taskTitle || null,
  projectId: timerData?.projectId || null,
  projectName: timerData?.projectName || null,
});

const getPrimaryTimer = (timers: TimerState[]): TimerState =>
  // Last-started (most recent) non-paused running timer, or first running, or last started
  [...timers]
    .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
    .find((timer) => timer.isRunning && !timer.isPaused) ||
  [...timers].sort((a, b) => (b.startTime || 0) - (a.startTime || 0))[0] ||
  emptyTimerState;

const getStoredTimers = (): TimerState[] => {
  try {
    const serializedTimers = localStorage.getItem("active_timers");
    if (serializedTimers) {
      const parsedTimers = JSON.parse(serializedTimers);
      if (Array.isArray(parsedTimers)) {
        return parsedTimers.filter((timer) => timer?.taskId);
      }
    }
  } catch (error) {
    localStorage.removeItem("active_timers");
  }
  return [];
};

// Helper to get base URL
const buildApiUrl = (endpoint: string) => {
  // 💡 Use relative API path to leverage Vite proxy and avoid CORS in development
  const base = envConfig.apiUrl || "/api/v1";
  return `${base}/${endpoint.replace(/^\//, "")}`;
};

export const TimerProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [activeTimers, setActiveTimers] =
    useState<TimerState[]>(getStoredTimers);
  const [elapsedSecondsByTask, setElapsedSecondsByTask] = useState<
    Record<string, number>
  >({});
  const activeTimer = getPrimaryTimer(activeTimers);
  const elapsedSeconds = activeTimer.taskId
    ? elapsedSecondsByTask[activeTimer.taskId] || 0
    : 0;

  const checkActiveTimer = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    if (!window.location.pathname.startsWith("/super-admin")) return;

    // Only Super Admins can access the dev timer
    try {
      const base64Url = token.split(".")[1];
      if (!base64Url) return;
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(base64));
      if (payload.role !== "SUPER_ADMIN") return;
    } catch (e) {
      return;
    }

    try {
      const response = await fetch(
        buildApiUrl("super-admin/dev/timer/active"),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const timers = Array.isArray(data.timers)
            ? data.timers
            : data.data
              ? [data.data]
              : [];
          setActiveTimers(timers.map(normalizeTimer));
        }
      }
    } catch (err) {
      console.error("Failed to sync timer:", err);
    }
  }, []);

  // Check for active timer on mount (only once)
  useEffect(() => {
    checkActiveTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount to avoid infinite loops

  // Sync with localStorage (backup)
  useEffect(() => {
    if (activeTimers.length > 0) {
      localStorage.setItem("active_timers", JSON.stringify(activeTimers));
    } else {
      localStorage.removeItem("active_timers");
    }
  }, [activeTimers]);

  // Tick effect - optimized with Page Visibility API
  useEffect(() => {
    const hasRunningTimer = activeTimers.some(
      (timer) => timer.isRunning && !timer.isPaused && timer.startTime,
    );

    if (!hasRunningTimer) {
      setElapsedSecondsByTask({});
      return;
    }

    const updateElapsed = () => {
      // Don't update when tab is hidden to save resources
      if (document.hidden) return;

      const now = Date.now();
      const nextElapsedByTask: Record<string, number> = {};
      activeTimers.forEach((timer) => {
        if (!timer.taskId) return;
        if (!timer.isRunning || timer.isPaused || !timer.startTime) {
          nextElapsedByTask[timer.taskId] = 0;
          return;
        }

        const diff = Math.floor((now - timer.startTime) / 1000);
        nextElapsedByTask[timer.taskId] = diff > 0 ? diff : 0;
      });
      setElapsedSecondsByTask(nextElapsedByTask);
    };

    // Immediate update
    updateElapsed();

    // Update every second
    const interval = setInterval(updateElapsed, 1000);

    // Update when tab becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateElapsed();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeTimers]);

  const showToast = (message: string, type: "success" | "error") => {
    const event = new CustomEvent("show-toast", { detail: { message, type } });
    window.dispatchEvent(event);
    if (type === "error") console.error(message);
  };

  const startTimer = useCallback(
    async (taskId: string, taskTitle: string, projectName?: string) => {
      try {
        const token = getAccessToken();
        if (!token) return;

        // Role check
        try {
          const base64Url = token.split(".")[1];
          if (!base64Url) return;
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const payload = JSON.parse(atob(base64));
          if (payload.role !== "SUPER_ADMIN") {
            showToast("غير مسموح لهذه العملية إلا للمشرفين", "error");
            return;
          }
        } catch (e) {
          return;
        }

        const response = await fetch(
          buildApiUrl(`super-admin/dev/tasks/${taskId}/timer/start`),
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          const startedTimer = normalizeTimer({
            ...data.data,
            taskId: data.data?.taskId || taskId,
            startTime: data.data?.startTime || Date.now(),
            taskTitle: data.data?.taskTitle || taskTitle,
            projectName: data.data?.projectName || projectName || null,
            isRunning: true,
            isPaused: false,
          });

          setActiveTimers((prev) => [
            startedTimer,
            ...prev.filter((timer) => timer.taskId !== taskId),
          ]);
        } else {
          showToast(data.message || "فشل بدء المؤقت", "error");
        }
      } catch (err) {
        showToast("حدث خطأ في الاتصال", "error");
      }
    },
    [],
  );

  const stopTimer = useCallback(
    async (taskId: string, timerId?: string) => {
      try {
        const token = getAccessToken();
        if (!token) return;

        const response = await fetch(
          buildApiUrl(`super-admin/dev/tasks/${taskId}/timer/stop`),
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ description: "", ...(timerId && { timerId }) }),
          },
        );

        if (response.ok) {
          setActiveTimers((prev) =>
            prev.filter((timer) =>
              timerId ? timer.id !== timerId : timer.taskId !== taskId,
            ),
          );
          setElapsedSecondsByTask((prev) => {
            const next = { ...prev };
            delete next[taskId];
            return next;
          });

          // Then check if another timer exists (drain queue)
          await checkActiveTimer();
        } else {
          showToast("فشل إيقاف المؤقت", "error");
        }
      } catch (err) {
        showToast("حدث خطأ في الاتصال", "error");
      }
    },
    [checkActiveTimer],
  );

  const pauseTimer = useCallback(async (taskId: string, timerId?: string) => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const response = await fetch(
        buildApiUrl(`super-admin/dev/tasks/${taskId}/timer/pause`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...(timerId && { timerId }) }),
        },
      );

      if (response.ok) {
        setActiveTimers((prev) =>
          prev.map((timer) =>
            (timerId && timer.id === timerId) || timer.taskId === taskId
              ? { ...timer, isPaused: true }
              : timer,
          ),
        );
      }
    } catch (err) {
      showToast("حدث خطأ", "error");
    }
  }, []);

  const resumeTimer = useCallback(async (taskId: string, timerId?: string) => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const response = await fetch(
        buildApiUrl(`super-admin/dev/tasks/${taskId}/timer/resume`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...(timerId && { timerId }) }),
        },
      );

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const resumedTimer = normalizeTimer({
          ...data.data,
          taskId: data.data?.taskId || taskId,
          startTime: data.data?.startTime || Date.now(),
          isRunning: true,
          isPaused: false,
        });

        setActiveTimers((prev) => [
          resumedTimer,
          ...prev.filter((timer) =>
            timerId ? timer.id !== timerId : timer.taskId !== taskId,
          ),
        ]);
      }
    } catch (err) {
      showToast("حدث خطأ", "error");
    }
  }, []);

  const syncTimerState = useCallback(async () => {
    // Optional: Fetch current status from backend to handle multi-tab/device
    // Implement if needed for robustness
  }, []);

  const getTimerForTask = useCallback(
    (taskId: string) =>
      activeTimers.find((timer) => timer.taskId === taskId) || null,
    [activeTimers],
  );

  const getElapsedSecondsForTask = useCallback(
    (taskId: string) => elapsedSecondsByTask[taskId] || 0,
    [elapsedSecondsByTask],
  );

  return (
    <TimerContext.Provider
      value={{
        activeTimer,
        activeTimers,
        elapsedSeconds,
        elapsedSecondsByTask,
        startTimer,
        stopTimer,
        pauseTimer,
        resumeTimer,
        syncTimerState,
        getTimerForTask,
        getElapsedSecondsForTask,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
};
