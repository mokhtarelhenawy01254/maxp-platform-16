import { useState, useEffect, useCallback } from "react";
import { telephonyClientService, DevicePresenceResponse } from "../services/telephonyService";

// الحالة المشتركة لجميع المكونات (Module-Level Singleton Store)
let sharedPresence: DevicePresenceResponse = {
  isOnline: false,
  device: null,
};

let inFlightPromise: Promise<DevicePresenceResponse> | null = null;
let pollTimer: any = null;
let lastFetchedAt = 0;
const subscribers = new Set<() => void>();

/**
 * جلب حالة الاتصال مرة واحدة مع منع تكرار الطلبات المتزامنة (Deduplication)
 */
export async function refreshDevicePresence(): Promise<DevicePresenceResponse> {
  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const data = await telephonyClientService.getDevicePresence();
      sharedPresence = data;
      lastFetchedAt = Date.now();
      subscribers.forEach((cb) => {
        try {
          cb();
        } catch {
          // ignore subscriber error
        }
      });
      return data;
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

function startPollingIfNeeded() {
  if (pollTimer) return;

  // جلب فوري إذا مرت أكثر من 10 ثوانٍ على آخر استعلام
  if (Date.now() - lastFetchedAt > 10000) {
    refreshDevicePresence();
  }

  pollTimer = setInterval(() => {
    refreshDevicePresence();
  }, 30000); // دورة موحدة كل 30 ثانية لكل التطبيق

  if (typeof window !== "undefined") {
    window.addEventListener("focus", handleWindowFocus);
  }
}

function stopPollingIfEmpty() {
  if (subscribers.size === 0 && pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    if (typeof window !== "undefined") {
      window.removeEventListener("focus", handleWindowFocus);
    }
  }
}

function handleWindowFocus() {
  if (Date.now() - lastFetchedAt > 5000) {
    refreshDevicePresence();
  }
}

/**
 * Hook مشترك لمراقبة اتصال هاتف الموظف بدون تكرار طلبات الـ HTTP
 */
export function useDevicePresence() {
  const [presence, setPresence] = useState<DevicePresenceResponse>(sharedPresence);

  useEffect(() => {
    const onStoreUpdate = () => {
      setPresence({ ...sharedPresence });
    };

    subscribers.add(onStoreUpdate);
    startPollingIfNeeded();

    // مزامنة فورية بالحالة الحالية
    setPresence({ ...sharedPresence });

    return () => {
      subscribers.delete(onStoreUpdate);
      stopPollingIfEmpty();
    };
  }, []);

  const refresh = useCallback(() => {
    return refreshDevicePresence();
  }, []);

  return {
    presence,
    isOnline: presence.isOnline,
    device: presence.device,
    refresh,
  };
}

export default useDevicePresence;
