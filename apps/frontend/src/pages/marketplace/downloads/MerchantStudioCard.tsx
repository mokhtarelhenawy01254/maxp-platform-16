import React from "react";
import { Link } from "react-router-dom";
import {
  Printer,
  ArrowRight,
  Zap,
  HardDrive,
  Cpu,
} from "lucide-react";

export const MerchantStudioCard: React.FC = () => {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-4 sm:p-6 shadow-sm transition-all hover:border-border">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-11 items-center justify-center rounded-lg border border-border/60 bg-muted/50 text-foreground shrink-0">
              <Printer className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                  استوديو الكاشير ونقاط البيع (POS)
                </h3>
                <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary font-mono">
                  سحابي فوري
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono">
                Web Native Cloud POS &amp; Thermal Printing Studio
              </p>
            </div>
          </div>

          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-foreground">
            بدون تثبيت
          </span>
        </div>

        {/* Telemetry Strip - Single Surface */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2.5 px-3 rounded-lg bg-muted/40 border border-border/40 mb-4 text-center">
          <div>
            <span className="text-[10px] text-muted-foreground block">نوع التشغيل</span>
            <span className="text-xs font-semibold text-foreground font-mono">سحابي مباشر</span>
          </div>
          <div className="border-r border-border/30 pr-2">
            <span className="text-[10px] text-muted-foreground block">بروتوكول الطباعة</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">ESC/POS فوري</span>
          </div>
          <div className="border-r border-border/30 pr-2">
            <span className="text-[10px] text-muted-foreground block">الاتصال بالطابعات</span>
            <span className="text-xs font-semibold text-foreground font-mono">USB / LAN</span>
          </div>
          <div className="border-r border-border/30 pr-2">
            <span className="text-[10px] text-muted-foreground block">صلاحيات الجهاز</span>
            <span className="text-xs font-semibold text-foreground font-mono">صفر إعدادات</span>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-2 mb-5 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <Zap className="size-3.5 text-primary shrink-0 mt-0.5" />
            <span className="text-pretty">طباعة صامتة فورية لبوالص الشحن وفواتير الكاشير بتوافق تام مع طابعات 80mm و 58mm.</span>
          </div>
          <div className="flex items-start gap-2">
            <HardDrive className="size-3.5 text-primary shrink-0 mt-0.5" />
            <span className="text-pretty">ربط مباشر مع ماسحات الباركود وقارئات QR لإنهاء المعاملات في ثوانٍ معدودة.</span>
          </div>
          <div className="flex items-start gap-2">
            <Cpu className="size-3.5 text-primary shrink-0 mt-0.5" />
            <span className="text-pretty">محطة كاشير متصلة بالمخزون المركزي لمنع ازدواج البيع وتحديث الأرصدة لحظياً.</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-border/40">
        <Link
          to="/pos"
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          <span>فتح محطة الكاشير ونقاط البيع الآن</span>
          <ArrowRight className="size-4 rtl:rotate-180" />
        </Link>
      </div>
    </div>
  );
};

export default MerchantStudioCard;

