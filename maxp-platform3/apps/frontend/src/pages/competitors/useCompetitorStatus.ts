import { useCallback, useEffect, useRef } from 'react';
import { apiClient } from '../../services/apiClient';
import type { CompetitorStatus } from './CompetitorStatusBar';

const SYNC_CHANNEL = 'competitor-status-sync';

interface StatusChangeEvent {
  type: 'STATUS_CHANGE';
  competitorId: string;
  status: CompetitorStatus;
}

function broadcastStatusChange(competitorId: string, status: CompetitorStatus) {
  try {
    const channel = new BroadcastChannel(SYNC_CHANNEL);
    channel.postMessage({ type: 'STATUS_CHANGE', competitorId, status } satisfies StatusChangeEvent);
    channel.close();
  } catch {
    // BroadcastChannel not supported
  }
}

export function useCompetitorStatusSync(onRemoteChange: (competitorId: string, status: CompetitorStatus) => void) {
  const handlerRef = useRef(onRemoteChange);
  handlerRef.current = onRemoteChange;

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(SYNC_CHANNEL);
      channel.onmessage = (event: MessageEvent) => {
        const data = event.data as StatusChangeEvent;
        if (data?.type === 'STATUS_CHANGE') {
          handlerRef.current(data.competitorId, data.status);
        }
      };
    } catch {
      // BroadcastChannel not supported
    }
    return () => {
      channel?.close();
    };
  }, []);
}

export async function updateCompetitorStatus(
  competitorId: string,
  status: CompetitorStatus,
): Promise<boolean> {
  try {
    await apiClient.patch(`/competitors/${competitorId}/status`, { status });
    broadcastStatusChange(competitorId, status);
    return true;
  } catch {
    return false;
  }
}
