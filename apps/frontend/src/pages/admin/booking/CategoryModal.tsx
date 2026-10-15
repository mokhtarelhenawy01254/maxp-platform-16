import React, { useState } from "react";
import {
  X,
  Trash2,
  FolderPlus,
  Stethoscope,
  Activity,
  Heart,
  Brain,
  Bone,
  Eye,
  Baby,
  Dna,
  Syringe,
  Microscope,
  Sparkles,
  Building2,
  ShieldPlus,
  Thermometer
} from "lucide-react";
import { ServiceCategory } from "./shared";

interface Props {
  category?: Partial<ServiceCategory> | null;
  onClose: () => void;
  onSave: (d: Partial<ServiceCategory>) => Promise<void>;
  onDelete: (id: string) => void;
}

const CATEGORY_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b",
  "#10b981", "#06b6d4", "#6366f1", "#84cc16", "#14b8a6"
];

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  stethoscope: Stethoscope,
  activity: Activity,
  heart: Heart,
  brain: Brain,
  bone: Bone,
  eye: Eye,
  baby: Baby,
  dna: Dna,
  syringe: Syringe,
  microscope: Microscope,
  sparkles: Sparkles,
  building: Building2,
  shield: ShieldPlus,
  thermometer: Thermometer,
};

const ICON_KEYS = Object.keys(ICON_MAP);

export default function CategoryModal({ category, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState(category?.name || "");
  const [color, setColor] = useState(category?.color || CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState(category?.icon || ICON_KEYS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        id: category?.id,
        name: name.trim(),
        color,
        icon: icon || undefined,
        sortOrder: category?.sortOrder || 0,
        isActive: category?.isActive ?? true
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-background border border-border/70 rounded-xl px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden text-card-foreground animate-in fade-in-0 zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground tracking-tight">{category?.id ? "تعديل القسم" : "إضافة قسم جديد"}</h3>
              <p className="text-xs text-muted-foreground">تنظيم وتصنيف الخدمات والإجراءات الطبية</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-sm">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">اسم القسم *</label>
            <input className={inputCls} placeholder="مثال: جراحة العظام، الأسنان، الليزر..." value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-2">لون تمييز القسم</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "border-foreground ring-2 ring-primary/40 scale-110" : "border-transparent hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-2">أيقونة القسم التعبيرية</label>
            <div className="grid grid-cols-7 gap-1.5 p-2 rounded-xl bg-muted/20 border border-border/60">
              {ICON_KEYS.map(key => {
                const IconComponent = ICON_MAP[key];
                const isSelected = icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(key)}
                    className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                    title={key}
                  >
                    <IconComponent className="w-4 h-4 stroke-[1.75]" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border/60 bg-muted/20 shrink-0">
          {category?.id ? (
            <button
              onClick={() => { if (category.id) onDelete(category.id); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> حذف القسم
            </button>
          ) : <span />}

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-foreground border border-border/70 rounded-xl hover:bg-muted/50 transition-colors">
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="px-5 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 shadow-xs transition-colors disabled:opacity-50"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ القسم"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
