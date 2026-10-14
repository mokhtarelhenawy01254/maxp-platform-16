import React from "react";

interface AutoReplyRule {
  id: string;
  triggerText: string;
  responseText: string;
  isActive: boolean;
  matchType: "EXACT" | "CONTAINS" | "STARTS_WITH" | "REGEX";
}

interface TelegramAutoReplyDialogProps {
  open: boolean;
  editingRule: AutoReplyRule | null;
  formData: {
    triggerText: string;
    responseText: string;
    isActive: boolean;
    matchType: "EXACT" | "CONTAINS" | "STARTS_WITH" | "REGEX";
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      triggerText: string;
      responseText: string;
      isActive: boolean;
      matchType: "EXACT" | "CONTAINS" | "STARTS_WITH" | "REGEX";
    }>
  >;
  loading: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const TelegramAutoReplyDialog: React.FC<TelegramAutoReplyDialogProps> = ({
  open,
  editingRule,
  formData,
  setFormData,
  loading,
  onClose,
  onSave,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-card border border-border/80 rounded-lg max-w-lg w-full p-5 space-y-4 shadow-xl">
        <div className="border-b border-border/70 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {editingRule ? "تعديل قاعدة الرد التلقائي" : "إضافة قاعدة رد تلقائي جديدة"}
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
            <label className="block mb-1 font-medium text-foreground">نوع المطابقة</label>
            <select
              value={formData.matchType}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  matchType: e.target.value as any,
                }))
              }
              className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="EXACT">تطابق تام (Exact)</option>
              <option value="CONTAINS">يحتوي على (Contains)</option>
              <option value="STARTS_WITH">يبدأ بـ (Starts with)</option>
              <option value="REGEX">تعبير منتظم (Regex)</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium text-foreground">
              كلمة أو عبارة التفعيل (Trigger)
            </label>
            <input
              type="text"
              placeholder="مثال: الأسعار، عنوان الفرع، مواعيد العمل"
              value={formData.triggerText}
              onChange={(e) =>
                setFormData((p) => ({ ...p, triggerText: e.target.value }))
              }
              className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-foreground">نص الرد التلقائي المرسل</label>
            <textarea
              rows={4}
              placeholder="اكتب نص الرسالة التي سيتم إرسالها فورياً عند التطابق..."
              value={formData.responseText}
              onChange={(e) =>
                setFormData((p) => ({ ...p, responseText: e.target.value }))
              }
              className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData((p) => ({ ...p, isActive: e.target.checked }))
              }
              className="rounded border-border/80 text-primary focus:ring-primary"
            />
            <span className="font-medium text-foreground">تفعيل القاعدة فور الحفظ</span>
          </label>
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
            onClick={onSave}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "جاري الحفظ..." : "حفظ القاعدة"}
          </button>
        </div>
      </div>
    </div>
  );
};
export default TelegramAutoReplyDialog;
