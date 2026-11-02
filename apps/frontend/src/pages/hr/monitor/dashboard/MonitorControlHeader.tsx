import React from "react";
import {
  Activity,
  RefreshCw,
  Search,
  Calendar,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { DateInput } from '../../../../components/ui/DateInput';

interface MonitorControlHeaderProps {
  activeNow: number;
  searchQuery: string;
  onSearchQueryChange: (val: string) => void;
  selectedDate: string;
  onSelectedDateChange: (val: string) => void;
  isToday: boolean;
  yesterdayStr: string;
  onDateStep: (offset: number) => void;
  loading: boolean;
  onRefresh: () => void;
}

export const MonitorControlHeader: React.FC<MonitorControlHeaderProps> = ({
  activeNow,
  searchQuery,
  onSearchQueryChange,
  selectedDate,
  onSelectedDateChange,
  isToday,
  yesterdayStr,
  onDateStep,
  loading,
  onRefresh,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/60 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-1 ring-inset ring-sky-500/25">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
              مراقبة وإنتاجية الأجهزة (MaxP Workspace)
            </h1>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                <span className="font-mono tabular-nums">{activeNow}</span> نشط
                الآن
              </span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            متابعة النشاط اللحظي وساعات العمل والإنتاجية لأجهزة سطح المكتب
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative flex items-center">
          <Search className="absolute right-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث بالاسم أو القسم…"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="h-8 w-40 rounded-lg border border-border/60 bg-muted/50 dark:bg-zinc-900/60 pr-8 pl-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:w-52"
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              onSelectedDateChange(new Date().toISOString().split("T")[0])
            }
            className={`rounded-md px-2 py-1 text-xs font-medium transition ${
              isToday
                ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/30"
                : "text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800 hover:text-foreground"
            }`}
          >
            اليوم
          </button>
          <button
            onClick={() => onSelectedDateChange(yesterdayStr)}
            className={`rounded-md px-2 py-1 text-xs font-medium transition ${
              selectedDate === yesterdayStr
                ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/30"
                : "text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800 hover:text-foreground"
            }`}
          >
            أمس
          </button>
        </div>

        <div className="flex items-center rounded-lg border border-border/60 bg-muted/50 dark:bg-zinc-900/60 p-0.5 text-xs">
          <button
            onClick={() => onDateStep(-1)}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800 hover:text-foreground active:scale-95"
            title="اليوم السابق"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-center gap-1.5 px-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <DateInput
              value={selectedDate}
              onChange={(e) => onSelectedDateChange(e.target.value)}
              className="bg-transparent text-xs text-foreground focus:outline-none font-mono tabular-nums"
            />
          </div>

          <button
            onClick={() => onDateStep(1)}
            disabled={isToday}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent active:scale-95"
            title="اليوم التالي"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-muted/50 dark:bg-zinc-900/60 px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted dark:hover:bg-zinc-800 hover:text-foreground active:scale-95"
          title="تحديث البيانات لحظياً"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">تحديث</span>
        </button>
      </div>
    </div>
  );
};
