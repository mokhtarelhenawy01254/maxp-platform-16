import React from "react";
import {
  Printer,
  ShoppingBag,
  ArrowDownToLine,
  Zap,
  HardDrive,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const MerchantStudioCard: React.FC = () => {
  const downloadWinUrl = "https://github.com/elhenawym124-ops/maxp-platform-10/releases/latest/download/MaxP-MerchantStudio-Setup.exe";

  return (
    <div className="relative flex flex-col justify-between rounded-xl border border-border/40 bg-card p-5 sm:p-6 shadow-sm transition-all hover:border-primary/30">
      {/* Top Header Badge & Telemetry */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400 shrink-0">
              <Printer className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">استوديو التاجر والطباعة الحرارية</h3>
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 font-mono">
                  v1.2.0
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                MaxP Merchant &amp; POS Studio (Direct ESC/POS Driver)
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 shrink-0">
            طابعات حرارية فورية
          </span>
        </div>

        {/* Core Specs Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <div className="rounded-lg border border-border/30 bg-muted/30 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">نظام التشغيل</div>
            <div className="text-xs font-semibold text-foreground mt-0.5">Windows &amp; macOS</div>
          </div>
          <div className="rounded-lg border border-border/30 bg-muted/30 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">سرعة الطباعة</div>
            <div className="text-xs font-semibold text-emerald-500 mt-0.5 font-mono tabular-nums">&lt; 120 ms</div>
          </div>
          <div className="rounded-lg border border-border/30 bg-muted/30 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">منافذ التوصيل</div>
            <div className="text-xs font-semibold text-foreground mt-0.5 font-mono">USB / COM / LAN</div>
          </div>
          <div className="rounded-lg border border-border/30 bg-muted/30 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">حجم الملف</div>
            <div className="text-xs font-semibold text-foreground mt-0.5 font-mono tabular-nums">~112 MB</div>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="size-3.5 text-amber-400 shrink-0" />
            <span>طباعة صامتة فورية لبوالص الشحن وفواتير الكاشير بدون ظهور مربع حوار المتصفح.</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HardDrive className="size-3.5 text-amber-400 shrink-0" />
            <span>ربط مباشر مع موازين الباركود الإلكترونية وأدراج النقدية (Cash Drawers).</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Cpu className="size-3.5 text-amber-400 shrink-0" />
            <span>محطة كاشير مدمجة (Offline POS Buffer) تحفظ الفواتير محلياً عند بطء الشبكة.</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-border/30">
        <a
          href={downloadWinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 text-xs font-semibold text-zinc-100 shadow-sm transition-all active:scale-[0.98] border border-zinc-700"
          )}
        >
          <ArrowDownToLine className="size-4 text-amber-400" />
          <span>تحميل استوديو التاجر لويندوز (Setup .exe)</span>
        </a>
      </div>
    </div>
  );
};

export default MerchantStudioCard;
