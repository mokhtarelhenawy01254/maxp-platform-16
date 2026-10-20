import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Package, RefreshCw, History, Download, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MyAppsHeaderProps {
  totalCount: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const MyAppsHeader: React.FC<MyAppsHeaderProps> = ({
  totalCount,
  isRefreshing,
  onRefresh,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/40">
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
          <Package className="size-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {t("marketplace.installedApps", "تطبيقاتي وأدواتي المفعلة")}
            </h1>
            <Badge variant="secondary" className="font-bold text-xs px-2.5 py-0.5 rounded-full tabular-nums">
              {totalCount} {t("marketplace.coreApp", "أداة")}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            إدارة وتشغيل جميع الأنظمة والإضافات المرتبطة بمتجرك ولوحة تحكمك.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-stretch sm:self-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="تحديث البيانات"
          className="h-10 rounded-xl px-3 text-xs font-semibold gap-1.5"
        >
          <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin text-primary")} />
          <span className="hidden sm:inline">تحديث</span>
        </Button>
        <Link to="/marketplace/history">
          <Button
            variant="outline"
            size="sm"
            className="h-10 rounded-xl px-3 text-xs font-semibold gap-1.5 border-border/60 hover:bg-muted"
            title="سجل حركات وتثبيت التطبيقات (من قام بالتثبيت أو الإلغاء)"
          >
            <History className="size-3.5 text-primary" />
            <span>سجل التطبيقات</span>
          </Button>
        </Link>
        <Link to="/marketplace/downloads" className="hidden sm:inline-flex">
          <Button
            variant="outline"
            size="sm"
            className="h-10 rounded-xl px-3 text-xs font-semibold gap-1.5 border-border/60 hover:bg-muted"
            title="تحميل تطبيقات الأجهزة والموبايل"
          >
            <Download className="size-3.5 text-primary" />
            <span>تحميل التطبيقات</span>
          </Button>
        </Link>
        <Link to="/marketplace" className="flex-1 sm:flex-initial">
          <Button size="sm" className="w-full sm:w-auto h-10 rounded-xl px-4 text-xs font-bold gap-2 shadow-sm">
            <Store className="size-4" />
            <span>تصفح متجر التطبيقات</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};
