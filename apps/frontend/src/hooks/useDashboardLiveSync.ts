import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useSocket from "./useSocket";

export interface LiveActivity {
  id: string;
  kind: "order" | "conversation" | "whatsapp" | "campaign" | "import" | "notification" | "ai";
  text: string;
  href?: string;
  ts: number;
}

const DASHBOARD_QUERY_PREFIX = "company-dashboard";

const ORDER_EVENTS = ["order:created", "order:updated", "order_new", "scheduled-order-ready"] as const;
const CONVERSATION_EVENTS = ["conversation:new", "conversation:updated", "conversation:assignment", "new_message_notification"] as const;
const WHATSAPP_EVENTS = ["whatsapp:connection", "whatsapp:message:new", "whatsapp:message:sent"] as const;
const CAMPAIGN_EVENTS = ["campaign:progress"] as const;
const IMPORT_EVENTS = ["import:completed", "import:failed"] as const;
const NOTIFICATION_EVENTS = ["notification:new"] as const;
const AI_EVENTS = ["ai:escalation"] as const;

interface EventPayload {
  id?: string | number;
  orderNumber?: string | number;
  orderNumberAlias?: string | number;
  status?: string;
  name?: string;
  customerName?: string;
  channel?: string;
  type?: string;
  campaignId?: string;
  sentCount?: number;
  totalCount?: number;
  title?: string;
  message?: string;
  companyId?: string;
}

function pickOrderText(payload: EventPayload, event: string): string {
  const num = payload.orderNumber ?? payload.orderNumberAlias ?? payload.id ?? "";
  const status = payload.status ?? "";
  if (event === "order:created") return `طلب جديد #${num}`;
  if (event === "order_new") return `طلب جديد #${num}`;
  if (event === "scheduled-order-ready") return `طلب مجدول جاهز #${num}`;
  if (status) return `الطلب #${num} → ${status}`;
  return `تم تحديث الطلب #${num}`;
}

function pickConversationText(payload: EventPayload): string {
  const name = payload.customerName ?? payload.name ?? "عميل";
  const channel = payload.channel ?? "";
  return channel ? `محادثة جديدة عبر ${channel} — ${name}` : `محادثة جديدة — ${name}`;
}

function pickWhatsAppText(payload: EventPayload, event: string): string {
  if (event === "whatsapp:connection") return payload.status === "CONNECTED" ? "واتساب متصل" : "واتساب غير متصل";
  return payload.customerName ? `رسالة واتساب جديدة من ${payload.customerName}` : "رسالة واتساب جديدة";
}

function pickCampaignText(payload: EventPayload): string {
  const campaign = payload.name ?? payload.campaignId ?? "";
  const sent = payload.sentCount ?? 0;
  const total = payload.totalCount ?? 0;
  return campaign ? `حملة ${campaign}: ${sent}/${total} مرسلة` : `تقدم الحملة: ${sent}/${total}`;
}

function pickImportText(payload: EventPayload, event: string): string {
  if (event === "import:completed") return `استيراد ${payload.name ?? ""} اكتمل بنجاح`;
  return `فشل استيراد ${payload.name ?? ""}`;
}

function pickNotificationText(payload: EventPayload): string {
  return payload.title ?? payload.message ?? "إشعار جديد";
}

function pickAiText(): string {
  return "تصعيد إلى مشرف بشري (AI)";
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
      setTimeout(() => { seenIds.current.delete(id); }, 15000);
    };

    const handlers: Record<string, (payload: EventPayload) => void> = {};

    for (const ev of ORDER_EVENTS) {
      handlers[ev] = (p) => { pushActivity({ kind: "order", text: pickOrderText(p, ev), href: "/orders" }); invalidate(); };
      socket.on(ev, handlers[ev]);
    }
    for (const ev of CONVERSATION_EVENTS) {
      handlers[ev] = (p) => { pushActivity({ kind: "conversation", text: pickConversationText(p), href: "/unified-inbox" }); invalidate(); };
      socket.on(ev, handlers[ev]);
    }
    for (const ev of WHATSAPP_EVENTS) {
      handlers[ev] = (p) => { pushActivity({ kind: "whatsapp", text: pickWhatsAppText(p, ev), href: "/whatsapp" }); };
      socket.on(ev, handlers[ev]);
    }
    for (const ev of CAMPAIGN_EVENTS) {
      handlers[ev] = (p) => { pushActivity({ kind: "campaign", text: pickCampaignText(p) }); invalidate(); };
      socket.on(ev, handlers[ev]);
    }
    for (const ev of IMPORT_EVENTS) {
      handlers[ev] = (p) => { pushActivity({ kind: "import", text: pickImportText(p, ev) }); };
      socket.on(ev, handlers[ev]);
    }
    for (const ev of NOTIFICATION_EVENTS) {
      handlers[ev] = (p) => { pushActivity({ kind: "notification", text: pickNotificationText(p) }); };
      socket.on(ev, handlers[ev]);
    }
    for (const ev of AI_EVENTS) {
      handlers[ev] = () => { pushActivity({ kind: "ai", text: pickAiText(), href: "/admin/ai-hub" }); };
      socket.on(ev, handlers[ev]);
    }

    return () => {
      for (const ev of [...ORDER_EVENTS, ...CONVERSATION_EVENTS, ...WHATSAPP_EVENTS, ...CAMPAIGN_EVENTS, ...IMPORT_EVENTS, ...NOTIFICATION_EVENTS, ...AI_EVENTS]) {
        socket.off(ev, handlers[ev]);
      }
      if (invalidationTimer.current) clearTimeout(invalidationTimer.current);
    };
  }, [enabled, socket, isConnected, queryClient]);

  const clearActivities = () => { setActivities([]); setLiveCount(0); };

  return { activities, liveCount, isConnected, clearActivities };
}
