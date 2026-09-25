import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  History,
  Search,
  RefreshCw,
  ArrowDownToLine,
  Trash2,
  ExternalLink,
  Store,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Package
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { appIconsBySlug } from "@/utils/marketplace";
import { cn } from "@/lib/utils";

interface AppActivityLog {
  id: string;
  action: "INSTALL_APP" | "UNINSTALL_APP" | string;
  description: string;
  targetName: string;
  targetId: string | null;
  createdAt: string;
  user: {
    id: string | null;
    name: string;
    email: string;
    role: string;
    avatar?: string | null;
  };
  metadata?: {
    appSlug?: string;
    appName?: string;
    pricingModel?: string;
    billingCycle?: string;
    cost?: number;
    trial?: boolean;
    synthetic?: boolean;
  } | null;
}

interface LogApiResponse {
  success: boolean;
  data: {
    logs: AppActivityLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    stats: {
      totalInstalls: number;
      totalUninstalls: number;
      totalActions: number;
    };
  };
}

export const AppHistoryPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language !== "en";

  const [logs, setLogs] = useState<AppActivityLog[]>([]);
  const [stats, setStats] = useState({ totalInstalls: 0, totalUninstalls: 0, totalActions: 0 });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<"ALL" | "INSTALL_APP" | "UNINSTALL_APP">("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true);
      else setLoading(true);

      try {
        const res = await apiClient.get<LogApiResponse>("/marketplace/logs", {
          params: {
            page,
            limit: 20,
            action: actionFilter !== "ALL" ? actionFilter : undefined,
            search: search.trim() || undefined
          }
        });

        if (res.data?.success && res.data?.data) {
          setLogs(res.data.data.logs || []);
          setStats(res.data.data.stats || { totalInstalls: 0, totalUninstalls: 0, totalActions: 0 });
          setTotalPages(res.data.data.pagination?.pages || 1);
          setTotalCount(res.data.data.pagination?.total || 0);
        }
      } catch (err) {
        console.error("Failed to fetch marketplace audit logs:", err);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, actionFilter, search]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleActionFilter = (filter: "ALL" | "INSTALL_APP" | "UNINSTALL_APP") => {
    setActionFilter(filter);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* 1. Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/40">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <History className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight text-balance">
                  {t("marketplace.historyTitle", "سجل حركات وتثبيت التطبيقات")}
                </h1>
                <Badge variant="secondary" className="font-bold text-xs px-2.5 py-0.5 rounded-full tabular-nums">
                  {totalCount} {t("marketplace.records", "عملية مسجلة")}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 text-pretty">
                {t(
                  "marketplace.historySubtitle",
                  "متابعة دقيقة لكل من قام بتثبيت أو تفعيل أو إلغاء تثبيت أي أداة في متجرك وحسابك."
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(true)}
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

        {/* 2. Telemetry KPI Cards (Single-Surface Bento) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border/40 bg-card/60 p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">إجمالي عمليات التثبيت</p>
              <p className="text-2xl font-black text-foreground tabular-nums">{stats.totalInstalls}</p>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <ArrowDownToLine className="size-5" />
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card/60 p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">إجمالي عمليات الإلغاء</p>
              <p className="text-2xl font-black text-foreground tabular-nums">{stats.totalUninstalls}</p>
            </div>
            <div className="size-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <Trash2 className="size-5" />
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card/60 p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">إجمالي الحركات المسجلة</p>
              <p className="text-2xl font-black text-foreground tabular-nums">{stats.totalActions}</p>
            </div>
            <div className="size-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <History className="size-5" />
            </div>
          </div>
        </div>

        {/* 3. Search and Action Filters Bar */}
        <div className="p-2 sm:p-3 rounded-2xl border border-border/40 bg-card/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="ابحث باسم التطبيق، اسم الموظف المنفذ، أو البريد الإلكتروني..."
              className="pr-9 pl-3 h-10 rounded-xl border-border/40 text-xs bg-background/80"
            />
          </div>

          <div className="flex items-center p-1 rounded-xl bg-muted/50 border border-border/30 shrink-0 text-xs font-semibold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleActionFilter("ALL")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                actionFilter === "ALL"
                  ? "bg-background text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              الكل ({stats.totalActions})
            </button>
            <button
              type="button"
              onClick={() => handleActionFilter("INSTALL_APP")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
                actionFilter === "INSTALL_APP"
                  ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CheckCircle2 size={13} />
              <span>تثبيت ({stats.totalInstalls})</span>
            </button>
            <button
              type="button"
              onClick={() => handleActionFilter("UNINSTALL_APP")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
                actionFilter === "UNINSTALL_APP"
                  ? "bg-background text-rose-600 dark:text-rose-400 shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <XCircle size={13} />
              <span>إلغاء تثبيت ({stats.totalUninstalls})</span>
            </button>
          </div>
        </div>

        {/* 4. Logs Table / Stream */}
        <div className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border/30 bg-muted/20">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-xl" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-32 rounded-lg" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-3">
              <div className="size-14 mx-auto rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center border border-border/40">
                <History className="size-7" />
              </div>
              <h3 className="text-sm font-bold text-foreground">لا توجد حركات مسجلة حالياً</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto text-pretty">
                لم يتم تسجيل أي عمليات تثبيت أو إلغاء تثبيت تطابق الفلاتر المحددة.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/40 text-muted-foreground font-semibold">
                    <th className="py-3 px-4">نوع الحركة</th>
                    <th className="py-3 px-4">الأداة / التطبيق</th>
                    <th className="py-3 px-4">المنفذ (بواسطة من؟)</th>
                    <th className="py-3 px-4">التفاصيل والنظام</th>
                    <th className="py-3 px-4">التاريخ والتوقيت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {logs.map((log) => {
                    const isInstall = log.action === "INSTALL_APP";
                    const appSlug = log.metadata?.appSlug;
                    const AppIconComponent = appSlug ? appIconsBySlug[appSlug] || Package : Package;

                    return (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        {/* Action Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isInstall ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                              <CheckCircle2 className="size-3.5" />
                              <span>تثبيت وتفعيل</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20">
                              <Trash2 className="size-3.5" />
                              <span>إلغاء التثبيت</span>
                            </span>
                          )}
                        </td>

                        {/* App Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="size-9 rounded-xl bg-muted/60 text-foreground border border-border/40 flex items-center justify-center shrink-0">
                              <AppIconComponent className="size-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate">{log.targetName || "تطبيق"}</p>
                              {appSlug && (
                                <Link
                                  to={`/marketplace/apps/${appSlug}`}
                                  className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                                >
                                  <span>{appSlug}</span>
                                  <ExternalLink className="size-2.5" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Actor (Who installed or uninstalled) */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7 rounded-lg border border-border/40">
                              {log.user?.avatar && <AvatarImage src={log.user.avatar} />}
                              <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                {log.user?.name ? log.user.name.charAt(0) : "م"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-foreground text-xs">{log.user?.name || "مدير النظام"}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {log.user?.email || log.user?.role || "مسؤول"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Details / Pricing / Trial */}
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {log.metadata?.pricingModel ? (
                            <div className="space-y-0.5">
                              <span className="inline-block px-1.5 py-0.5 rounded bg-muted text-[10px] font-semibold text-foreground">
                                {log.metadata.pricingModel === "FREE"
                                  ? "مجاني"
                                  : log.metadata.pricingModel === "PAY_PER_USE"
                                  ? "حسب الاستهلاك"
                                  : log.metadata.billingCycle === "yearly"
                                  ? "اشتراك سنوي"
                                  : "اشتراك شهري"}
                              </span>
                              {log.metadata?.trial && (
                                <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                  تجربة مجانية
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px]">{log.description}</span>
                          )}
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap tabular-nums">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Clock className="size-3 text-muted-foreground shrink-0" />
                            <span>{new Date(log.createdAt).toLocaleDateString(isRtl ? "ar-EG" : "en-US")}</span>
                            <span className="text-[10px] text-muted-foreground/80">
                              {new Date(log.createdAt).toLocaleTimeString(isRtl ? "ar-EG" : "en-US", {
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-border/40 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
              <span className="tabular-nums">
                صفحة <strong>{page}</strong> من <strong>{totalPages}</strong> ({totalCount} عملية)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 rounded-lg text-xs gap-1"
                >
                  <ChevronRight className="size-3.5" />
                  <span>السابق</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-2.5 rounded-lg text-xs gap-1"
                >
                  <span>التالي</span>
                  <ChevronLeft className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppHistoryPage;
