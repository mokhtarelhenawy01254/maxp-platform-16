import React, { useState } from "react";
import {
  Download,
  Info,
  Share2,
  Check,
  Copy,
  ExternalLink,
  Laptop,
  Smartphone,
  Printer,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DownloadPackage, DownloadFileSpec } from "./downloadsData";

interface DownloadAppTileProps {
  pkg: DownloadPackage;
  viewMode?: "grid" | "list";
  onOpenDetails: (pkg: DownloadPackage) => void;
  companyToken?: string;
}

export const DownloadAppTile: React.FC<DownloadAppTileProps> = ({
  pkg,
  viewMode = "grid",
  onOpenDetails,
  companyToken,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const Icon = pkg.icon;
  const primaryFile = pkg.files.find((f) => f.isPrimary) || pkg.files[0];
  const secondaryFiles = pkg.files.filter((f) => f.id !== primaryFile.id);

  const handleShareOrCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(primaryFile.url);
      setCopiedUrl(true);
      toast.success(`تم نسخ رابط تحميل ${pkg.name}`);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  // ── List View (Dense Table / Linear Row Style) ──
  if (viewMode === "list") {
    return (
      <div className="group relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 p-3.5 sm:p-4 rounded-xl border border-border/40 bg-card hover:border-primary/40 hover:bg-accent/[0.02] transition-all duration-150">
        {/* Left: App Identity */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="size-11 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/40 flex items-center justify-center shrink-0 text-primary">
            <Icon className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-foreground truncate tracking-tight text-balance">
                {pkg.name}
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono font-semibold text-primary border-primary/30 bg-primary/10 px-1.5 py-0">
                {pkg.version}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate text-pretty">
              {pkg.summary}
            </p>
          </div>
        </div>

        {/* Center: Specs Telemetry (Hidden on small mobile) */}
        <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
          <span className="font-semibold text-foreground text-xs">{pkg.platformEn}</span>
          <span className="font-mono tabular-nums text-xs" dir="ltr">{pkg.telemetry.primarySize}</span>
          {pkg.telemetry.ramConsumption && (
            <span className="font-mono text-emerald-600 dark:text-emerald-400 text-xs" dir="ltr">
              {pkg.telemetry.ramConsumption}
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenDetails(pkg)}
            className="h-9 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5 active:scale-[0.97] transition-transform duration-160 ease-out"
          >
            <Info className="size-3.5" />
            <span>التفاصيل</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleShareOrCopy}
            title="نسخ رابط التحميل"
            className="size-9 rounded-xl border-border/60 hover:bg-muted active:scale-[0.97] transition-transform duration-160 ease-out shrink-0"
          >
            {copiedUrl ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </Button>

          <a
            href={primaryFile.url}
            download
            target={primaryFile.url.startsWith("http") && !primaryFile.url.includes("/downloads/") ? "_blank" : undefined}
            rel="noreferrer"
            className="shrink-0"
          >
            <Button
              size="sm"
              className="h-9 rounded-xl px-3.5 text-xs font-bold gap-1.5 shadow-sm active:scale-[0.97] transition-transform duration-160 ease-out"
            >
              <Download className="size-3.5" />
              <span>{pkg.primaryActionLabel}</span>
            </Button>
          </a>
        </div>
      </div>
    );
  }

  // ── Grid View (Action-First Pure Cockpit Bento Tile) ──
  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-border/40 bg-card p-4 sm:p-5 hover:border-primary/40 hover:bg-accent/[0.01] transition-all duration-150">
      {/* Top Identity Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="size-11 sm:size-12 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/40 flex items-center justify-center shrink-0 text-primary transition-transform duration-150 group-hover:scale-105">
              <Icon className="size-5 sm:size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight text-balance">
                  {pkg.name}
                </h3>
                <Badge variant="outline" className="text-[10px] font-mono font-semibold text-primary border-primary/30 bg-primary/10 px-1.5 py-0">
                  {pkg.version}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate text-pretty">
                {pkg.nameEn}
              </p>
            </div>
          </div>

          <span className="text-[11px] font-medium text-muted-foreground shrink-0 border border-border/40 rounded-lg px-2 py-0.5 bg-muted/30">
            {pkg.categoryLabel}
          </span>
        </div>

        {/* 1-Sentence Crisp Summary (Show, Don't Tell - No Essay) */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3 text-pretty">
          {pkg.summary}
        </p>

        {/* Clean Telemetry Matrix (Single Surface - No Nested Cards / Box-in-Box) */}
        <div className="flex items-center gap-3 py-2 border-t border-border/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] text-muted-foreground">النظام:</span>
            <span className="text-xs font-semibold text-foreground truncate">{pkg.platform}</span>
          </div>
          <span className="text-border/60">•</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-muted-foreground">الحجم:</span>
            <span className="text-xs font-mono font-bold text-foreground tabular-nums" dir="ltr">
              {pkg.telemetry.primarySize}
            </span>
          </div>
          {pkg.telemetry.ramConsumption && (
            <>
              <span className="text-border/60 hidden sm:inline">•</span>
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 tabular-nums" dir="ltr">
                  {pkg.telemetry.ramConsumption}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action Footer (Immediate Above-The-Fold CTAs) */}
      <div className="pt-3 border-t border-border/30 mt-2 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <a
            href={primaryFile.url}
            download
            target={primaryFile.url.startsWith("http") && !primaryFile.url.includes("/downloads/") ? "_blank" : undefined}
            rel="noreferrer"
            className="flex-1"
          >
            <Button
              className="w-full h-10 rounded-xl text-xs font-bold gap-2 shadow-sm active:scale-[0.97] transition-transform duration-160 ease-out"
            >
              <Download className="size-4" />
              <span>{pkg.primaryActionLabel}</span>
            </Button>
          </a>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenDetails(pkg)}
            className="h-10 rounded-xl px-3 text-xs font-semibold border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground gap-1.5 active:scale-[0.97] transition-transform duration-160 ease-out shrink-0"
          >
            <Info className="size-3.5" />
            <span className="hidden xs:inline">التفاصيل</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleShareOrCopy}
            title="نسخ رابط التحميل"
            className="size-10 rounded-xl border-border/60 hover:bg-muted active:scale-[0.97] transition-transform duration-160 ease-out shrink-0"
          >
            {copiedUrl ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </Button>
        </div>

        {/* Secondary Download Button if Portable/Zip exists */}
        {secondaryFiles.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            {secondaryFiles.map((sec) => (
              <a
                key={sec.id}
                href={sec.url}
                download
                className="w-full"
                target={sec.url.startsWith("http") && !sec.url.includes("/downloads/") ? "_blank" : undefined}
                rel="noreferrer"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-8 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-foreground gap-1.5 active:scale-[0.97] transition-transform duration-160 ease-out"
                >
                  <Download className="size-3 text-primary" />
                  <span>{sec.label}</span>
                  <span className="font-mono text-[10px] tabular-nums" dir="ltr">({sec.size})</span>
                </Button>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadAppTile;
