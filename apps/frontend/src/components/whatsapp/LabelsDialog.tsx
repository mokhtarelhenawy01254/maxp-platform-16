import React, { useCallback, useEffect, useState } from "react";
import { Check, Plus, Tag, Trash2 } from "lucide-react";
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

const LabelsDialog: React.FC<LabelsDialogProps> = ({
  open,
  onClose,
  sessionId,
  contactJid,
  initialLabels = [],
  onLabelsUpdated,
}) => {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);
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
      tToast.error("components_LabelsDialog.failed_load_d47f");
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
      tToast.success("components_LabelsDialog.success_create_d4d4");
      setNewLabelName("");
      await loadLabels();
    } catch {
      tToast.error("components_LabelsDialog.failed_create_739e");
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التصنيف؟")) {
      return;
    }

    try {
      await api.delete(`/whatsapp/labels/${labelId}`, { data: { sessionId } });
      tToast.success("components_LabelsDialog.success_delete_eff8");
      await loadLabels();
    } catch {
      tToast.error("components_LabelsDialog.failed_delete_2c9b");
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
      tToast.error("components_LabelsDialog.failed_update_2bc4");
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
        className="max-w-2xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <DialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
          <DialogTitle className="text-lg text-[color:var(--color-foreground)]">
            {contactJid ? "إدارة تصنيفات المحادثة" : "إدارة التصنيفات"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-[24px] border border-[color:var(--shell-control-border)] bg-white/70 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <div className="space-y-3">
                <Input
                  value={newLabelName}
                  onChange={(event) => setNewLabelName(event.target.value)}
                  placeholder="اسم التصنيف الجديد"
                  className="h-11 rounded-[18px] bg-white/80"
                />
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "size-7 rounded-full border-2 transition-transform hover:scale-105",
                        selectedColor === color
                          ? "border-[color:var(--color-foreground)]"
                          : "border-transparent",
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <Button
                onClick={handleCreateLabel}
                disabled={!newLabelName.trim()}
                className="self-start"
              >
                <Plus className="size-4" />
                إضافة
              </Button>
            </div>
          </div>

          <div className="max-h-[24rem] space-y-2 overflow-y-auto rounded-[24px] border border-[color:var(--shell-control-border)] bg-white/65 p-3">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-[color:var(--color-muted-foreground)]">
                جاري تحميل التصنيفات...
              </div>
            ) : labels.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[color:var(--color-muted-foreground)]">
                لا توجد تصنيفات
              </div>
            ) : (
              labels.map((label) => {
                const isAssigned = assignedLabels.includes(label.id);
                return (
                  <div
                    key={label.id}
                    className={cn(
                      "flex items-center gap-3 rounded-[20px] border px-3 py-3",
                      contactJid && isAssigned
                        ? "border-[color:var(--color-primary)] bg-[color:color-mix(in_srgb,var(--color-primary)_10%,white)]"
                        : "border-[color:var(--shell-control-border)] bg-white/75",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => contactJid && toggleLabelAssignment(label.id)}
                      className={cn(
                        "flex flex-1 items-center gap-3 text-start",
                        !contactJid && "cursor-default",
                      )}
                    >
                      <span
                        className="flex size-10 items-center justify-center rounded-2xl text-white"
                        style={{ backgroundColor: label.color }}
                      >
                        <Tag className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                          {label.name}
                        </p>
                        <p className="text-xs text-[color:var(--color-muted-foreground)]">
                          {label.color}
                        </p>
                      </div>
                      {contactJid && isAssigned ? (
                        <Check className="size-4 text-[color:var(--color-primary)]" />
                      ) : null}
                    </button>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeleteLabel(label.id)}
                      className="rounded-full text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-[color:var(--shell-control-border)] bg-white/55">
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LabelsDialog;
