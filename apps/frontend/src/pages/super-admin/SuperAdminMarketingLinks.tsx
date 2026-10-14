import React, { useState, useMemo } from "react";
import {
  ExternalLink,
  Copy,
  Check,
  Megaphone,
  Search,
} from "lucide-react";
import { marketingSections } from "../landing/marketingLandingData";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";

export default function SuperAdminMarketingLinks() {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "live" | "upcoming">("ALL");

  const liveCount = marketingSections.filter(
    (section) => section.status === "live",
  ).length;
  const upcomingCount = marketingSections.filter(
    (section) => section.status === "upcoming",
  ).length;

  const filteredSections = useMemo(() => {
    return marketingSections.filter((section) => {
      const matchesStatus = statusFilter === "ALL" || section.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        section.pageTitle.toLowerCase().includes(q) ||
        section.slug.toLowerCase().includes(q) ||
        (section.audience && section.audience.toLowerCase().includes(q)) ||
        (section.kicker && section.kicker.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [searchQuery, statusFilter]);

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
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Megaphone className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              دليل روابط صفحات التسويق
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              {marketingSections.length} صفحة
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            دليل صفحات الهبوط التسويقية، الأهداف التحويلية، والجمهور المستهدف لكل قطاع
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 text-xs font-mono gap-1.5 border-border/70 active:scale-[0.98] self-end sm:self-auto"
        >
          <a href="/marketing" target="_blank" rel="noreferrer">
            <span>فتح مركز اللاندنج العام</span>
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">إجمالي صفحات اللاندنج</p>
            <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">
              {marketingSections.length}
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">صفحة تسويقية مهيأة</p>
          </div>
          <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
            <Megaphone className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">صفحات منشورة</p>
            <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-0.5">
              {liveCount}
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">مفعلة وتستقبل الزوار</p>
          </div>
          <div className="size-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <Check className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400">صفحات قيد الإطلاق</p>
            <p className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-0.5">
              {upcomingCount}
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">جاهزة للنشر بالجدول</p>
          </div>
          <div className="size-7 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-600">
            <ExternalLink className="size-3.5" />
          </div>
        </div>
      </div>

      {/* Single-Surface Chassis */}
      <div className="rounded-lg border border-border/70 bg-card shadow-xs overflow-hidden">
        {/* Chassis Controls */}
        <div className="p-2.5 sm:p-3 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1 text-xs shrink-0 self-start">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                statusFilter === "ALL"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted/40"
              }`}
            >
              الكل ({marketingSections.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("live")}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                statusFilter === "live"
                  ? "bg-emerald-600 text-white font-semibold"
                  : "text-muted-foreground hover:bg-muted/40"
              }`}
            >
              المنشورة ({liveCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("upcoming")}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                statusFilter === "upcoming"
                  ? "bg-amber-600 text-white font-semibold"
                  : "text-muted-foreground hover:bg-muted/40"
              }`}
            >
              قيد الإطلاق ({upcomingCount})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="h-8 pr-8 text-xs font-mono bg-background border-border/70"
              placeholder="بحث بالاسم، الرابط، أو الجمهور..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content list */}
        <div className="divide-y divide-border/60">
          {filteredSections.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground font-mono">
              لا توجد صفحات مطابقة لمعايير البحث والفلترة
            </div>
          ) : (
            filteredSections.map((section) => {
              const sectionPath = `/marketing/${section.slug}`;
              const isCopied = copiedSlug === section.slug;

              return (
                <div
                  key={section.slug}
                  className="p-3.5 hover:bg-muted/15 transition-colors space-y-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-semibold text-foreground">
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
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                          {section.kicker}
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">
                    {section.heroLead}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md border border-border/50 bg-muted/20 p-2">
                      <span className="text-[10px] text-muted-foreground block mb-0.5 font-mono">
                        الجمهور المستهدف
                      </span>
                      <span className="font-medium text-foreground text-xs">
                        {section.audience}
                      </span>
                    </div>
                    <div className="rounded-md border border-border/50 bg-muted/20 p-2">
                      <span className="text-[10px] text-muted-foreground block mb-0.5 font-mono">
                        هدف الصفحة التحويلي (Conversion)
                      </span>
                      <span className="font-medium text-foreground text-xs">
                        {section.conversionGoal}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/40">
                    <code className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border/50 self-start sm:self-auto" dir="ltr">
                      {sectionPath}
                    </code>
                    <div className="flex items-center gap-1.5">
                      <Button
                        asChild
                        size="sm"
                        className="h-7 px-2.5 text-xs font-mono gap-1 active:scale-[0.98]"
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
                        className="h-7 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98]"
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
            })
          )}
        </div>
      </div>
    </div>
  );
}
