import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { useDateFormat } from "../../../hooks/useDateFormat";
import { OrderDetailsType } from "../types";
import {
  OrderActivityLogFilterTabs,
  ActivityFilter,
} from "./activity-log/OrderActivityLogFilterTabs";
import { OrderActivityLogAddNote } from "./activity-log/OrderActivityLogAddNote";
import {
  OrderActivityLogItem,
  ActivityItem,
} from "./activity-log/OrderActivityLogItem";
import { OrderActivityLogDeleteModal } from "./activity-log/OrderActivityLogDeleteModal";
import { buildOrderActivities } from "./activity-log/buildOrderActivities";

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
  statusNameMap?: Record<string, string>;
}

export const OrderActivityLog: React.FC<OrderActivityLogProps> = ({
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

  const handleExecuteDelete = async () => {
    if (!deletingNoteId) return;
    const success = await onDeleteNote(deletingNoteId);
    if (success) {
      setDeletingNoteId(null);
    }
  };

  const formatScheduledDateTime = (dateStr: string, notes?: string | null): string => {
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timePart = d.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    if (notes) {
      return t("orderDetails.scheduledDeliveryWithNotes", {
        date: datePart,
        time: timePart,
        notes,
      });
    }
    return t("orderDetails.scheduledDelivery", { date: datePart, time: timePart });
  };

  const rawActivities: ActivityItem[] = useMemo(() => {
    return buildOrderActivities({
      order,
      t,
      statusNameMap,
      currentUserId,
      formatScheduledDateTime,
    });
  }, [order, t, statusNameMap, currentUserId]);

  const categoryCounts = useMemo(() => {
    return {
      all: rawActivities.length,
      status: rawActivities.filter(
        (a) => a.category === "status" || a.category === "scheduled"
      ).length,
      products: rawActivities.filter((a) => a.category === "products").length,
      customer: rawActivities.filter((a) => a.category === "customer").length,
      notes: rawActivities.filter((a) => a.category === "notes").length,
    };
  }, [rawActivities]);

  const filterTabs = useMemo(
    () => [
      { id: "all" as ActivityFilter, label: t("orderDetails.allActivities"), count: categoryCounts.all },
      { id: "status" as ActivityFilter, label: t("orderDetails.statusChanges"), count: categoryCounts.status },
      { id: "products" as ActivityFilter, label: t("orderDetails.productChanges"), count: categoryCounts.products },
      { id: "customer" as ActivityFilter, label: t("orderDetails.customerChanges"), count: categoryCounts.customer },
      { id: "notes" as ActivityFilter, label: t("orderDetails.notes"), count: categoryCounts.notes },
    ],
    [t, categoryCounts]
  );

  const activities = useMemo(() => {
    if (filter === "status") {
      return rawActivities.filter(
        (a) => a.category === "status" || a.category === "scheduled"
      );
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
    <div className="bg-card text-foreground border border-border/70 shadow-xs rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span>{t("orderDetails.activityLog")}</span>
        </h3>
        <span className="text-xs font-mono tabular-nums font-semibold bg-muted border border-border/70 text-muted-foreground px-2 py-0.5 rounded-full">
          {rawActivities.length}
        </span>
      </div>

      {/* Add Note Section */}
      {canAddNote && (
        <OrderActivityLogAddNote
          note={note}
          setNote={setNote}
          onAddNote={handleAddNote}
          addingNote={addingNote}
        />
      )}

      {/* Filter Tabs */}
      <OrderActivityLogFilterTabs
        tabs={filterTabs}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

      {/* Activities Timeline */}
      <div className="flow-root">
        <ul className="-mb-6">
          {activities.map((activity, activityIdx) => (
            <OrderActivityLogItem
              key={activity.id}
              activity={activity}
              isLast={activityIdx === activities.length - 1}
              editingNoteId={editingNoteId}
              editingContent={editingContent}
              setEditingContent={setEditingContent}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onStartEdit={handleStartEdit}
              onConfirmDelete={setDeletingNoteId}
              updatingNote={updatingNote}
              formatDateTime={formatDateTime}
            />
          ))}

          {activities.length === 0 && (
            <li className="text-center py-8">
              <p className="text-xs text-muted-foreground">
                {filter === "all"
                  ? t("orderDetails.noActivity")
                  : t("orderDetails.noActivitiesInCategory")}
              </p>
            </li>
          )}
        </ul>
      </div>

      {/* Delete Confirmation Modal */}
      <OrderActivityLogDeleteModal
        isOpen={Boolean(deletingNoteId)}
        onCancel={() => setDeletingNoteId(null)}
        onConfirm={handleExecuteDelete}
        deleting={deletingNote}
      />
    </div>
  );
};

export default OrderActivityLog;