import React from "react";
import { Link } from "react-router-dom";
import { Store, Grid3x3, Laptop, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppDownloadsHeaderProps {
  totalPackagesCount: number;
  copiedAll: boolean;
  onCopyDeploymentPack: () => void;
}

export function AppDownloadsHeader({
  totalPackagesCount,
  copiedAll,
  onCopyDeploymentPack,
}: AppDownloadsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
      {/* Section Switcher Tabs */}
      <div className="flex items-center p-1 rounded-xl bg-muted/40 border border-border/40 text-xs font-semibold shrink-0 overflow-x-auto scrollbar-none">
        <Link
          to="/marketplace"
          className="px-3.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 whitespace-nowrap"
        >
          <Store className="size-3.5" />
          <span>متجر التطبيقات</span>
        </Link>

        <Link
          to="/my-apps"
          className="px-3.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 whitespace-nowrap"
        >
          <Grid3x3 className="size-3.5" />
          <span>تطبيقاتي المفعلة</span>
        </Link>

        <div className="px-3.5 py-1.5 rounded-lg bg-background text-foreground shadow-sm font-bold flex items-center gap-1.5 whitespace-nowrap">
          <Laptop className="size-3.5 text-primary" />
          <span>تطبيقات الأجهزة والموبايل</span>
          <span className="text-[10px] font-mono tabular-nums px-1.5 py-0 rounded-full bg-primary/10 text-primary font-semibold">
            {totalPackagesCount}
          </span>
        </div>
      </div>

      {/* Quick Action: Copy All Links for Team */}
      <div className="flex items-center gap-2 self-stretch sm:self-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onCopyDeploymentPack}
          className="h-9 rounded-xl px-3 text-xs font-semibold gap-1.5 border-border/60 hover:bg-muted active:scale-[0.97] transition-transform duration-160 ease-out"
        >
          {copiedAll ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          <span className="hidden sm:inline">نسخ دليل الروابط للفريق</span>
          <span className="sm:hidden">نسخ الروابط</span>
        </Button>
      </div>
    </div>
  );
}
