import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/services/apiClient";

export interface VerticalContextRecord {
  id: string;
  type?: string;
  title?: string;
  code?: string;
  status?: string;
  amount?: number;
  date?: string;
  subtitle?: string;
  href?: string;
  [key: string]: unknown;
}

export interface VerticalContextData {
  vertical?: string;
  records?: VerticalContextRecord[];
  dentalCases?: VerticalContextRecord[];
  appointments?: VerticalContextRecord[];
  serviceOrders?: VerticalContextRecord[];
  tasks?: VerticalContextRecord[];
  enrollments?: VerticalContextRecord[];
  summary?: {
    countLabel?: string;
    valueLabel?: string;
    primaryCount?: number;
    secondaryValue?: number;
    totalCount?: number;
    totalValue?: number;
    items?: VerticalContextRecord[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function useConversationVerticalContext(conversationId?: string | null) {
  const [context, setContext] = useState<VerticalContextData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!conversationId) {
      setContext(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    apiClient
      .get<{ success?: boolean; data?: VerticalContextData } | VerticalContextData>(
        `/conversations/${conversationId}/vertical-context`,
        { _skipErrorToast: true },
      )
      .then((response) => {
        if (cancelled) return;
        const raw = response.data as
          | { success?: boolean; data?: VerticalContextData }
          | VerticalContextData
          | undefined;
        const resolved =
          raw && typeof raw === "object" && "data" in raw && raw.data
            ? raw.data
            : (raw as VerticalContextData | undefined);
        setContext(
          resolved && typeof resolved === "object"
            ? (resolved as VerticalContextData)
            : null,
        );
      })
      .catch(() => {
        if (!cancelled) {
          setContext(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, refreshKey]);

  return { context, loading, refetch };
}

export default useConversationVerticalContext;
