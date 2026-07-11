import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useSocket from "./useSocket";

export interface LiveActivity {
  id: string;
  kind: "order" | "conversation" | "alert";
  text: string;
  href?: string;
  ts: number;
}

const DASHBOARD_QUERY_PREFIX = "company-dashboard";

const ORDER_EVENTS = ["order:created", "order:updated", "order_new", "scheduled-order-ready"] as const;
const CONVERSATION_EVENTS = ["conversation:new", "conversation:updated", "conversation:assignment", "new_message_notification"] as const;

interface EventPayload {
  id?: string | number;
  orderNumber?: string | number;
  orderNumberAlias?: string | number;
  status?: string;
  name?: string;
  customerName?: string;
  channel?: string;
}

function pickOrderText(payload: EventPayload, event: string): string {
  const num = payload.orderNumber ?? payload.orderNumberAlias ?? payload.id ?? "";
  const status = payload.status ?? "";
  if (event === "order:created") return `New order #${num}`;
  if (status) return `Order #${num} → ${status}`;
  return `Order #${num} updated`;
}

function pickConversationText(payload: EventPayload, event: string): string {
  if (event === "new_message_notification") return "New message in inbox";
  const name = payload.customerName ?? payload.name ?? "a customer";
  const channel = payload.channel ?? "";
  return channel ? `${channel}: ${name}` : `New conversation — ${name}`;
}

export function useDashboardLiveSync(enabled = true) {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const [activities, setActivities] = useState<LiveActivity[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const invalidationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !socket || !isConnected) return;

    const invalidate = () => {
      if (invalidationTimer.current) return;
      invalidationTimer.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_PREFIX] });
        invalidationTimer.current = null;
      }, 600);
    };

    const pushActivity = (a: Omit<LiveActivity, "id" | "ts">) => {
      const id = `${a.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const entry: LiveActivity = { ...a, id, ts: Date.now() };
      if (seenIds.current.has(id)) return;
      seenIds.current.add(id);
      setLiveCount((c) => c + 1);
      setActivities((prev) => [entry, ...prev].slice(0, 6));
      setTimeout(() => {
        seenIds.current.delete(id);
      }, 15000);
    };

    const handlers: Record<string, (payload: EventPayload) => void> = {};

    for (const ev of ORDER_EVENTS) {
      handlers[ev] = (payload) => {
        pushActivity({ kind: "order", text: pickOrderText(payload, ev), href: "/orders" });
        invalidate();
      };
      socket.on(ev, handlers[ev]);
    }
    for (const ev of CONVERSATION_EVENTS) {
      handlers[ev] = (payload) => {
        pushActivity({ kind: "conversation", text: pickConversationText(payload, ev), href: "/inbox" });
        invalidate();
      };
      socket.on(ev, handlers[ev]);
    }

    return () => {
      for (const ev of ORDER_EVENTS) socket.off(ev, handlers[ev]);
      for (const ev of CONVERSATION_EVENTS) socket.off(ev, handlers[ev]);
      if (invalidationTimer.current) clearTimeout(invalidationTimer.current);
    };
  }, [enabled, socket, isConnected, queryClient]);

  const clearActivities = () => {
    setActivities([]);
    setLiveCount(0);
  };

  return { activities, liveCount, isConnected, clearActivities };
}