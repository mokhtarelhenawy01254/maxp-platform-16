import React from "react";
import {
  CheckCircle2,
  MessageSquare,
  Calendar,
  Trash2,
  ShoppingBag,
  User,
  XCircle,
  Edit,
  RotateCcw,
} from "lucide-react";
import { OrderDetailsType } from "../../types";
import { isReturnStatusCode } from "../../utils/returnHelper";
import { ActivityItem } from "./OrderActivityLogItem";

type ActivityCategory = "status" | "products" | "customer" | "notes" | "scheduled";

const isCancellationStatus = (status?: string | null) => {
  const normalizedStatus = String(status || "").trim().toUpperCase();
  return normalizedStatus === "CANCELLED" || normalizedStatus === "CANCELED";
};

const getNoteAuthorId = (n: any): string | undefined => {
  return n.authorId || n.author?.id || undefined;
};

const getAuthorAvatar = (n: any): string | undefined => {
  return n.author?.avatar || n.user?.avatar || undefined;
};

const getAuthorName = (n: any, t: any): string => {
  if (n.authorName) return n.authorName;
  if (n.author) return `${n.author.firstName} ${n.author.lastName}`.trim();
  if (n.user) return `${n.user.firstName} ${n.user.lastName}`.trim();
  return t("orderDetails.user");
};

interface BuildActivitiesOptions {
  order: OrderDetailsType;
  t: (key: string, params?: Record<string, string>) => string;
  statusNameMap?: Record<string, string>;
  currentUserId?: string;
  formatScheduledDateTime: (dateStr: string, notes?: string | null) => string;
  serverEvents?: any[] | null;
}

export function buildOrderActivities({
  order,
  t,
  statusNameMap,
  currentUserId,
  formatScheduledDateTime,
  serverEvents,
}: BuildActivitiesOptions): ActivityItem[] {
  const canModifyNote = (n: any): boolean => {
    if (!currentUserId) return false;
    return getNoteAuthorId(n) === currentUserId;
  };

  const statusActivities: ActivityItem[] = (order.statusHistory || [])
    .filter((entry) => entry != null)
    .map((h: any, idx: number) => {
      const reason =
        typeof h.reason === "string" && h.reason.trim()
          ? h.reason.trim()
          : typeof h.notes === "string" && h.notes.trim()
            ? h.notes.trim()
            : "";

      const isTrash = h.status === "TRASH" || h.status === "DELETED";
      const isCancelled = isCancellationStatus(h.status);
      const isReturned =
        isReturnStatusCode(h.status) || String(h.status || "").toUpperCase().includes("RETURN");
      const isModification =
        !isTrash &&
        !isCancelled &&
        !isReturned &&
        ((Boolean(h.oldStatus) && h.status === h.oldStatus) ||
          (typeof h.reason === "string" && h.reason.trim().startsWith("تعديل")));

      let category: ActivityCategory = "status";
      let itemIcon: any = CheckCircle2;
      let itemColor = "bg-primary";

      if (isModification) {
        const lowerReason = reason.toLowerCase();
        const isExplicitCustomer =
          lowerReason.includes("عميل") ||
          lowerReason.includes("هاتف") ||
          lowerReason.includes("عنوان") ||
          lowerReason.includes("محافظة") ||
          lowerReason.includes("مدينة") ||
          lowerReason.includes("الرقم البديل") ||
          lowerReason.includes("البيانات الأساسية") ||
          lowerReason.includes("ملاحظات") ||
          lowerReason.includes("شحن");

        const isExplicitProduct =
          lowerReason.includes("منتج") ||
          lowerReason.includes("منتجات") ||
          lowerReason.includes("سعر") ||
          lowerReason.includes("الكمية") ||
          lowerReason.includes("إجمالي الطلب") ||
          lowerReason.includes("مصاريف الشحن");

        if (isExplicitCustomer) {
          category = "customer";
          itemIcon = User;
          itemColor = "bg-emerald-500";
        } else if (isExplicitProduct) {
          category = "products";
          itemIcon = ShoppingBag;
          itemColor = "bg-indigo-500";
        } else {
          category = "customer";
          itemIcon = Edit;
          itemColor = "bg-teal-500";
        }
      } else if (isTrash) {
        category = "status";
        itemIcon = Trash2;
        itemColor = "bg-destructive";
      } else if (isCancelled) {
        category = "status";
        itemIcon = XCircle;
        itemColor = "bg-rose-500";
      } else if (isReturned) {
        category = "status";
        itemIcon = RotateCcw;
        itemColor =
          String(h.status || "").toUpperCase() === "PARTIALLY_RETURNED"
            ? "bg-amber-500"
            : "bg-rose-600";
      } else {
        category = "status";
        itemIcon = CheckCircle2;
        itemColor = "bg-primary";
      }

      const reasonLine = reason
        ? isModification
          ? reason.startsWith("تعديل")
            ? reason
            : t("orderDetails.modificationDetail", { reason })
          : isCancelled || isTrash
            ? t("orderDetails.cancellationReasonLine", { reason })
            : isReturned
              ? t("orderDetails.returnReasonLine", {
                  reason,
                  defaultValue: `سبب المرتجع: ${reason}`,
                } as any)
              : t("orderDetails.statusReasonLine", { reason })
        : "";

      let actionTitle = "";
      if (isModification) {
        if (category === "products") {
          actionTitle = t("orderDetails.productChanges");
        } else if (category === "customer") {
          actionTitle = t("orderDetails.customerChanges");
        } else {
          actionTitle = t("orderDetails.orderModified");
        }
      } else if (isTrash) {
        actionTitle = t("orderDetails.orderTrashed");
      } else if (isReturned) {
        const isPartial = String(h.status || "").toUpperCase() === "PARTIALLY_RETURNED";
        actionTitle = isPartial
          ? t("orderDetails.orderPartiallyReturned", {
              defaultValue: "تغيير الحالة إلى مرتجع جزئياً",
            } as any)
          : t("orderDetails.orderReturned", {
              defaultValue: "تغيير الحالة إلى مرتجع",
            } as any);
      } else {
        const statusLabel =
          statusNameMap?.[String(h.status || "").trim().toUpperCase()] || h.status;
        actionTitle = t("orderDetails.statusChangeTo", { status: statusLabel });
      }

      const fullContent = [actionTitle, reasonLine].filter(Boolean).join("\n");

      return {
        id: `status-${h.id || idx}`,
        type: "status" as const,
        category,
        title: actionTitle,
        details: reasonLine,
        content: fullContent,
        date: h.createdAt,
        author: h.userName || h.updatedBy || h.changedBy || t("orderDetails.system"),
        icon: itemIcon,
        color: itemColor,
        canModify: false,
      };
    });

  const noteActivities: ActivityItem[] = (order.orderNotes || []).map((n: any, idx: number) => ({
    id: `note-${n.id || idx}`,
    type: "note" as const,
    category: "notes" as const,
    title: t("orderDetails.notes"),
    details: n.content,
    content: n.content,
    date: n.createdAt,
    updatedAt: n.updatedAt,
    author: getAuthorName(n, t),
    authorAvatar: getAuthorAvatar(n),
    icon: MessageSquare,
    color: "bg-slate-500",
    noteId: n.id as string,
    canModify: canModifyNote(n),
    rawNote: n,
  }));

  const scheduledActivities: ActivityItem[] =
    order.isScheduled && order.scheduledDeliveryDate
      ? [
          {
            id: "scheduled-delivery",
            type: "scheduled" as const,
            category: "scheduled" as const,
            title: t("orderDetails.scheduledSectionTitle"),
            details: formatScheduledDateTime(
              order.scheduledDeliveryDate,
              order.scheduledNotes
            ),
            content: formatScheduledDateTime(
              order.scheduledDeliveryDate,
              order.scheduledNotes
            ),
            date: order.createdAt,
            author: t("orderDetails.system"),
            icon: Calendar,
            color: "bg-amber-500",
            canModify: false,
          },
        ]
      : [];

  if (Array.isArray(serverEvents)) {
    const rawNotesById = new Map<string, any>(
      (order.orderNotes || []).filter((n: any) => n?.id).map((n: any) => [String(n.id), n])
    );
    const seenEventKeys = new Set<string>();
    const seenNoteIds = new Set<string>();
    const seenNoteSignatures = new Set<string>();
    const serverItems: ActivityItem[] = [];

    for (const ev of serverEvents) {
      if (!ev) continue;
      const key = String(ev.eventKey || `${ev.source || "server"}:${ev.id || serverItems.length}`);
      if (seenEventKeys.has(key)) continue;
      seenEventKeys.add(key);

      const evType = String(ev.type || "").toLowerCase();
      const actorName = ev.actor?.name || t("orderDetails.system");

      if (evType === "note") {
        const noteId = String(ev.meta?.noteId || ev.id || "");
        const matchedNote = noteId ? rawNotesById.get(noteId) : undefined;
        const content = String(matchedNote?.content ?? ev.meta?.content ?? ev.title ?? "");
        if (noteId) seenNoteIds.add(noteId);
        seenNoteSignatures.add(`${content.trim()}::${actorName}`);

        serverItems.push({
          id: key,
          type: "note",
          category: "notes",
          title: t("orderDetails.notes"),
          details: content,
          content,
          date: ev.at,
          updatedAt: matchedNote?.updatedAt,
          author: actorName,
          authorAvatar: ev.actor?.avatar || (matchedNote ? getAuthorAvatar(matchedNote) : undefined),
          icon: MessageSquare,
          color: "bg-slate-500",
          noteId: noteId || undefined,
          canModify: matchedNote ? canModifyNote(matchedNote) : false,
          rawNote: matchedNote,
        });
        continue;
      }

      const statusUpper = String(ev.meta?.status || "").toUpperCase();
      let category: ActivityCategory = "status";
      let itemIcon: any = CheckCircle2;
      let itemColor = "bg-primary";

      if (evType === "payment" || evType === "discount") {
        category = "products";
        itemColor = ev.action === "order.payment.failed" || ev.action === "order.discount.rejected" ? "bg-rose-500" : "bg-emerald-600";
        itemIcon = ev.action === "order.payment.failed" || ev.action === "order.discount.rejected" ? XCircle : CheckCircle2;
      } else if (evType === "assign" || evType === "call") {
        category = "customer";
        itemIcon = User;
        itemColor = "bg-indigo-500";
      } else if (evType === "edit") {
        const lowerTitle = String(ev.title || "").toLowerCase();
        category = lowerTitle.includes("منتج") || lowerTitle.includes("سعر") ? "products" : "customer";
        itemIcon = category === "products" ? ShoppingBag : Edit;
        itemColor = category === "products" ? "bg-indigo-500" : "bg-teal-500";
      } else if (statusUpper === "TRASH" || statusUpper === "DELETED") {
        itemIcon = Trash2;
        itemColor = "bg-destructive";
      } else if (isCancellationStatus(statusUpper)) {
        itemIcon = XCircle;
        itemColor = "bg-rose-500";
      } else if (isReturnStatusCode(statusUpper) || statusUpper.includes("RETURN")) {
        itemIcon = RotateCcw;
        itemColor = statusUpper === "PARTIALLY_RETURNED" ? "bg-amber-500" : "bg-rose-600";
      } else if (evType === "create") {
        itemColor = "bg-emerald-600";
      }

      const rawReason = typeof ev.meta?.reason === "string" ? ev.meta.reason.trim() : "";
      const hasMappedStatusTitle = evType === "status" && Boolean(statusUpper && statusNameMap?.[statusUpper]);
      const title = hasMappedStatusTitle
        ? t("orderDetails.statusChangeTo", { status: statusNameMap![statusUpper] })
        : String(ev.title || ev.action || "");

      const isCancelled = isCancellationStatus(statusUpper);
      const isReturned = isReturnStatusCode(statusUpper) || statusUpper.includes("RETURN");
      const reasonLine =
        evType === "status" && rawReason && (hasMappedStatusTitle || title !== rawReason)
          ? isCancelled || statusUpper === "TRASH" || statusUpper === "DELETED"
            ? t("orderDetails.cancellationReasonLine", { reason: rawReason })
            : isReturned
              ? t("orderDetails.returnReasonLine", {
                  reason: rawReason,
                  defaultValue: `سبب المرتجع: ${rawReason}`,
                } as any)
              : t("orderDetails.statusReasonLine", { reason: rawReason })
          : rawReason;
      const content = evType === "status" && reasonLine && title !== reasonLine ? [title, reasonLine].filter(Boolean).join("\n") : title;

      serverItems.push({
        id: key,
        type: "status",
        category,
        title,
        details: reasonLine,
        content,
        date: ev.at,
        author: actorName,
        authorAvatar: ev.actor?.avatar || undefined,
        icon: itemIcon,
        color: itemColor,
        canModify: false,
      });
    }

    const optimisticNotes = noteActivities.filter((n) => {
      if (n.noteId && seenNoteIds.has(String(n.noteId))) return false;
      const sig = `${String(n.content || "").trim()}::${n.author}`;
      return !seenNoteSignatures.has(sig);
    });

    return [...serverItems, ...optimisticNotes, ...scheduledActivities].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  return [...statusActivities, ...noteActivities, ...scheduledActivities].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
