import React, { useState } from "react";
import {
  ExternalLink,
  Copy,
  Check,
  Megaphone,
  Globe,
  Target,
  Sparkles,
} from "lucide-react";
import { marketingSections } from "../landing/marketingLandingData";
import { Button } from "../../components/ui/button";

const SuperAdminMarketingLinks: React.FC = () => {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const liveCount = marketingSections.filter(
    (section) => section.status === "live",
  ).length;
  const upcomingCount = marketingSections.filter(
    (section) => section.status === "upcoming",
  ).length;

  const copyLink = async (slug: string) => {
    const path = `/marketing/${slug}`;
    const fullUrl = `${window.location.origin}${path}`;

    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 1800);
    } catch (error) {
      console.error("Failed to copy link", error);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" dir="rtl">
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs">
            <Megaphone className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                مركز روابط صفحات التسويق
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                Landing Directory
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              دليل صفحات الهبوط التسويقية، الأهداف التحويلية، والجمهور المستهدف لكل قطاع
            </p>
          </div>
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.98] transition-transform self-end sm:self-auto"
        >
          <a href="/marketing" target="_blank" rel="noreferrer">
            <span>فتح مركز اللاندنج العام</span>
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </div>

      {/* Linear Telemetry Strip */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">إجمالي صفحات اللاندنج</span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {marketingSections.length}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">صفحة متخصصة</span>
          </div>

          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">صفحات جاهزة الآن</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {liveCount}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">مفعلة وتستقبل الزوار</span>
          </div>

          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">صفحات قيد الإطلاق</span>
              <span className="size-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
              {upcomingCount}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">جاهزة للنشر قريباً</span>
          </div>
        </div>
      </div>

      {/* Single-Surface Chassis */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-foreground">
            قائمة الروابط والشروحات
          </h2>
          <span className="text-[10px] font-mono text-muted-foreground">
            {marketingSections.length} رابط
          </span>
        </div>

        <div className="divide-y divide-border/60">
          {marketingSections.map((section) => {
            const sectionPath = `/marketing/${section.slug}`;
            const isCopied = copiedSlug === section.slug;

            return (
              <div
                key={section.slug}
                className="p-4 hover:bg-muted/15 transition-colors space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {section.pageTitle}
                      </h3>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${
                          section.status === "upcoming"
                            ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {section.status === "upcoming" ? "قريباً" : "جاهزة"}
                      </span>
                    </div>
                    {section.kicker && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {section.kicker}
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {section.heroLead}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5">
                    <span className="text-[10px] text-muted-foreground block mb-0.5">
                      الجمهور المستهدف
                    </span>
                    <span className="font-medium text-foreground">
                      {section.audience}
                    </span>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5">
                    <span className="text-[10px] text-muted-foreground block mb-0.5">
                      هدف الصفحة التحويلي (Conversion)
                    </span>
                    <span className="font-medium text-foreground">
                      {section.conversionGoal}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                  <code className="text-[11px] font-mono px-2 py-1 rounded bg-muted text-muted-foreground border border-border/40 self-start sm:self-auto">
                    {sectionPath}
                  </code>
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      size="sm"
                      className="h-7.5 px-3 text-xs gap-1.5 shadow-2xs active:scale-[0.98] transition-transform"
                    >
                      <a href={sectionPath} target="_blank" rel="noreferrer">
                        <span>فتح الصفحة</span>
                        <ExternalLink className="size-3" />
                      </a>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyLink(section.slug)}
                      className="h-7.5 px-3 text-xs gap-1.5 shadow-2xs active:scale-[0.98] transition-transform"
                    >
                      {isCopied ? (
                        <>
                          <Check className="size-3 text-emerald-500" />
                          <span>تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>نسخ الرابط</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminMarketingLinks;
