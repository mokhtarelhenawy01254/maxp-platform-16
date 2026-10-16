import React, { useState, useEffect } from "react";
import { X, ListPlus, Tag, Clock, Users, Loader2, Check } from "lucide-react";
import { broadcastService } from "../../services/broadcastService";
import { customerService } from "../../services/customerService";

interface CreateListModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateListModal: React.FC<CreateListModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    criteriaType: "active",
    lastActivity: "24",
    tag: "",
  });
  const [availableTags, setAvailableTags] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    customerService.getDistinctTags()
      .then(setAvailableTags)
      .catch((err) => console.error("Error loading tags in modal:", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("يرجى إدخال اسم القائمة");
      return;
    }

    if (formData.criteriaType === "tag" && !formData.tag.trim()) {
      setError("يرجى اختيار أو كتابة وسم");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const criteria: any = {
        type: formData.criteriaType,
      };

      if (formData.criteriaType === "active" || formData.criteriaType === "inactive") {
        criteria.lastActivity = formData.lastActivity;
      } else if (formData.criteriaType === "tag") {
        criteria.tag = formData.tag.trim();
      }

      await broadcastService.createCustomerList({
        name: formData.name,
        description: formData.description,
        criteria,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error creating list:", err);
      setError(err.message || "فشل في إنشاء القائمة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border/70 rounded-xl shadow-xl max-w-md w-full overflow-hidden text-foreground animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <ListPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                إنشاء قائمة عملاء جديدة
              </h3>
              <p className="text-xs text-muted-foreground">
                تحديد معايير الجمهور المستهدف لحملات البث
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors active:scale-95"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* List Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="block text-xs font-medium text-foreground"
            >
              اسم القائمة <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 text-sm bg-background border border-border/70 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="مثال: عملاء VIP المتميزين"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="description"
              className="block text-xs font-medium text-foreground"
            >
              الوصف
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={2}
              className="w-full px-3 py-2 text-sm bg-background border border-border/70 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              placeholder="وصف اختياري لتوضيح شريحة القائمة..."
            />
          </div>

          {/* Criteria Type */}
          <div className="space-y-1.5">
            <label
              htmlFor="criteriaType"
              className="block text-xs font-medium text-foreground"
            >
              نوع المعايير
            </label>
            <select
              id="criteriaType"
              value={formData.criteriaType}
              onChange={(e) =>
                setFormData({ ...formData, criteriaType: e.target.value })
              }
              className="w-full px-3 py-2 text-sm bg-background border border-border/70 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="all">جميع العملاء في النظام</option>
              <option value="active">العملاء النشطون خلال فترة محددة</option>
              <option value="inactive">العملاء غير النشطين لفترة محددة</option>
              <option value="tag">وسوم وتصنيفات العملاء (Tags)</option>
            </select>
          </div>

          {/* Tag Criteria Selector */}
          {formData.criteriaType === "tag" && (
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/20 border border-border/60">
              <label
                htmlFor="tag"
                className="flex items-center gap-1.5 text-xs font-medium text-foreground"
              >
                <Tag className="w-3.5 h-3.5 text-primary" />
                <span>الوسم المحدد</span> <span className="text-rose-500">*</span>
              </label>
              {availableTags.length > 0 ? (
                <select
                  id="tag"
                  value={formData.tag}
                  onChange={(e) =>
                    setFormData({ ...formData, tag: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-background border border-border/70 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono tabular-nums"
                  required
                >
                  <option value="">-- اختر وسم من الوسوم المسجلة --</option>
                  {availableTags.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} ({t.count} عميل)
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  id="tag"
                  value={formData.tag}
                  onChange={(e) =>
                    setFormData({ ...formData, tag: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-background border border-border/70 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="اكتب اسم الوسم (مثال: vip)"
                  required
                />
              )}
              <p className="text-[11px] text-muted-foreground">
                سيتم تضمين العملاء الحاملين لهذا الوسم في القائمة تلقائياً.
              </p>
            </div>
          )}

          {/* Last Activity */}
          {(formData.criteriaType === "active" ||
            formData.criteriaType === "inactive") && (
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/20 border border-border/60">
              <label
                htmlFor="lastActivity"
                className="flex items-center gap-1.5 text-xs font-medium text-foreground"
              >
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>
                  {formData.criteriaType === "active"
                    ? "النشاط خلال (ساعات)"
                    : "عدم النشاط لأكثر من (أيام)"}
                </span>
              </label>
              <input
                type="number"
                id="lastActivity"
                value={formData.lastActivity}
                onChange={(e) =>
                  setFormData({ ...formData, lastActivity: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-background border border-border/70 rounded-lg text-foreground font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                min="1"
                placeholder={formData.criteriaType === "active" ? "24" : "30"}
              />
              <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
                {formData.criteriaType === "active"
                  ? "تصفية العملاء الذين تواصلوا خلال آخر ساعات محددة"
                  : "تصفية العملاء المنقطعين منذ أكثر من عدد الأيام المحددة"}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-all active:scale-[0.98]"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري الإنشاء...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>إنشاء القائمة</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateListModal;
