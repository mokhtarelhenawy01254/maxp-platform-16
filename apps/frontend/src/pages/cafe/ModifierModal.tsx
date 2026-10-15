import React from 'react';
import { X, Plus, Trash2, Check, Sparkles } from 'lucide-react';

export interface ModifierOption {
  id?: string;
  name: string;
  additionalPrice: number;
  rawProductId?: string;
  isDefault: boolean;
}

interface ModifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  setName: (v: string) => void;
  selectionType: 'SINGLE' | 'MULTIPLE';
  setSelectionType: (v: 'SINGLE' | 'MULTIPLE') => void;
  isRequired: boolean;
  setIsRequired: (v: boolean) => void;
  options: ModifierOption[];
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  onOptionChange: (index: number, field: keyof ModifierOption, value: any) => void;
  onSave: (e: React.FormEvent) => void;
  saving: boolean;
}

export const ModifierModal: React.FC<ModifierModalProps> = ({
  isOpen,
  onClose,
  name,
  setName,
  selectionType,
  setSelectionType,
  isRequired,
  setIsRequired,
  options,
  onAddOption,
  onRemoveOption,
  onOptionChange,
  onSave,
  saving,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-card border border-border/70 w-full max-w-lg rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold tracking-tight text-foreground">
              إنشاء مجموعة إضافات للمشروبات
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              اسم المجموعة <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="مثال: نوع الحليب البديل، النكهة الإضافية"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-xl bg-muted/30 border border-border/70 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                نوع الاختيار
              </label>
              <select
                value={selectionType}
                onChange={(e) => setSelectionType(e.target.value as 'SINGLE' | 'MULTIPLE')}
                className="w-full px-3 py-2 text-xs rounded-xl bg-muted/30 border border-border/70 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="SINGLE">اختيار واحد فقط</option>
                <option value="MULTIPLE">اختيارات متعددة</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                إلزامية الاختيار
              </label>
              <label className="flex items-center gap-2 h-9 px-3 rounded-xl border border-border/70 bg-muted/20 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-0"
                />
                <span className="font-medium text-foreground">إجباري للطلب</span>
              </label>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-foreground">الخيارات والأسعار</span>
              <button
                type="button"
                onClick={onAddOption}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة خيار
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {(options || []).map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-muted/20 p-2 rounded-xl border border-border/60">
                  <input
                    type="text"
                    placeholder="اسم الخيار (مثال: حليب شوفان)"
                    value={opt.name}
                    onChange={(e) => onOptionChange(idx, 'name', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-background border border-border/70 text-foreground focus:outline-hidden"
                  />
                  <div className="flex items-center gap-1 w-24">
                    <input
                      type="number"
                      placeholder="السعر"
                      value={opt.additionalPrice}
                      onChange={(e) => onOptionChange(idx, 'additionalPrice', Number(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg bg-background border border-border/70 text-foreground font-mono tabular-nums text-center focus:outline-hidden"
                    />
                  </div>
                  {options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveOption(idx)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-border/70 bg-card hover:bg-muted/30 text-foreground transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98] shadow-xs disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? 'جاري الحفظ…' : 'حفظ المجموعة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
