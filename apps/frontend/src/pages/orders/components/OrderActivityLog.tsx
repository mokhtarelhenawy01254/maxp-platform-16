import React, { useState } from "react";
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
import { OrderDetailsType, OrderNote } from "../types";

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
}

const isCancellationStatus = (status?: string | null) => {
  const normalizedStatus = String(status || "").trim().toUpperCase();
  return normalizedStatus === "CANCELLED" || normalizedStatus === "CANCELED";
};

const getNoteAuthorId = (n: any): string | undefined => {
  return n.authorId || n.author?.id || undefined;
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
}) => {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [note, setNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

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

  // Merge status history, notes, and scheduled info for timeline
  const activities = [
    ...(order.statusHistory || []).map((h: any) => {
      const reason =
        typeof h.reason === "string" && h.reason.trim()
          ? h.reason.trim()
          : typeof h.notes === "string" && h.notes.trim()
            ? h.notes.trim()
            : "";
            
      const isModification = h.status === h.oldStatus && (h.status !== "TRASH" && h.status !== "DELETED");
      const isTrash = h.status === "TRASH" || h.status === "DELETED";
      
      const reasonLine = reason
        ? (isCancellationStatus(h.status) || isTrash || isModification)
            ? t("orderDetails.cancellationReasonLine", { reason })
            : t("orderDetails.statusReasonLine", { reason })
        : "";

      let actionText = "";
      if (isModification) {
        actionText = "تعديل بيانات الطلب";
      } else if (isTrash) {
        actionText = "تم نقل الطلب إلى سلة المهملات";
      } else {
        actionText = t("orderDetails.statusChangeTo", { status: h.status });
      }

      return {
        type: "status" as const,
        content: [
          actionText,
          reasonLine,
        ]
          .filter(Boolean)
          .join("\n"),
        date: h.createdAt,
        author:
          h.userName || h.updatedBy || h.changedBy || t("orderDetails.system"),
        icon: isModification ? PencilIcon : (isTrash ? TrashIcon : CheckCircleIcon),
        color: isModification ? "bg-indigo-500" : (isTrash ? "bg-red-500" : "bg-blue-500"),
        noteId: undefined as string | undefined,
        canModify: false,
      };
    }),
    ...(order.orderNotes || []).map((n: any) => ({
      type: "note" as const,
      content: n.content,
      date: n.createdAt,
      author:
        n.authorName ||
        (n.author
          ? `${n.author.firstName} ${n.author.lastName}`
          : t("orderDetails.user")),
      icon: ChatBubbleLeftIcon,
      color: "bg-gray-500",
      noteId: n.id as string,
      canModify: canModifyNote(n),
      rawNote: n,
    })),
    ...(order.isScheduled && order.scheduledDeliveryDate
      ? [
          {
            type: "scheduled" as const,
            content: `تم جدولة الطلب للتسليم في ${new Date(
              order.scheduledDeliveryDate,
            ).toLocaleDateString("ar-EG", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })} الساعة ${new Date(
              order.scheduledDeliveryDate,
            ).toLocaleTimeString("ar-EG", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}${order.scheduledNotes ? `\n📝 ${order.scheduledNotes}` : ""}`,
            date: order.createdAt,
            author: "النظام",
            icon: CalendarIcon,
            color: "bg-orange-500",
            noteId: undefined as string | undefined,
            canModify: false,
          },
        ]
      : []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
            <input
              type="text"
              name="comment"
              id="comment"
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              placeholder={t("orderDetails.addNotePlaceholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
            />
            <button
              type="button"
              onClick={handleAddNote}
              disabled={addingNote || !note.trim()}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {addingNote ? t("orderDetails.adding") : t("orderDetails.add")}
            </button>
          </div>
        </div>
      )}

      <div className="flow-root">
        <ul className="-mb-8">
          {activities.map((activity, activityIdx) => (
            <li key={activity.noteId || activityIdx}>
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
                    <div className="flex-1">
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
                              حفظ
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={updatingNote}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              <XMarkIcon className="h-4 w-4 ml-1" />
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line">
                          {activity.content}{" "}
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {activity.author}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {activity.type === "note" && activity.canModify && editingNoteId !== activity.noteId && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(activity.rawNote)}
                            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="تعديل الملاحظة"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmDelete(activity.noteId!)}
                            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="حذف الملاحظة"
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
              لا يوجد نشاط مسجل
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
                  تأكيد حذف الملاحظة
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  هل أنت متأكد من حذف هذه الملاحظة؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={handleExecuteDelete}
                    disabled={deletingNote}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {deletingNote ? "جاري الحذف..." : "نعم، احذف"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelDelete}
                    disabled={deletingNote}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    إلغاء
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