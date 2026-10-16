import { useState, type FormEvent } from "react";
import { X, Layers, Loader2 } from "lucide-react";

interface AcademyAddModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (title: string, desc?: string) => Promise<void>;
}

export function AcademyAddModuleModal({
  isOpen,
  onClose,
  onAdd,
}: AcademyAddModuleModalProps) {
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!moduleTitle.trim()) return;
    try {
      setSaving(true);
      await onAdd(moduleTitle.trim(), moduleDesc.trim() || undefined);
      setModuleTitle("");
      setModuleDesc("");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
      dir="rtl"
    >
      <div className="bg-card border border-border/70 rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-xl text-foreground text-right">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                إضافة وحدة تدريبية جديدة
              </h2>
              <p className="text-[11px] text-muted-foreground">أضف قسماً رئيساً يضم مجموعة من الدروس</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              عنوان الوحدة <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
              placeholder="مثال: الوحدة 1: التأسيس وسيكولوجية العرض"
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              وصف مختصر للوحدة <span className="text-muted-foreground font-normal">(اختياري)</span>
            </label>
            <textarea
              rows={2}
              value={moduleDesc}
              onChange={(e) => setModuleDesc(e.target.value)}
              placeholder="الأهداف والمهارات المكتسبة في هذه الوحدة..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving || !moduleTitle.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs disabled:opacity-50 transition-all active:scale-[0.98] flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{saving ? "جاري الإضافة..." : "إضافة الوحدة"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
