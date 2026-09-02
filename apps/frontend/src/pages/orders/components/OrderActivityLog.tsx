import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircleIcon,
  ChatBubbleLeftIcon,
  CalendarIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  ShoppingBagIcon,
  UserIcon,
  XCircleIcon,
  PencilSquareIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { useDateFormat } from "../../../hooks/useDateFormat";
import { OrderDetailsType } from "../types";

interface OrderActivityLogProps {
  order: OrderDetailsType;
  onAddNote: (note: string) => void;
  onUpdateNote: (noteId: string, content: string) => Promise<boolean>;
  onDeleteNote: (noteId: string) => Promise<boolean>;
  addingNote: boolean;
  updatingNote: boolean;
  deletingNote: boolean;
  canAddNote?: boolean;
  currentUserId?: string;
  /** 🛡️ (custom-status-persist): UPPER(code) → الاسم المعرّف (العربي) — لحالات
   *  مخصصة مش عند الـ i18n، عشان السجل يعرض الاسم مش الكود الخام. */
  statusNameMap?: Record<string, string>;
}

type ActivityCategory = "status" | "products" | "customer" | "notes" | "scheduled";
type ActivityFilter = "all" | "status" | "products" | "customer" | "notes";

interface ActivityItem {
  id: string;
  type: "status" | "note" | "scheduled";
  category: ActivityCategory;
  title: string;
  details?: string;
  content: string;
  date: string;
  author: string;
  authorAvatar?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  noteId?: string;
  canModify: boolean;
  rawNote?: any;
  updatedAt?: string;
}

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

const OrderActivityLog: React.FC<OrderActivityLogProps> = ({
  order,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  addingNote,
  updatingNote,
  deletingNote,
  canAddNote = true,
  currentUserId,
  statusNameMap,
}) => {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [note, setNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityFilter>("all");

  const handleAddNote = () => {
    if (!note.trim()) return;
    onAddNote(note);
    setNote("");
  };

  const handleStartEdit = (n: any) => {
    setEditingNoteId(n.id);
    setEditingContent(n.content);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingContent("");
  };

  const handleSaveEdit = async () => {
    if (!editingNoteId || !editingContent.trim()) return;
    const success = await onUpdateNote(editingNoteId, editingContent);
    if (success) {
      setEditingNoteId(null);
      setEditingContent("");
    }
  };

  const handleConfirmDelete = (noteId: string) => {
    setDeletingNoteId(noteId);
  };

  const handleCancelDelete = () => {
    setDeletingNoteId(null);
  };

  const handleExecuteDelete = async () => {
    if (!deletingNoteId) return;
    const success = await onDeleteNote(deletingNoteId);
    if (success) {
      setDeletingNoteId(null);
    }
  };

  const canModifyNote = (n: any): boolean => {
    if (!currentUserId) return false;
    return getNoteAuthorId(n) === currentUserId;
  };

  const formatScheduledDateTime = (dateStr: string, notes?: string | null): string => {
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString("ar-EG", {
      year: "numeric", month: "long", day: "numeric",
    });
    const timePart = d.toLocaleTimeString("ar-EG", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
    if (notes) {
      return t("orderDetails.scheduledDeliveryWithNotes", { date: datePart, time: timePart, notes });
    }
    return t("orderDetails.scheduledDelivery", { date: datePart, time: timePart });
  };

  const rawActivities: ActivityItem[] = useMemo(() => {
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
        const isModification =
          !isTrash &&
          !isCancelled &&
          ((Boolean(h.oldStatus) && h.status === h.oldStatus) ||
            (typeof h.reason === "string" && h.reason.trim().startsWith("تعديل")));

        // Classify modification category
        let category: ActivityCategory = "status";
        let itemIcon = CheckCircleIcon;
        let itemColor = "bg-blue-500";

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
            itemIcon = UserIcon;
            itemColor = "bg-emerald-500";
          } else if (isExplicitProduct) {
            category = "products";
            itemIcon = ShoppingBagIcon;
            itemColor = "bg-indigo-500";
          } else {
            category = "customer";
            itemIcon = PencilSquareIcon;
            itemColor = "bg-teal-500";
          }
        } else if (isTrash) {
          category = "status";
          itemIcon = TrashIcon;
          itemColor = "bg-red-500";
        } else if (isCancelled) {
          category = "status";
          itemIcon = XCircleIcon;
          itemColor = "bg-rose-500";
        } else {
          category = "status";
          itemIcon = CheckCircleIcon;
          itemColor = "bg-blue-500";
        }

        const reasonLine = reason
          ? isModification
            ? (reason.startsWith("تعديل") ? reason : t("orderDetails.modificationDetail", { reason }))
            : (isCancelled || isTrash)
              ? t("orderDetails.cancellationReasonLine", { reason })
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
      icon: ChatBubbleLeftIcon,
      color: "bg-slate-500",
      noteId: n.id as string,
      canModify: canModifyNote(n),
      rawNote: n,
    }));

    const scheduledActivities: ActivityItem[] = order.isScheduled && order.scheduledDeliveryDate
      ? [{
          id: "scheduled-delivery",
          type: "scheduled" as const,
          category: "scheduled" as const,
          title: t("orderDetails.scheduledSectionTitle"),
          details: formatScheduledDateTime(order.scheduledDeliveryDate, order.scheduledNotes),
          content: formatScheduledDateTime(order.scheduledDeliveryDate, order.scheduledNotes),
          date: order.createdAt,
          author: t("orderDetails.system"),
          icon: CalendarIcon,
          color: "bg-amber-500",
          canModify: false,
        }]
      : [];

    return [...statusActivities, ...noteActivities, ...scheduledActivities]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [order, t, statusNameMap, canModifyNote, formatScheduledDateTime]);

  const categoryCounts = useMemo(() => {
    return {
      all: rawActivities.length,
      status: rawActivities.filter((a) => a.category === "status" || a.category === "scheduled").length,
      products: rawActivities.filter((a) => a.category === "products").length,
      customer: rawActivities.filter((a) => a.category === "customer").length,
      notes: rawActivities.filter((a) => a.category === "notes").length,
    };
  }, [rawActivities]);

  const filterTabs: Array<{ id: ActivityFilter; label: string; count: number }> = useMemo(() => [
    { id: "all", label: t("orderDetails.allActivities"), count: categoryCounts.all },
    { id: "status", label: t("orderDetails.statusChanges"), count: categoryCounts.status },
    { id: "products", label: t("orderDetails.productChanges"), count: categoryCounts.products },
    { id: "customer", label: t("orderDetails.customerChanges"), count: categoryCounts.customer },
    { id: "notes", label: t("orderDetails.notes"), count: categoryCounts.notes },
  ], [t, categoryCounts]);

  const activities = useMemo(() => {
    if (filter === "status") {
      return rawActivities.filter((a) => a.category === "status" || a.category === "scheduled");
    }
    if (filter === "products") {
      return rawActivities.filter((a) => a.category === "products");
    }
    if (filter === "customer") {
      return rawActivities.filter((a) => a.category === "customer");
    }
    if (filter === "notes") {
      return rawActivities.filter((a) => a.category === "notes");
    }
    return rawActivities;
  }, [rawActivities, filter]);

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          {t("orderDetails.activityLog")}
        </h3>
        <span className="text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full">
          {rawActivities.length}
        </span>
      </div>

      {/* Add Note Section */}
      {canAddNote && (
        <div className="mb-5">
          <label htmlFor="activity-comment" className="sr-only">
            {t("orderDetails.addNote")}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <textarea
              name="activity-comment"
              id="activity-comment"
              rows={2}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full text-sm border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white resize-none p-2.5"
              placeholder={t("orderDetails.addNotePlaceholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              type="button"
              onClick={handleAddNote}
              disabled={addingNote || !note.trim()}
              className="sm:self-end inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors shrink-0"
            >
              {addingNote ? t("orderDetails.adding") : t("orderDetails.add")}
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs (Horizontal Scrollable) */}
      <div className="flex gap-1.5 mb-5 border-b border-gray-200 dark:border-gray-700 pb-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {filterTabs.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`inline-flex items-center gap-1.5 text-xs sm:text-sm px-3 py-1.5 rounded-full transition-all whitespace-nowrap font-medium ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm dark:bg-blue-600 dark:text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700/60 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isActive
                    ? "bg-white/25 text-white"
                    : "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Activities Timeline */}
      <div className="flow-root">
        <ul className="-mb-8">
          {activities.map((activity, activityIdx) => (
            <li key={activity.id}>
              <div className="relative pb-6">
                {activityIdx !== activities.length - 1 ? (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative flex space-x-3 space-x-reverse">
                  <div>
                    <span
                      className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-gray-800 text-white shadow-sm ${activity.color}`}
                    >
                      <activity.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5 flex justify-between space-x-3 space-x-reverse">
                    <div className="flex-1 min-w-0">
                      {activity.type === "note" && editingNoteId === activity.noteId ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full text-sm border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white p-2"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              disabled={updatingNote || !editingContent.trim()}
                              className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                            >
                              <CheckIcon className="h-3.5 w-3.5 ml-1" />
                              {t("orderDetails.save")}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={updatingNote}
                              className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              <XMarkIcon className="h-3.5 w-3.5 ml-1" />
                              {t("orderDetails.cancel")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm">
                          {/* Content Body with nice bulleted styling if diff lines exist */}
                          <div className="text-gray-800 dark:text-gray-200 leading-relaxed break-words">
                            {activity.content.split("\n").map((line, lIdx) => {
                              const trimmedLine = line.trim();
                              if (!trimmedLine) return null;
                              if (trimmedLine.startsWith("•") || trimmedLine.startsWith("-")) {
                                return (
                                  <div
                                    key={lIdx}
                                    className="my-1 mr-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40 p-2 rounded border-r-2 border-blue-500"
                                  >
                                    {trimmedLine}
                                  </div>
                                );
                              }
                              return (
                                <p
                                  key={lIdx}
                                  className={
                                    lIdx === 0
                                      ? "font-semibold text-gray-900 dark:text-gray-100"
                                      : "text-gray-600 dark:text-gray-300 text-xs sm:text-sm mt-0.5"
                                  }
                                >
                                  {line}
                                </p>
                              );
                            })}
                          </div>

                          {/* Author & Timestamp Row */}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1.5">
                              {activity.authorAvatar ? (
                                <img
                                  src={activity.authorAvatar}
                                  alt=""
                                  className="h-4 w-4 rounded-full object-cover"
                                />
                              ) : (
                                <span className="h-4 w-4 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[9px] font-semibold text-gray-600 dark:text-gray-300">
                                  {activity.author.charAt(0)}
                                </span>
                              )}
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {activity.author}
                              </span>
                            </div>

                            <span>•</span>
                            <time dateTime={activity.date} className="text-gray-400 dark:text-gray-500">
                              {formatDateTime(activity.date)}
                            </time>

                            {activity.type === "note" && activity.updatedAt && activity.updatedAt !== activity.date && (
                              <span
                                className="text-[11px] text-gray-400 dark:text-gray-500"
                                title={formatDateTime(activity.updatedAt)}
                              >
                                ({t("orderDetails.edited")})
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons for Notes */}
                    {activity.type === "note" && activity.canModify && editingNoteId !== activity.noteId && (
                      <div className="flex items-center gap-1.5 shrink-0 self-start">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(activity.rawNote)}
                          className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          title={t("orderDetails.editNote")}
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(activity.noteId!)}
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          title={t("orderDetails.deleteNote")}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}

          {activities.length === 0 && (
            <li className="text-center py-8">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filter === "all"
                  ? t("orderDetails.noActivity")
                  : t("orderDetails.noActivitiesInCategory")}
              </p>
            </li>
          )}
        </ul>
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingNoteId && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 backdrop-blur-sm"
              onClick={handleCancelDelete}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl border dark:border-gray-700 max-w-md w-full">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                  <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {t("orderDetails.deleteNoteConfirmTitle")}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {t("orderDetails.deleteNoteConfirmMessage")}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={handleExecuteDelete}
                    disabled={deletingNote}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {deletingNote ? t("orderDetails.deleting") : t("orderDetails.yesDelete")}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelDelete}
                    disabled={deletingNote}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {t("orderDetails.cancel")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderActivityLog;