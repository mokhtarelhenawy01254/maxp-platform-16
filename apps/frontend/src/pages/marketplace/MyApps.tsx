import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import {
  Package, Settings2, X, Loader2, CheckCircle2,
  Clock, CreditCard, Search, AppWindow, Store,
  Zap, ArrowUpRight, Shield, AlertCircle,
  LayoutGrid, List, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { InstalledApp } from "@/types/marketplace";
import { formatInstallCount } from "@/utils/marketplace";

interface ApiResponse {
  success: boolean;
  data: InstalledApp[];
}

const STATUS_CONFIG = {
  ACTIVE: { label: "active", variant: "success" as const, icon: CheckCircle2, bgClass: "bg-success/10", textClass: "text-success" },
  TRIAL: { label: "trial", variant: "warning" as const, icon: Clock, bgClass: "bg-amber-500/10", textClass: "text-amber-600" },
  CANCELLED: { label: "cancelled", variant: "destructive" as const, icon: X, bgClass: "bg-destructive/10", textClass: "text-destructive" },
} as const;

type StatusFilter = "ALL" | "ACTIVE" | "TRIAL" | "CANCELLED";

function MyApps() {
  const { t } = useTranslation();
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [uninstallingId, setUninstallingId] = useState<string | null>(null);
  const [confirmUninstall, setConfirmUninstall] = useState<InstalledApp | null>(null);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<ApiResponse>("/my-apps");
      if (res.data.success) setApps(res.data.data);
    } catch { toast.error(t("marketplace.fetchError")); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const handleUninstall = async () => {
    if (!confirmUninstall) return;
    setUninstallingId(confirmUninstall.id);
    try {
      await apiClient.post(`/marketplace/apps/${confirmUninstall.app.slug}/uninstall`);
      toast.success(t("marketplace.deactivatedSuccess", { name: confirmUninstall.app.name }));
      setApps((prev) => prev.filter((a) => a.id !== confirmUninstall.id));
    } catch { toast.error(t("marketplace.deactivationError")); }
    finally { setUninstallingId(null); setConfirmUninstall(null); }
  };

  const filtered = apps.filter((a) => {
    if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = a.app.name.toLowerCase();
      const desc = (a.app.description || "").toLowerCase();
      if (!name.includes(q) && !desc.includes(q)) return false;
    }
    return true;
  });

  const statusCounts = {
    ALL: apps.length,
    ACTIVE: apps.filter(a => a.status === "ACTIVE").length,
    TRIAL: apps.filter(a => a.status === "TRIAL").length,
    CANCELLED: apps.filter(a => a.status === "CANCELLED").length,
  };

  if (loading) {
    return (
      <div className="min-h-full bg-background">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="size-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-40 rounded-md" />
              <Skeleton className="h-4 w-28 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/15 bg-card/40 p-5 animate-pulse space-y-3">
                <Skeleton className="size-10 rounded-xl" />
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-3.5 w-full rounded-md" />
                <Skeleton className="h-3.5 w-2/3 rounded-md" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 flex-1 rounded-lg" />
                  <Skeleton className="h-8 w-16 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Package className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">{t("marketplace.installedApps")}</h1>
              <p className="text-sm text-muted-foreground">{t("marketplace.installedCurrently", { count: apps.length })}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            {(["ALL", "ACTIVE", "TRIAL", "CANCELLED"] as StatusFilter[]).map((status) => {
              const config = status !== "ALL" ? STATUS_CONFIG[status] : null;
              const StatusIcon = config?.icon || LayoutGrid;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-200 border",
                    statusFilter === status
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card border-border/30 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  <StatusIcon size={14} />
                  {status === "ALL" ? t("marketplace.allApps") : t(`marketplace.${config?.label}`)}
                  <span className={cn("ml-auto text-xs font-bold px-2 py-0.5 rounded-full", statusFilter === status ? "bg-white/20" : "bg-muted")}>
                    {statusCounts[status]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={String(t("marketplace.searchPlaceholder"))}
              className="pl-10 h-10 rounded-2xl"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="flex size-20 items-center justify-center rounded-full bg-muted mx-auto mb-4">
              <AppWindow size={36} className="text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-extrabold text-foreground mb-1">
              {search ? t("marketplace.noSearchResults", { query: search }) : t("marketplace.installedCurrently", { count: 0 })}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {statusFilter !== "ALL" ? t("marketplace.emptyHint") : t("marketplace.appsAvailable", { count: 0 })}
            </p>
            {!search && statusFilter === "ALL" && (
              <Link to="/marketplace">
                <Button className="gap-2 rounded-xl">
                  <Store size={15} />
                  {t("marketplace.browseAll")}
                </Button>
              </Link>
            )}
            {(search || statusFilter !== "ALL") && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl"
                onClick={() => { setSearch(""); setStatusFilter("ALL"); }}
              >
                <X size={14} />
                {t('marketplace.clearFilters')}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((installed) => {
              const statusConf = STATUS_CONFIG[installed.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.ACTIVE;
              const StatusIcon = statusConf.icon;
              const isTrial = installed.status === "TRIAL";
              const isActive = installed.status === "ACTIVE";

              return (
                <div
                  key={installed.id}
                  className="group relative rounded-2xl border border-border/15 bg-card hover:shadow-lg hover:border-border/30 transition-all duration-200 overflow-hidden"
                >
                  {isTrial && installed.trialEndsAt && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                  )}
                  {isActive && <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />}

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0 border", statusConf.bgClass, statusConf.textClass)}>
                          {installed.app.icon ? (
                            <img src={installed.app.icon} alt="" className="size-6 rounded" />
                          ) : (
                            <Package size={18} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-extrabold text-foreground truncate">{installed.app.name}</h3>
                          <Badge variant={statusConf.variant} className="gap-1 text-[10px] mt-1">
                            <StatusIcon size={10} />
                            {t(`marketplace.${statusConf.label}`)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                      {installed.app.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1">
                        <CreditCard size={11} />
                        {installed.activePricingModel === "FREE"
                          ? t("marketplace.freePrice")
                          : installed.activePricingModel === "PAY_PER_USE"
                            ? t("marketplace.payPerUse")
                            : t("marketplace.perMonth")}
                      </span>
                      {installed.monthlyUsage && installed.monthlyUsage.totalCost > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1">
                          {t("marketplace.currencyUnit")} {Number(installed.monthlyUsage.totalCost).toFixed(2)}
                        </span>
                      )}
                      {isTrial && installed.trialEndsAt && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-500/10 rounded-lg px-2.5 py-1">
                          <Clock size={11} />
                          {new Date(installed.trialEndsAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {installed.app.slug === "quantity-offers-pro" ? (
                        <Link to="/products" className="flex-1">
                          <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-xl text-xs font-bold">
                            <Package size={13} />
                            <span>فتح المنتجات</span>
                          </Button>
                        </Link>
                      ) : (
                        <Link to={`/my-apps/${installed.app.slug}/settings`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-xl text-xs font-bold">
                            <Settings2 size={13} />
                            {t("marketplace.details")}
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 shrink-0 rounded-xl p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmUninstall(installed)}
                        disabled={uninstallingId === installed.id}
                      >
                        {uninstallingId === installed.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <X size={14} />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmUninstall} onOpenChange={() => setConfirmUninstall(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle size={28} className="text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">
              {t("marketplace.deactivateTitle", { name: confirmUninstall?.app.name || "" })}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {t("marketplace.deactivateConfirm")}<br />{t("marketplace.deactivateWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl">{t("marketplace.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleUninstall} className="rounded-xl bg-destructive hover:bg-destructive/90">
              {t("marketplace.confirmDeactivation")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MyApps;
