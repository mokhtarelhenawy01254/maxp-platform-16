import React from "react";
import { Clock } from "lucide-react";

interface UserbotConfig {
  id: string;
  label: string;
  clientPhone?: string;
}

interface DialogEntry {
  id: string;
  name: string;
}

interface TelegramSchedulerDialogProps {
  open: boolean;
  formData: {
    userbotConfigId: string;
    chatIds: string[];
    message: string;
    scheduledTime: Date;
    recurring: boolean;
    recurringPattern: "DAILY" | "WEEKLY" | "MONTHLY";
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      userbotConfigId: string;
      chatIds: string[];
      message: string;
      scheduledTime: Date;
      recurring: boolean;
      recurringPattern: "DAILY" | "WEEKLY" | "MONTHLY";
    }>
  >;
  userbots: UserbotConfig[];
  dialogs: DialogEntry[];
  loading: boolean;
  onClose: () => void;
  onSchedule: () => void;
  onFetchDialogs: (id: string) => void;
}

export const TelegramSchedulerDialog: React.FC<TelegramSchedulerDialogProps> = ({
  open,
  formData,
  setFormData,
  userbots,
  dialogs,
  loading,
  onClose,
  onSchedule,
  onFetchDialogs,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-card border border-border/80 rounded-lg max-w-lg w-full p-5 space-y-4 shadow-xl">
        <div className="border-b border-border/70 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            جدولة رسالة Telegram جديدة
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            إلغاء
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block mb-1 font-medium text-foreground">حساب الـ Userbot المشغّل</label>
            <select
              value={formData.userbotConfigId}
              onChange={(e) => {
                const id = e.target.value;
                setFormData((p) => ({ ...p, userbotConfigId: id, chatIds: [] }));
                onFetchDialogs(id);
              }}
              className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            >
              {userbots.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label} ({b.clientPhone || "غير متصل"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium text-foreground">المحادثة المستهدفة</label>
            <select
              value={formData.chatIds[0] || ""}
              onChange={(e) =>
                setFormData((p) => ({ ...p, chatIds: [e.target.value] }))
              }
              className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            >
              <option value="">اختر المحادثة أو المجموعة...</option>
              {dialogs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium text-foreground">نص الرسالة</label>
            <textarea
              rows={4}
              placeholder="اكتب نص الرسالة المجدولة..."
              value={formData.message}
              onChange={(e) =>
                setFormData((p) => ({ ...p, message: e.target.value }))
              }
              className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-foreground">تاريخ ووقت الإرسال</label>
            <input
              type="datetime-local"
              value={
                formData.scheduledTime instanceof Date
                  ? formData.scheduledTime.toISOString().slice(0, 16)
                  : ""
              }
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  scheduledTime: new Date(e.target.value),
                }))
              }
              className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.recurring}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, recurring: e.target.checked }))
                }
                className="rounded border-border/80 text-primary focus:ring-primary"
              />
              <span className="font-medium text-foreground">تكرار الإرسال بشكل دوري</span>
            </label>
          </div>

          {formData.recurring && (
            <div>
              <label className="block mb-1 font-medium text-foreground">دورية التكرار</label>
              <select
                value={formData.recurringPattern}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    recurringPattern: e.target.value as any,
                  }))
                }
                className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="DAILY">يومي (Daily)</option>
                <option value="WEEKLY">أسبوعي (Weekly)</option>
                <option value="MONTHLY">شهري (Monthly)</option>
              </select>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-border/70 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-muted/40 text-foreground hover:bg-muted/70 border border-border/70 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onSchedule}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Clock className="w-3.5 h-3.5" />
            {loading ? "جاري الجدولة..." : "تأكيد الجدولة"}
          </button>
        </div>
      </div>
    </div>
  );
};
export default TelegramSchedulerDialog;
