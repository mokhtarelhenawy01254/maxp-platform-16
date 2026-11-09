/**
 * 📦 Offline Attendance Queue Service (Web LocalStorage)
 * حفظ وإعادة إرسال محاولات البصمة عند انقطاع الاتصال أو بطء الشبكة
 */

import api from "./api";
import { toast } from "sonner";

export interface QueuedPunch {
  id: string;
  action: "CHECK_IN" | "CHECK_OUT";
  originalTimestamp: string;
  workMode: string;
  location?: any;
  method?: string;
  retryCount: number;
  lastError?: string;
  createdAt: string;
}

const STORAGE_KEY = "maxp_offline_attendance_queue";

export function getQueuedPunches(): QueuedPunch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Failed to read offline attendance queue:", err);
    return [];
  }
}

export function saveQueuedPunches(items: QueuedPunch[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("attendance_queue_changed", { detail: items }));
    }
  } catch (err) {
    console.warn("Failed to persist offline attendance queue:", err);
  }
}

export function subscribeToQueue(callback: (queue: QueuedPunch[]) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = () => {
    callback(getQueuedPunches());
  };

  window.addEventListener("attendance_queue_changed", handler);
  window.addEventListener("storage", handler);
  // Initial fire
  callback(getQueuedPunches());

  return () => {
    window.removeEventListener("attendance_queue_changed", handler);
    window.removeEventListener("storage", handler);
  };
}

export function enqueuePunch(punch: Omit<QueuedPunch, "id" | "createdAt" | "retryCount">): QueuedPunch {
  const current = getQueuedPunches();
  const item: QueuedPunch = {
    ...punch,
    id: `punch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  current.push(item);
  saveQueuedPunches(current);
  return item;
}

export function removeQueuedPunch(id: string): void {
  const current = getQueuedPunches();
  const updated = current.filter((p) => p.id !== id);
  saveQueuedPunches(updated);
}

export function formatTimeArabic(dateInput: string | Date): string {
  try {
    const d = new Date(dateInput);
    return d.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(dateInput);
  }
}

let isProcessing = false;

export async function processAttendanceQueue(onSynced?: (punch: QueuedPunch, response: any) => void): Promise<void> {
  if (isProcessing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const queue = getQueuedPunches();
  if (queue.length === 0) return;

  isProcessing = true;

  const remainingQueue: QueuedPunch[] = [];

  for (const item of queue) {
    try {
      const endpoint = item.action === "CHECK_IN" ? "/hr/attendance/check-in" : "/hr/attendance/check-out";
      const payload = {
        method: item.method || "self_service",
        workMode: item.workMode || "OFFICE",
        location: item.location ? (typeof item.location === "string" ? item.location : JSON.stringify(item.location)) : null,
        originalTimestamp: item.originalTimestamp,
      };

      const res = await api.post(endpoint, payload);

      if (res?.data?.success && (res.status === 200 || res.status === 201)) {
        const timeStr = formatTimeArabic(item.originalTimestamp);
        toast.success(`تمت مزامنة البصمة بنجاح ✅ ${timeStr}`, {
          description: "تم استرداد الاتصال وتوثيق وقت البصمة الأصلي بالسيرفر.",
        });

        if (onSynced) {
          onSynced(item, res.data);
        }
      } else {
        throw new Error(res?.data?.error || "تعذر اعتماد البصمة بالسيرفر");
      }
    } catch (err: any) {
      console.warn("Error syncing queued punch:", err);
      const errMsg = err?.response?.data?.error || err?.message || "";
      const isNotEmp = errMsg.includes("غير مسجل كموظف") || err?.response?.data?.code === "NOT_AN_EMPLOYEE";
      const isAlreadyRecorded = errMsg.includes("مسبقاً") || errMsg.includes("duplicate") || errMsg.includes("مسجل بالفعل");

      if (isNotEmp) {
        toast.error("أنت غير مسجل كموظف في الشركة. يرجى تقديم طلب ربط الحساب للإدارة.");
      } else if (isAlreadyRecorded) {
        // Discard silently as it's already recorded in DB
      } else {
        remainingQueue.push({
          ...item,
          retryCount: (item.retryCount || 0) + 1,
          lastError: errMsg,
        });
      }
    }
  }

  saveQueuedPunches(remainingQueue);
  isProcessing = false;
}

export async function retryAllQueuedPunches(onSynced?: (punch: QueuedPunch, response: any) => void): Promise<void> {
  return processAttendanceQueue(onSynced);
}

// Auto-register network events & poller
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void processAttendanceQueue();
  });

  setInterval(() => {
    void processAttendanceQueue();
  }, 30_000);
}
