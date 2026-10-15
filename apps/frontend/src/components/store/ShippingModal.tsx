import React from "react";
import {
  X,
  Plus,
  XCircle,
  Truck,
  Sparkles,
  Check,
} from "lucide-react";
import { ShippingZone } from "../../services/storeSettingsService";

interface ShippingModalProps {
  zone: Partial<ShippingZone>;
  isEditing: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (zone: Partial<ShippingZone>) => void;
  governorateInput: string;
  onGovernorateInputChange: (value: string) => void;
  onAddGovernorate: () => void;
  onRemoveGovernorate: (index: number) => void;
}

export const ShippingModal: React.FC<ShippingModalProps> = ({
  zone,
  isEditing,
  onClose,
  onSave,
  onChange,
  governorateInput,
  onGovernorateInputChange,
  onAddGovernorate,
  onRemoveGovernorate,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAddGovernorate();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="bg-card border border-border/70 text-card-foreground shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                {isEditing ? "تعديل منطقة الشحن" : "إضافة منطقة شحن جديدة"}
              </h2>
              <p className="text-xs text-muted-foreground">
                تحديد المحافظات وسعر التوصيل والمدة المتوقعة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Governorates Section */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-foreground">
              المحافظات المشمولة <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={governorateInput}
                onChange={(e) => onGovernorateInputChange(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1 px-3.5 py-2 text-xs bg-background border border-border/70 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all"
                placeholder="أدخل اسم المحافظة (مثال: القاهرة)"
              />
              <button
                type="button"
                onClick={onAddGovernorate}
                className="px-3.5 py-2 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl flex items-center gap-1 shadow-xs transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة</span>
              </button>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-foreground leading-relaxed">
                <span className="font-semibold text-primary">تنويعات تلقائية:</span> يتم
                إنشاء كافة التنويعات الإملائية للمحافظة آلياً (مع/بدون "ال"، هـ/ة) لضمان دقة المطابقة.
              </p>
            </div>

            {/* Display added governorates */}
            {zone.governorates && zone.governorates.length > 0 && (
              <div className="border border-border/60 rounded-xl p-3.5 bg-muted/15 space-y-2">
                <h4 className="text-[11px] font-medium text-muted-foreground">
                  المحافظات والتنويعات المضافة:
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {zone.governorates.map((gov, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-card border border-border/70 text-foreground text-xs rounded-lg shadow-2xs"
                    >
                      <span>{gov}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveGovernorate(idx)}
                        className="text-muted-foreground hover:text-rose-500 transition-colors p-0.5"
                        aria-label={`إزالة ${gov}`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Price and Delivery Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground">
                سعر الشحن (جنيه) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={zone.price || ""}
                onChange={(e) =>
                  onChange({
                    ...zone,
                    price: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3.5 py-2 text-xs bg-background border border-border/70 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all font-mono tabular-nums text-right"
                placeholder="50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground">
                مدة التوصيل التقديرية <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={zone.deliveryTime || ""}
                onChange={(e) =>
                  onChange({ ...zone, deliveryTime: e.target.value })
                }
                className="w-full px-3.5 py-2 text-xs bg-background border border-border/70 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all"
                placeholder="1-2 أيام"
              />
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="zoneActive"
              checked={zone.isActive !== false}
              onChange={(e) =>
                onChange({ ...zone, isActive: e.target.checked })
              }
              className="w-4 h-4 rounded border-border/70 text-primary focus:ring-primary/40 cursor-pointer"
            />
            <label
              htmlFor="zoneActive"
              className="text-xs font-medium text-foreground cursor-pointer select-none"
            >
              المنطقة نشطة ومتاحة للعملاء
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-muted/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-xl transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!zone.governorates?.length || !zone.price}
            className="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isEditing ? "حفظ التغييرات" : "إضافة المنطقة"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShippingModal;
