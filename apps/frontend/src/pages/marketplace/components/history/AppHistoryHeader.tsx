import React from "react";
import { Link } from "react-router-dom";
import { History, RefreshCw, Layers, Store } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import { cn } from "../../../../lib/utils";

interface AppHistoryHeaderProps {
  totalCount: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  title: string;
  recordsText: string;
  subtitle: string;
}

export function AppHistoryHeader({
  totalCount,
  isRefreshing,
  onRefresh,
  title,
  recordsText,
  subtitle,
}: AppHistoryHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/40">
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
          <History className="size-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight text-balance">
              {title}
            </h1>
            <Badge variant="secondary" className="font-bold text-xs px-2.5 py-0.5 rounded-full tabular-nums font-mono">
              {totalCount} {recordsText}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 text-pretty">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-10 rounded-xl px-3 text-xs font-semibold gap-1.5 active:scale-[0.98] transition-transform"
        >
          <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin text-primary")} />
          <span>تحديث</span>
        </Button>
        <Link to="/my-apps">
          <Button
            variant="outline"
            size="sm"
            className="h-10 rounded-xl px-3 text-xs font-semibold gap-1.5 active:scale-[0.98] transition-transform"
          >
            <Layers className="size-3.5 text-primary" />
            <span>تطبيقاتي المفعلة</span>
          </Button>
        </Link>
        <Link to="/marketplace">
          <Button
            size="sm"
            className="h-10 rounded-xl px-4 text-xs font-bold gap-2 shadow-sm active:scale-[0.98] transition-transform"
          >
            <Store className="size-4" />
            <span>تصفح متجر التطبيقات</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
