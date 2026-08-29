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

interface ActivityItem {
  id: string;
  type: "status" | "note" | "scheduled";
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
  const [filter, setFilter] = useState<"all" | "status" | "notes">("all");

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

      const isModification = h.status === h.oldStatus && (h.status !== "TRASH" && h.status !== "DELETED");
      const isTrash = h.status === "TRASH" || h.status === "DELETED";

      const reasonLine = reason
        ? isModification
          ? t("orderDetails.modificationDetail", { reason })
          : (isCancellationStatus(h.status) || isTrash)
            ? t("orderDetails.cancellationReasonLine", { reason })
            : t("orderDetails.statusReasonLine", { reason })
        : "";

      let actionText = "";
      if (isModification) {
        actionText = t("orderDetails.orderModified");
      } else if (isTrash) {
        actionText = t("orderDetails.orderTrashed");
      } else {
        // 🛡️ (custom-status-persist): اسم الحالة المعرّف لو موجودة (خصيصًا للحالات
        // المخصصة) — وإلا الكود كما هو (الحالات النظامية بيترجمها الـ i18n عند العرض).
        const statusLabel =
          statusNameMap?.[String(h.status || "").trim().toUpperCase()] || h.status;
        actionText = t("orderDetails.statusChangeTo", { status: statusLabel });
      }

      return {
        id: `status-${h.id || idx}`,
        type: "status" as const,
        content: [actionText, reasonLine].filter(Boolean).join("\n"),
        date: h.createdAt,
        author: h.userName || h.updatedBy || h.changedBy || t("orderDetails.system"),
        icon: isModification ? PencilIcon : (isTrash ? TrashIcon : CheckCircleIcon),
        color: isModification ? "bg-indigo-500" : (isTrash ? "bg-red-500" : "bg-blue-500"),
        canModify: false,
      };
    });

    const noteActivities: ActivityItem[] = (order.orderNotes || []).map((n: any, idx: number) => ({
      id: `note-${n.id || idx}`,
      type: "note" as const,
      content: n.content,
      date: n.createdAt,
      updatedAt: n.updatedAt,
      author: getAuthorName(n, t),
      authorAvatar: getAuthorAvatar(n),
      icon: ChatBubbleLeftIcon,
      color: "bg-gray-500",
      noteId: n.id as string,
      canModify: canModifyNote(n),
      rawNote: n,
    }));

    const scheduledActivities: ActivityItem[] = order.isScheduled && order.scheduledDeliveryDate
      ? [{
          id: "scheduled-delivery",
          type: "scheduled" as const,
          content: formatScheduledDateTime(order.scheduledDeliveryDate, order.scheduledNotes),
          date: order.createdAt,
          author: t("orderDetails.system"),
          icon: CalendarIcon,
          color: "bg-orange-500",
          canModify: false,
        }]
      : [];

    return [...statusActivities, ...noteActivities, ...scheduledActivities]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [order, t, statusNameMap, canModifyNote, formatScheduledDateTime]);

  const activities = useMemo(() => {
    if (filter === "status") return rawActivities.filter((a) => a.type === "status");
    if (filter === "notes") return rawActivities.filter((a) => a.type === "note");
    return rawActivities;
  }, [rawActivities, filter]);

  const hasNotes = (order.orderNotes?.length ?? 0) > 0;
  const hasStatusHistory = (order.statusHistory?.length ?? 0) > 0;

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        {t("orderDetails.activityLog")}
      </h3>

      {/* Add Note */}
      {canAddNote && (
        <div className="mb-6">
          <label htmlFor="comment" className="sr-only">
            {t("orderDetails.addNote")}
          </label>
          <div className="flex gap-2">
            <textarea
              name="comment"
              id="comment"
              rows={2}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white resize-none"
              placeholder={t("orderDetails.addNotePlaceholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              type="button"
              onClick={handleAddNote}
              disabled={addingNote || !note.trim()}
              className="self-end inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {addingNote ? t("orderDetails.adding") : t("orderDetails.add")}
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {(hasNotes || hasStatusHistory) && (
        <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
          {(["all", "status", "notes"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`text-sm px-3 py-1 rounded-full transition-colors ${
                filter === f
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {f === "all"
                ? t("orderDetails.allActivities")
                : f === "status"
                  ? t("orderDetails.statusChanges")
                  : t("orderDetails.notes")}
            </button>
          ))}
        </div>
      )}

      <div className="flow-root">
        <ul className="-mb-8">
          {activities.map((activity, activityIdx) => (
            <li key={activity.id}>
              <div className="relative pb-8">
                {activityIdx !== activities.length - 1 ? (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                    aria-hidden="true"
                  ></span>
                ) : null}
                <div className="relative flex space-x-3 space-x-reverse">
                  <div>
                    <span
                      className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800 ${
                        activity.type === "status"
                          ? "bg-blue-500"
                          : activity.type === "scheduled"
                            ? "bg-orange-500"
                            : "bg-gray-500"
                      }`}
                    >
                      <activity.icon
                        className="h-5 w-5 text-white"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4 space-x-reverse">
                    <div className="flex-1 min-w-0">
                      {activity.type === "note" && editingNoteId === activity.noteId ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              disabled={updatingNote || !editingContent.trim()}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                            >
                              <CheckIcon className="h-4 w-4 ml-1" />
                              {t("orderDetails.save")}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={updatingNote}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              <XMarkIcon className="h-4 w-4 ml-1" />
                              {t("orderDetails.cancel")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line break-words">
                          {activity.content}
                          <div className="flex items-center gap-1.5 mt-1">
                            {activity.authorAvatar ? (
                              <img
                                src={activity.authorAvatar}
                                alt=""
                                className="h-5 w-5 rounded-full object-cover"
                              />
                            ) : (
                              <span className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[10px] font-medium text-gray-500 dark:text-gray-400">
                                {activity.author.charAt(0)}
                              </span>
                            )}
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {activity.author}
                            </span>
                            {activity.type === "note" && activity.updatedAt && activity.updatedAt !== activity.date && (
                              <span className="text-xs text-gray-400 dark:text-gray-500" title={formatDateTime(activity.updatedAt)}>
                                ({t("orderDetails.edited")})
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {activity.type === "note" && activity.canModify && editingNoteId !== activity.noteId && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(activity.rawNote)}
                            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title={t("orderDetails.editNote")}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmDelete(activity.noteId!)}
                            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title={t("orderDetails.deleteNote")}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <div className="text-right text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                        <time dateTime={activity.date}>
                          {formatDateTime(activity.date)}
                        </time>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
          {activities.length === 0 && (
            <li className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
              {t("orderDetails.noActivity")}
            </li>
          )}
        </ul>
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingNoteId && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 backdrop-blur-sm" onClick={handleCancelDelete} />
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