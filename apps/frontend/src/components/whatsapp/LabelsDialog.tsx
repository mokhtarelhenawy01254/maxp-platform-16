import React, { useCallback, useEffect, useState } from "react";
import { Check, Plus, RefreshCw, Tag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { apiClient as api } from "../../services/apiClient";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface LabelsDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  contactJid?: string;
  initialLabels?: string[];
  onLabelsUpdated?: () => void;
}

const COLORS = [
  "#FF5722",
  "#E91E63",
  "#9C27B0",
  "#673AB7",
  "#3F51B5",
  "#2196F3",
  "#03A9F4",
  "#00BCD4",
  "#009688",
  "#4CAF50",
  "#8BC34A",
  "#CDDC39",
  "#FFEB3B",
  "#FFC107",
  "#FF9800",
];

export const LabelsDialog: React.FC<LabelsDialogProps> = ({
  open,
  onClose,
  sessionId,
  contactJid,
  initialLabels = [],
  onLabelsUpdated,
}) => {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [assignedLabels, setAssignedLabels] = useState<string[]>(initialLabels);

  const loadLabels = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/whatsapp/labels", { params: { sessionId } });
      setLabels(response.data.labels || []);
    } catch (error) {
      console.error("Error loading labels:", error);
      tToast.error("LabelsDialog.failed_load_d47f");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (open && sessionId) {
      void loadLabels();
      setAssignedLabels(initialLabels);
    }
  }, [initialLabels, loadLabels, open, sessionId]);

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) {
      return;
    }

    try {
      await api.post("/whatsapp/labels", {
        sessionId,
        name: newLabelName,
        color: selectedColor,
      });
      tToast.success("LabelsDialog.success_create_d4d4");
      setNewLabelName("");
      await loadLabels();
    } catch {
      tToast.error("LabelsDialog.failed_create_739e");
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await api.post("/whatsapp/labels/sync", { sessionId });
      setLabels(response.data.labels || []);
      toast.success(response.data.message || "تمت المزامنة");
      onLabelsUpdated?.();
    } catch {
      toast.error("فشلت المزامنة");
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التصنيف؟")) {
      return;
    }

    try {
      await api.delete(`/whatsapp/labels/${labelId}`, { data: { sessionId } });
      tToast.success("LabelsDialog.success_delete_eff8");
      await loadLabels();
    } catch {
      tToast.error("LabelsDialog.failed_delete_2c9b");
    }
  };

  const toggleLabelAssignment = async (labelId: string) => {
    if (!contactJid) {
      return;
    }

    const isAssigned = assignedLabels.includes(labelId);
    const nextAssigned = isAssigned
      ? assignedLabels.filter((id) => id !== labelId)
      : [...assignedLabels, labelId];

    setAssignedLabels(nextAssigned);

    try {
      if (isAssigned) {
        await api.delete(`/whatsapp/labels/${labelId}/chat/${contactJid}`, {
          data: { sessionId },
        });
      } else {
        await api.post(`/whatsapp/labels/${labelId}/chat/${contactJid}`, {
          sessionId,
        });
      }
      onLabelsUpdated?.();
    } catch {
      tToast.error("LabelsDialog.failed_update_2bc4");
      setAssignedLabels(
        isAssigned
          ? [...assignedLabels, labelId]
          : assignedLabels.filter((id) => id !== labelId),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-xl gap-0 rounded-2xl border border-border/70 bg-card p-0 shadow-xl overflow-hidden"
      >
        <DialogHeader className="border-b border-border/60 px-6 py-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Tag className="size-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                {contactJid ? "إدارة تصنيفات المحادثة" : "إدارة التصنيفات"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {contactJid ? "تحديد أو إنشاء تصنيفات ملونة للمحادثة الحالية" : "تصنيفات واتساب للأعمال المتاحة"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          {/* Create new label card */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-3">
            <div className="flex gap-2">
              <Input
                value={newLabelName}
                onChange={(event) => setNewLabelName(event.target.value)}
                placeholder="اسم التصنيف الجديد..."
                className="h-9 rounded-lg bg-background border-border/70 text-sm focus-visible:ring-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleCreateLabel();
                  }
                }}
              />
              <Button
                onClick={handleCreateLabel}
                disabled={!newLabelName.trim()}
                size="sm"
                className="shrink-0 h-9 rounded-lg px-3.5 gap-1.5"
              >
                <Plus className="size-3.5" />
                <span>إضافة</span>
              </Button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] text-muted-foreground ml-1">اللون:</span>
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "size-5 rounded-full transition-transform active:scale-95 border",
                    selectedColor === color
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-transparent scale-110"
                      : "border-black/10 dark:border-white/10 hover:scale-105",
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Labels list */}
          <div className="max-h-[20rem] space-y-1.5 overflow-y-auto rounded-xl border border-border/60 bg-background/50 p-2 divide-y divide-border/30">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-center text-xs text-muted-foreground">
                <RefreshCw className="size-3.5 animate-spin" />
                <span>جاري تحميل التصنيفات...</span>
              </div>
            ) : labels.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                لا توجد تصنيفات معرفة حتى الآن
              </div>
            ) : (
              labels.map((label) => {
                const isAssigned = assignedLabels.includes(label.id);
                return (
                  <div
                    key={label.id}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors pt-2",
                      contactJid && isAssigned
                        ? "bg-primary/5 text-foreground"
                        : "hover:bg-muted/40",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => contactJid && toggleLabelAssignment(label.id)}
                      className={cn(
                        "flex flex-1 items-center gap-2.5 text-start min-w-0",
                        !contactJid && "cursor-default",
                      )}
                    >
                      <span
                        className="flex size-6 shrink-0 items-center justify-center rounded-md text-white shadow-2xs"
                        style={{ backgroundColor: label.color }}
                      >
                        <Tag className="size-3" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">
                          {label.name}
                        </p>
                      </div>
                      {contactJid && isAssigned ? (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3" />
                        </span>
                      ) : null}
                    </button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteLabel(label.id)}
                      className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="حذف التصنيف"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 bg-muted/20 px-6 py-3 flex items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="h-8 gap-1.5 rounded-lg border-border/70 text-xs font-mono tabular-nums"
          >
            <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
            <span>{syncing ? "جاري المزامنة..." : "مزامنة التصنيفات"}</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={onClose}
            className="h-8 rounded-lg px-4 text-xs"
          >
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LabelsDialog;
