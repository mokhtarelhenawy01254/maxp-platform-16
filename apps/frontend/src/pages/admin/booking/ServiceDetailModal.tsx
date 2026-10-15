import { X, Building2, Layers, Clock, Coins, Stethoscope, Calendar, Tag } from "lucide-react";
import { BookingService, MODAL_CONTENT_CLS } from "./shared";

interface Props {
  service: BookingService;
  onClose: () => void;
}

export default function ServiceDetailModal({ service, onClose }: Props) {
  const bs = service.branchServices || [];

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`${MODAL_CONTENT_CLS} max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border/80 rounded-2xl shadow-2xl text-foreground font-sans`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 mb-4 border-b border-border/60">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mt-0.5">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  {service.name}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                    service.isActive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                  }`}
                >
                  {service.isActive ? "نشط" : "غير نشط"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {service.description || "لا يوجد وصف مدخل لهذه الخدمة"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-muted/30 border border-border/60 rounded-xl p-3">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                <Tag className="w-3 h-3 text-primary" />
                <span>القسم السريري</span>
              </p>
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {service.category?.name || "بدون قسم"}
              </p>
            </div>
            <div className="bg-muted/30 border border-border/60 rounded-xl p-3">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-primary" />
                <span>المدة التقريبية</span>
              </p>
              <p className="text-xs sm:text-sm font-semibold text-foreground font-mono tabular-nums">
                {service.durationMinutes ? `${service.durationMinutes} دقيقة` : "غير محدد"}
              </p>
            </div>
            <div className="bg-muted/30 border border-border/60 rounded-xl p-3">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                <Coins className="w-3 h-3 text-primary" />
                <span>السعر الأساسي</span>
              </p>
              <p className="text-xs sm:text-sm font-bold text-foreground font-mono tabular-nums">
                {service.basePrice != null ? `${Number(service.basePrice).toLocaleString()} ج.م` : "—"}
              </p>
            </div>
          </div>

          {/* Doctors List */}
          {service.doctorServices && service.doctorServices.length > 0 && (
            <div className="bg-muted/20 border border-border/60 rounded-xl p-3.5 space-y-2">
              <h4 className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-primary" />
                <span>الأطباء المصرح لهم بتقديم الخدمة</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {service.doctorServices.map((ds) => (
                  <span
                    key={ds.id}
                    className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg font-medium"
                  >
                    {ds.doctor?.title} {ds.doctor?.name}
                    {ds.fee ? (
                      <span className="font-mono tabular-nums mr-1">
                        {" "}
                        — {ds.fee} ج.م
                      </span>
                    ) : null}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Branches and Packages */}
          <div className="bg-muted/20 border border-border/60 rounded-xl p-3.5 space-y-3">
            <h4 className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>الفروع المتاحة والباقات</span>
            </h4>
            {bs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3 bg-card border border-border/60 rounded-lg">
                لم يتم ربط الخدمة بأي فرع حتى الآن
              </p>
            ) : (
              <div className="space-y-2.5">
                {bs.map((b) => (
                  <div
                    key={b.id || b.branchId}
                    className="border border-border/70 bg-card rounded-xl p-3 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs sm:text-sm text-foreground">
                        {b.branch?.name || b.branchId}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full border ${
                          b.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {b.isActive ? "متاحة" : "غير متاحة"}
                      </span>
                    </div>

                    {b.hasPackages && (b.packages || []).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/50">
                        {(b.packages || []).map((pkg, i) => (
                          <span
                            key={i}
                            className="text-xs bg-muted text-foreground border border-border/70 px-2.5 py-1 rounded-lg font-mono tabular-nums"
                          >
                            {pkg.count} جلسات — {pkg.price} ج.م
                            {pkg.originalPrice && (
                              <span className="line-through mr-1 text-muted-foreground text-[11px]">
                                {pkg.originalPrice} ج.م
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        لا توجد باقات مخفضة لهذا الفرع (سعر الكشف الافتراضي فقط)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metadata Footer */}
          <div className="text-[11px] text-muted-foreground flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
            <span className="flex items-center gap-1 font-mono tabular-nums">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span>
                تاريخ الإضافة:{" "}
                {new Date(service.createdAt).toLocaleDateString("ar-EG")}
              </span>
            </span>
            <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded">
              معرف: {service.id}
            </span>
          </div>
        </div>

        {/* Modal Close Action */}
        <div className="flex justify-end pt-4 mt-4 border-t border-border/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium border border-border/70 rounded-xl bg-card text-foreground hover:bg-muted/60 transition-colors shadow-xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
