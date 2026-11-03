import { get, set } from 'idb-keyval';
import courierPortalApi from './courierPortalApi';
import { useState, useEffect, useCallback } from 'react';

export interface QueuedDeliveryAction {
  localId: string;
  runId: string;
  shipmentId: string;
  status: 'DELIVERED' | 'FAILED' | 'DELAYED' | 'RETURNED';
  collectedAmount?: number;
  otp?: string;
  failureReasonCode?: string;
  notes?: string;
  nextAttemptDate?: string;
  occurredAt: string;
  errorCount?: number;
  lastError?: string;
}

const QUEUE_STORAGE_KEY = 'courier_offline_delivery_queue';
const QUEUE_CHANGE_EVENT = 'courier-offline-queue-changed';

export const getQueuedActions = async (): Promise<QueuedDeliveryAction[]> => {
  try {
    const list = await get<QueuedDeliveryAction[]>(QUEUE_STORAGE_KEY);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Failed to read offline queue from IDB:', err);
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
};

const persistQueue = async (queue: QueuedDeliveryAction[]): Promise<void> => {
  try {
    await set(QUEUE_STORAGE_KEY, queue);
  } catch (err) {
    console.error('Failed to save offline queue to IDB, fallback to localStorage:', err);
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch {
      // ignore
    }
  }

  // Notify listeners across app
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(QUEUE_CHANGE_EVENT, {
        detail: { count: queue.length },
      })
    );
  }
};

export const enqueueAction = async (
  action: Omit<QueuedDeliveryAction, 'localId' | 'occurredAt'>
): Promise<QueuedDeliveryAction> => {
  const current = await getQueuedActions();
  const newAction: QueuedDeliveryAction = {
    ...action,
    localId: `loc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    occurredAt: new Date().toISOString(),
  };

  const updated = [...current, newAction];
  await persistQueue(updated);
  return newAction;
};

export const removeQueuedAction = async (localId: string): Promise<void> => {
  const current = await getQueuedActions();
  const updated = current.filter((item) => item.localId !== localId);
  await persistQueue(updated);
};

export const clearQueue = async (): Promise<void> => {
  await persistQueue([]);
};

export const syncOfflineQueue = async (): Promise<{
  synced: number;
  failed: number;
  message?: string;
}> => {
  const current = await getQueuedActions();
  if (current.length === 0) {
    return { synced: 0, failed: 0, message: 'لا توجد عمليات بانتظار المزامنة' };
  }

  try {
    const res = await courierPortalApi.syncDeliveryActions(current);
    if (res.success) {
      await clearQueue();
      return { synced: res.synced ?? current.length, failed: 0 };
    }
  } catch (syncErr: any) {
    console.warn('Batch sync endpoint failed, attempting item-by-item sync fallback:', syncErr);
  }

  // Fallback: item-by-item sync
  let synced = 0;
  let failed = 0;
  const remaining: QueuedDeliveryAction[] = [];

  for (const item of current) {
    try {
      await courierPortalApi.updateDeliveryAction(item.runId, item.shipmentId, {
        status: item.status,
        collectedAmount: item.collectedAmount,
        otp: item.otp,
        failureReasonCode: item.failureReasonCode,
        notes: item.notes,
        nextAttemptDate: item.nextAttemptDate,
      });
      synced++;
    } catch (err: any) {
      failed++;
      remaining.push({
        ...item,
        errorCount: (item.errorCount || 0) + 1,
        lastError: err?.message || 'تعذر المزامنة',
      });
    }
  }

  await persistQueue(remaining);
  return { synced, failed };
};

// Auto-sync listener on reconnection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void syncOfflineQueue();
  });
}

/**
 * React hook to track offline queue state and triggers
 */
export const useOfflineQueue = () => {
  const [queueCount, setQueueCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const refreshCount = useCallback(async () => {
    const items = await getQueuedActions();
    setQueueCount(items.length);
  }, []);

  useEffect(() => {
    void refreshCount();

    const handleQueueChange = (e: any) => {
      const count = e?.detail?.count;
      if (typeof count === 'number') {
        setQueueCount(count);
      } else {
        void refreshCount();
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      void syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener(QUEUE_CHANGE_EVENT, handleQueueChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener(QUEUE_CHANGE_EVENT, handleQueueChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshCount]);

  const syncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncOfflineQueue();
      await refreshCount();
      return result;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    queueCount,
    isSyncing,
    isOnline,
    syncNow,
    refreshCount,
  };
};
