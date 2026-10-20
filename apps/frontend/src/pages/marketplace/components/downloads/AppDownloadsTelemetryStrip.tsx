import React from "react";
import { Download, Laptop, Smartphone, Key, Check, Copy } from "lucide-react";

interface AppDownloadsTelemetryStripProps {
  osLabel: string;
  isStandalone: boolean;
  companyToken: string;
  copiedToken: boolean;
  onHeroInstall: () => void;
  onSelectTab: (tab: "desktop" | "mobile") => void;
  onCopyTokenOnly: () => void;
}

export function AppDownloadsTelemetryStrip({
  osLabel,
  isStandalone,
  companyToken,
  copiedToken,
  onHeroInstall,
  onSelectTab,
  onCopyTokenOnly,
}: AppDownloadsTelemetryStripProps) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-x-reverse divide-border/40 shadow-sm">
      {/* Telemetry 1: Auto-Detected Device */}
      <div
        role="button"
        tabIndex={0}
        onClick={onHeroInstall}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onHeroInstall();
        }}
        className="p-3.5 sm:p-4 hover:bg-accent/[0.02] cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none select-none group"
        aria-label="جهازك المكتشف حالياً"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted-foreground">جهازك المكتشف</span>
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors text-balance">
            {osLabel}
          </span>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            متوافق 100%
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
          <Download className="size-3 text-primary" />
          <span>{isStandalone ? "التطبيق مثبت لديك" : "تحميل مباشر لجهازك"}</span>
        </span>
      </div>

      {/* Telemetry 2: Desktop Workstations */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectTab("desktop")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onSelectTab("desktop");
        }}
        className="p-3.5 sm:p-4 hover:bg-accent/[0.02] cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none select-none group"
        aria-label="برامج سطح المكتب ويندوز"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted-foreground">سطح المكتب</span>
          <Laptop className="size-4 text-primary" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
            Windows 64-bit
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground mt-0.5 font-mono tabular-nums block" dir="ltr">
          84.1&nbsp;MB (.exe) + 114.8&nbsp;MB (.zip)
        </span>
      </div>

      {/* Telemetry 3: Mobile Companions */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectTab("mobile")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onSelectTab("mobile");
        }}
        className="p-3.5 sm:p-4 hover:bg-accent/[0.02] cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none select-none group"
        aria-label="تطبيقات الموبايل والميدان"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted-foreground">الموبايل والميدان</span>
          <Smartphone className="size-4 text-primary" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
            Android &amp; iOS
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground mt-0.5 font-mono tabular-nums block" dir="ltr">
          155.7&nbsp;MB (APK) + Safari PWA
        </span>
      </div>

      {/* Telemetry 4: Company Pairing Token */}
      <div
        role="button"
        tabIndex={0}
        onClick={onCopyTokenOnly}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onCopyTokenOnly();
        }}
        className="p-3.5 sm:p-4 hover:bg-accent/[0.02] cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none select-none group"
        aria-label="معرف المنشأة لربط الأجهزة"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted-foreground">معرّف ربط الأجهزة</span>
          <Key className="size-4 text-primary" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-sm sm:text-base font-mono font-bold text-foreground truncate" dir="ltr">
            {companyToken ? `${companyToken.slice(0, 14)}…` : "سجل الدخول"}
          </span>
        </div>
        <span className="text-[11px] text-primary mt-0.5 flex items-center gap-1 group-hover:underline">
          {copiedToken ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
          <span>{copiedToken ? "تم نسخ الرمز" : "انقر لنسخ المعرّف"}</span>
        </span>
      </div>
    </div>
  );
}
