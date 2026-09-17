import React from "react";
import { Link } from "react-router-dom";
import {
  Printer,
  ArrowRight,
  Zap,
  HardDrive,
  Cpu,
  Receipt,
  ScanBarcode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const MerchantStudioCard: React.FC = () => {
  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-border/40 bg-card p-5 sm:p-6 shadow-sm hover:border-primary/40 hover:bg-accent/[0.01] transition-all duration-200">
      {/* Top Header & Title */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="size-12 sm:size-14 rounded-2xl bg-muted/60 dark:bg-muted/30 border border-border/40 flex items-center justify-center shrink-0 text-foreground transition-transform duration-150">
              <Printer className="size-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  استوديو الكاشير والطباعة الفورية (Web POS)
                </h3>
                <Badge variant="outline" className="text-[11px] font-mono font-semibold text-primary border-primary/30 bg-primary/10">
                  سحابي فوري
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                MaxP Web Native POS &amp; ESC/POS Thermal Printing Station
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground shrink-0">
            طابعات حرارية فورية
          </span>
        </div>

        {/* Telemetry Matrix Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5 text-center">
            <span className="text-[10px] text-muted-foreground block">نمط التشغيل</span>
            <span className="text-xs font-bold text-foreground mt-0.5 block">سحابي مباشر 100%</span>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5 text-center">
            <span className="text-[10px] text-muted-foreground block">بروتوكول الطباعة</span>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">Raw ESC/POS</span>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5 text-center">
            <span className="text-[10px] text-muted-foreground block">الاتصال بالطابعات</span>
            <span className="text-xs font-mono font-bold text-foreground mt-0.5 block">USB / LAN / Wi-Fi</span>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5 text-center">
            <span className="text-[10px] text-muted-foreground block">مقاسات الفواتير</span>
            <span className="text-xs font-mono font-semibold text-foreground mt-0.5 block tabular-nums">80mm &amp; 58mm</span>
          </div>
        </div>

        {/* Core Specs & Features List */}
        <div className="space-y-2.5 mb-6 text-xs text-muted-foreground">
          <div className="flex items-start gap-2.5">
            <Receipt className="size-4 text-primary shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              طباعة صامتة وفورية لفواتير الكاشير وبوالص الشحن بدون شاشات منبثقة أو مقاطعة لسرعة عملية البيع.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <ScanBarcode className="size-4 text-primary shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              تكامل مباشر مع ماسحات الباركود الضوئية وقارئات QR لإنهاء فواتير العملاء وسحب المنتجات في ثوانٍ.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <Cpu className="size-4 text-primary shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              محطة متصلة مباشرة بالمخزون المركزي لمنع ازدواج البيع وتحديث أرصدة الفروع فور اعتماد الفاتورة.
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-border/40">
        <Link to="/pos" className="w-full block">
          <Button
            className="w-full h-10 rounded-xl text-xs font-bold gap-2 shadow-sm active:scale-[0.98] transition-all"
          >
            <span>فتح محطة الكاشير ونقاط البيع (POS)</span>
            <ArrowRight className="size-4 rtl:rotate-180" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default MerchantStudioCard;

