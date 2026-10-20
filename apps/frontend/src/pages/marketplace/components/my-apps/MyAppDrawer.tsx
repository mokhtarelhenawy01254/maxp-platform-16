import React from "react";
import { useNavigate } from "react-router-dom";
import { Package, ArrowUpRight, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { InstalledApp } from "@/types/marketplace";
import { getAppDestination } from "../../types/myAppsTypes";

interface MyAppDrawerProps {
  selectedApp: InstalledApp | null;
  onClose: () => void;
  onConfirmUninstall: (app: InstalledApp) => void;
}

export const MyAppDrawer: React.FC<MyAppDrawerProps> = ({
  selectedApp,
  onClose,
  onConfirmUninstall,
}) => {
  const navigate = useNavigate();

  return (
    <Sheet open={!!selectedApp} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="left" className="w-full sm:max-w-lg p-0 overflow-y-auto" dir="rtl">
        {selectedApp && (
          <div className="p-6 space-y-6">
            <SheetHeader className="text-right space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                  {selectedApp.app.icon && selectedApp.app.icon.startsWith("http") ? (
                    <img src={selectedApp.app.icon} alt="" className="size-7 object-contain rounded" />
                  ) : (
                    <Package className="size-6" />
                  )}
                </div>
                <div>
                  <SheetTitle className="text-lg font-black text-foreground">
                    {selectedApp.app.name}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">
                    {selectedApp.app.category} • مسار التشغيل: {getAppDestination(selectedApp.app)}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            {/* Overview & Pricing */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-right">
                <span className="text-[11px] font-semibold text-muted-foreground block">نموذج التسعير</span>
                <span className="text-sm font-bold text-foreground">
                  {selectedApp.activePricingModel === "FREE"
                    ? "مجاني"
                    : selectedApp.activePricingModel === "PAY_PER_USE"
                    ? "حسب الاستهلاك"
                    : "اشتراك شهري"}
                </span>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-right">
                <span className="text-[11px] font-semibold text-muted-foreground block">تاريخ التفعيل</span>
                <span className="text-sm font-bold text-foreground">
                  {new Date(selectedApp.createdAt).toLocaleDateString("ar-EG")}
                </span>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-right">
                <span className="text-[11px] font-semibold text-muted-foreground block">استهلاك هذا الشهر</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums font-mono">
                  {Number(selectedApp.monthlyUsage?.totalCost || 0).toFixed(2)} ج.م
                </span>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-right">
                <span className="text-[11px] font-semibold text-muted-foreground block">حالة التطبيق</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedApp.status === "ACTIVE"
                    ? "نشط"
                    : selectedApp.status === "TRIAL"
                    ? "فترة تجريبية"
                    : "متوقف"}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5 text-right">
              <h4 className="text-xs font-bold text-foreground">عن الأداة</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {selectedApp.app.description}
              </p>
            </div>

            {/* Usage Logs */}
            <div className="space-y-2 text-right">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground">آخر سجلات الاستهلاك</h4>
                <span className="text-[10px] text-muted-foreground font-medium">آخر 10 عمليات</span>
              </div>

              {selectedApp.usageLogs && selectedApp.usageLogs.length > 0 ? (
                <div className="rounded-xl border border-border/40 overflow-hidden divide-y divide-border/20 text-xs">
                  {selectedApp.usageLogs.map((log) => (
                    <div key={log.id} className="p-2.5 flex items-center justify-between hover:bg-muted/20">
                      <div>
                        <span className="font-semibold text-foreground block">{log.feature || "عملية نظام"}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("ar-EG")}
                        </span>
                      </div>
                      <div className="text-left font-bold text-blue-600 dark:text-blue-400 tabular-nums font-mono">
                        {Number(log.totalCost).toFixed(2)} ج.م
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                  لا توجد عمليات استهلاك مسجلة مؤخراً لهذه الأداة.
                </div>
              )}
            </div>

            {/* Drawer Action Buttons */}
            <div className="pt-4 border-t border-border/40 space-y-2">
              <Button
                className="w-full rounded-xl font-bold gap-2"
                onClick={() => {
                  const dest = getAppDestination(selectedApp.app);
                  onClose();
                  navigate(dest);
                }}
              >
                <ArrowUpRight size={16} />
                <span>فتح وتشغيل الأداة</span>
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl text-xs font-semibold gap-1.5"
                  onClick={() => {
                    const slug = selectedApp.app.slug;
                    onClose();
                    navigate(`/my-apps/${slug}/settings`);
                  }}
                >
                  <Settings2 size={14} />
                  <span>الإعدادات</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl text-xs font-semibold gap-1.5 text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    const app = selectedApp;
                    onClose();
                    onConfirmUninstall(app);
                  }}
                >
                  <X size={14} />
                  <span>إلغاء التفعيل</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
