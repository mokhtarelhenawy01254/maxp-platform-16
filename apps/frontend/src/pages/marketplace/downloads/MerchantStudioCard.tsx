import React from "react";
import { Link } from "react-router-dom";
import {
  Printer,
  ArrowRight,
  Zap,
  HardDrive,
  Cpu,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const MerchantStudioCard: React.FC = () => {
  return (
    <div className="relative flex flex-col justify-between rounded-xl border border-border/50 bg-card p-5 sm:p-6 shadow-sm transition-all hover:border-primary/40">
      {/* Top Header Badge */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shrink-0">
              <Printer className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">استوديو الكاشير والطباعة الفورية</h3>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary font-mono">
                  Web Native POS
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                محطة نقاط البيع المباشرة والطباعة الحرارية السريعة
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-foreground shrink-0">
            طابعات حرارية فورية
          </span>
        </div>

        {/* Core Specs Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <div className="rounded-lg border border-border/40 bg-muted/20 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">التشغيل</div>
            <div className="text-xs font-semibold text-foreground mt-0.5">سحابي مباشر</div>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">سرعة الطباعة</div>
            <div className="text-xs font-semibold text-emerald-500 mt-0.5 font-mono tabular-nums">فورية (ESC/POS)</div>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">طرق الاتصال</div>
            <div className="text-xs font-semibold text-foreground mt-0.5 font-mono">USB / LAN / Wi-Fi</div>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">التثبيت المطلوب</div>
            <div className="text-xs font-semibold text-foreground mt-0.5">بدون برامج إضافية</div>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-2.5 mb-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="size-3.5 text-primary shrink-0" />
            <span>طباعة صامتة فورية لبوالص الشحن وفواتير الكاشير بتوافق كامل مع طابعات 80mm و 58mm.</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="size-3.5 text-primary shrink-0" />
            <span>ربط مباشر مع ماسحات الباركود الضوئية وقارئات QR لإنهاء عمليات البيع في ثوانٍ.</span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="size-3.5 text-primary shrink-0" />
            <span>محطة كاشير متصلة مباشرة بالمخزون المركزي لمنع ازدواج البيع وتحديث الأرصدة لحظياً.</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row items-center gap-2.5">
        <Link
          to="/pos"
          className={cn(
            "w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
          )}
        >
          <span>فتح محطة الكاشير ونقاط البيع (POS)</span>
          <ArrowRight className="size-4 rtl:rotate-180" />
        </Link>
      </div>
    </div>
  );
};

export default MerchantStudioCard;

