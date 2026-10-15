import React from "react";
import {
  Truck,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Banknote,
  Sparkles,
} from "lucide-react";
import { ShippingZone } from "../../services/storeSettingsService";

interface ShippingSectionProps {
  zones: ShippingZone[];
  onAdd: () => void;
  onEdit: (zone: ShippingZone) => void;
  onDelete: (id: string) => void;
}

export const ShippingSection: React.FC<ShippingSectionProps> = ({
  zones = [],
  onAdd,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            مناطق الشحن وتكاليف التوصيل
          </h2>
          <p className="text-xs text-muted-foreground">
            إدارة تسعير الشحن والمدد التقديرية حسب المحافظات
          </p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>إضافة منطقة جديدة</span>
        </button>
      </div>

      {/* AI Automation Note */}
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <p className="leading-relaxed">
          <span className="font-semibold text-primary">ملاحظة ذكية:</span> يتم
          استخدام هذه المناطق وتكاليفها آلياً بواسطة محرك الطلبات لحساب تكلفة الشحن
          المناسبة لمحافظة العميل.
        </p>
      </div>

      {/* Empty State or List */}
      {zones.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border/80 bg-muted/20">
          <Truck className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2.5" />
          <p className="text-xs font-medium text-foreground">
            لا توجد مناطق شحن مضافة حتى الآن
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            أضف محافظاتك وتكاليف التوصيل لتفعيل الشحن التلقائي
          </p>
          <button
            onClick={onAdd}
            className="mt-3 text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>إضافة منطقة جديدة</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {zones.map((zone) => {
            const uniqueGovs = Array.from(new Set(zone.governorates || []));
            const mainGov = uniqueGovs[0] || "منطقة غير محددة";
            const variations = uniqueGovs.slice(1);

            return (
              <div
                key={zone.id}
                className="bg-card border border-border/70 rounded-xl p-4 shadow-sm hover:border-border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-semibold text-foreground truncate">
                      {mainGov}
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-medium rounded-md border ${
                        zone.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {zone.isActive ? "نشط" : "غير نشط"}
                    </span>
                  </div>

                  {variations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {variations.map((gov, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] rounded border border-border/50"
                        >
                          {gov}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/50">
                  <div className="text-right sm:text-left space-y-0.5">
                    <div className="flex items-center text-xs font-bold text-foreground font-mono tabular-nums">
                      <Banknote className="w-3.5 h-3.5 ml-1 text-primary" />
                      <span>{zone.price} ج.م</span>
                    </div>
                    <div className="flex items-center text-[11px] text-muted-foreground font-mono tabular-nums">
                      <Clock className="w-3 h-3 ml-1 text-muted-foreground/70" />
                      <span>{zone.deliveryTime}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onEdit(zone)}
                      className="px-2.5 py-1.5 text-xs font-medium border border-border/70 rounded-lg text-foreground hover:bg-muted/50 flex items-center gap-1 transition-colors"
                    >
                      <Pencil className="w-3 h-3 text-muted-foreground" />
                      <span>تعديل</span>
                    </button>
                    <button
                      onClick={() => onDelete(zone.id)}
                      className="p-1.5 text-xs font-medium border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center justify-center transition-colors"
                      title="حذف المنطقة"
                      aria-label="حذف المنطقة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ShippingSection;
