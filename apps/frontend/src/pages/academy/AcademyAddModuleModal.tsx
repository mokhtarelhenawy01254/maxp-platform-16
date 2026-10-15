import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

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
      <div className="bg-card border border-border/80 rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-border/70">
          <h2 className="text-sm sm:text-base font-bold text-foreground">
            إضافة وحدة تدريبية جديدة
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted text-sm transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              عنوان الوحدة *
            </label>
            <input
              type="text"
              required
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
              placeholder="مثال: الوحدة 1: التأسيس وسيكولوجية العرض"
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              وصف مختصر للوحدة
            </label>
            <textarea
              rows={2}
              value={moduleDesc}
              onChange={(e) => setModuleDesc(e.target.value)}
              placeholder="الأهداف التعليمية لهذه الوحدة..."
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs disabled:opacity-50 transition"
            >
              {saving ? "جاري الإضافة..." : "إضافة الوحدة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
