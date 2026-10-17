import React from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Check, X, RotateCw } from "lucide-react";

export interface ActivityItem {
  id: string;
  type: "status" | "note" | "scheduled";
  category: "status" | "products" | "customer" | "notes" | "scheduled";
  title: string;
  details?: string;
  content: string;
  date: string;
  author: string;
  authorAvatar?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  noteId?: string;
  canModify: boolean;
  rawNote?: any;
  updatedAt?: string;
}

interface OrderActivityLogItemProps {
  activity: ActivityItem;
  isLast: boolean;
  editingNoteId: string | null;
  editingContent: string;
  setEditingContent: (val: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStartEdit: (rawNote: any) => void;
  onConfirmDelete: (noteId: string) => void;
  updatingNote: boolean;
  formatDateTime: (val: string) => string;
}

export const OrderActivityLogItem: React.FC<OrderActivityLogItemProps> = ({
  activity,
  isLast,
  editingNoteId,
  editingContent,
  setEditingContent,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onConfirmDelete,
  updatingNote,
  formatDateTime,
}) => {
  const { t } = useTranslation();
  const IconComponent = activity.icon;

  return (
    <li>
      <div className="relative pb-5">
        {!isLast && (
          <span
            className="absolute top-4 left-4 -ml-px h-full w-px bg-border/60 pointer-events-none"
            aria-hidden="true"
          />
        )}
        <div className="relative flex space-x-3 space-x-reverse">
          <div>
            <span
              className={`h-7 w-7 rounded-full flex items-center justify-center ring-2 ring-background text-white shadow-xs ${activity.color}`}
            >
              <IconComponent className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="min-w-0 flex-1 pt-0.5 flex justify-between space-x-3 space-x-reverse">
            <div className="flex-1 min-w-0">
              {activity.type === "note" && editingNoteId === activity.noteId ? (
                <div className="space-y-2">
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="shadow-xs focus:ring-1 focus:ring-ring block w-full text-xs border border-border/70 rounded-xl bg-background text-foreground p-2.5 transition-colors"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onSaveEdit}
                      disabled={updatingNote || !editingContent.trim()}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs"
                    >
                      {updatingNote ? (
                        <RotateCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span>{t("orderDetails.save") || "حفظ"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      disabled={updatingNote}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg text-muted-foreground bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>{t("orderDetails.cancel") || "إلغاء"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs">
                  {/* Content Body with nice bulleted styling if diff lines exist */}
                  <div className="text-foreground leading-relaxed break-words">
                    {activity.content.split("\n").map((line, lIdx) => {
                      const trimmedLine = line.trim();
                      if (!trimmedLine) return null;
                      if (trimmedLine.startsWith("•") || trimmedLine.startsWith("-")) {
                        return (
                          <div
                            key={lIdx}
                            className="my-1 mr-2 text-xs font-mono text-muted-foreground bg-muted/40 p-2 rounded-lg border-r-2 border-primary"
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
                              ? "font-semibold text-foreground text-xs"
                              : "text-muted-foreground text-xs mt-0.5"
                          }
                        >
                          {line}
                        </p>
                      );
                    })}
                  </div>

                  {/* Author & Timestamp Row */}
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      {activity.authorAvatar ? (
                        <img
                          src={activity.authorAvatar}
                          alt=""
                          className="h-4 w-4 rounded-full object-cover"
                        />
                      ) : (
                        <span className="h-4 w-4 rounded-full bg-muted text-muted-foreground border border-border/60 flex items-center justify-center text-[9px] font-semibold">
                          {activity.author.charAt(0)}
                        </span>
                      )}
                      <span className="font-semibold text-foreground">
                        {activity.author}
                      </span>
                    </div>

                    <span>•</span>
                    <time
                      dateTime={activity.date}
                      className="font-mono tabular-nums text-muted-foreground"
                    >
                      {formatDateTime(activity.date)}
                    </time>

                    {activity.type === "note" &&
                      activity.updatedAt &&
                      activity.updatedAt !== activity.date && (
                        <span
                          className="text-[10px] text-muted-foreground font-medium"
                          title={formatDateTime(activity.updatedAt)}
                        >
                          ({t("orderDetails.edited") || "معدل"})
                        </span>
                      )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons for Notes */}
            {activity.type === "note" &&
              activity.canModify &&
              editingNoteId !== activity.noteId && (
                <div className="flex items-center gap-1 shrink-0 self-start">
                  <button
                    type="button"
                    onClick={() => onStartEdit(activity.rawNote)}
                    className="p-1 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-muted"
                    title={t("orderDetails.editNote") || "تعديل"}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfirmDelete(activity.noteId!)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                    title={t("orderDetails.deleteNote") || "حذف"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
          </div>
        </div>
      </div>
    </li>
  );
};
