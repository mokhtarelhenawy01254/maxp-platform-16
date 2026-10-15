import { X } from "lucide-react";
import { PriceList } from "./shared";

export interface PriceListRow extends PriceList {
  itemCount?: number;
  isBase?: boolean;
}

export interface PriceListItemRow {
  id: string;
  priceListId: string;
  serviceId: string;
  price: number;
  isActive: boolean;
  effectivePrice?: number;
  service?: { id: string; name: string; basePrice?: number; durationMinutes?: number };
}

export interface ListForm {
  id?: string;
  name: string;
  description: string;
  baseListId: string;
  isActive: boolean;
}

export const emptyForm = (): ListForm => ({ name: "", description: "", baseListId: "", isActive: true });

interface PriceListModalProps {
  listModal: ListForm;
  lists: PriceList[];
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (form: ListForm) => void;
}

export default function PriceListModal({
  listModal,
  lists,
  saving,
  onClose,
  onSave,
  onChange,
}: PriceListModalProps) {
  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border/70 rounded-2xl shadow-xl w-full max-w-md p-5 text-foreground space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <h3 className="text-sm font-bold text-foreground">
            {listModal.id ? "تعديل قائمة أسعار" : "قائمة أسعار جديدة"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">الاسم</label>
            <input
              className="w-full border border-border/70 rounded-xl px-3 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              value={listModal.name}
              onChange={e => onChange({ ...listModal, name: e.target.value })}
              placeholder="اسم القائمة (مثال: قائمة شركات التأمين)"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">الوصف</label>
            <textarea
              className="w-full border border-border/70 rounded-xl px-3 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              rows={2}
              value={listModal.description}
              onChange={e => onChange({ ...listModal, description: e.target.value })}
              placeholder="وصف مختصر للقائمة..."
            />
          </div>
          {!listModal.id && (
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                القائمة الأساسية (تُورث منها الأسعار غير المخصصة)
              </label>
              <select
                className="w-full border border-border/70 rounded-xl px-3 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                value={listModal.baseListId}
                onChange={e => onChange({ ...listModal, baseListId: e.target.value })}
              >
                <option value="">تلقائي (أول قائمة تصبح أساسية)</option>
                {lists.filter(l => l.isBase && l.isActive).map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          )}
          {listModal.id && (
            <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={listModal.isActive}
                onChange={e => onChange({ ...listModal, isActive: e.target.checked })}
                className="rounded border-border/70 text-primary focus:ring-primary/40"
              />
              <span>مفعّلة ونشطة</span>
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border/70 pt-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs border border-border/70 text-foreground rounded-xl hover:bg-muted transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={onSave}
            disabled={saving || !listModal.name.trim()}
            className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}
