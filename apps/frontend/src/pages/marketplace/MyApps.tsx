import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import {
  Package,
  Settings2,
  X,
  Loader2,
  CheckCircle2,
  Clock,
  CreditCard,
  Search,
  AppWindow,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

interface MarketplaceApp {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  category: string;
  description: string;
  icon?: string;
  logo?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  pricingModel: string;
}

interface MonthlyUsage {
  totalCost: number;
  totalQuantity: number;
}

interface InstalledApp {
  id: string;
  status: string;
  activePricingModel: string;
  trialEndsAt?: string;
  validUntil?: string;
  totalSpent: number;
  monthlyUsage?: MonthlyUsage;
  createdAt: string;
  app: MarketplaceApp;
}

interface ApiResponse {
  success: boolean;
  data: InstalledApp[];
}

const STATUS_BADGE = {
  ACTIVE: { label: "active", variant: "success" as const, icon: CheckCircle2 },
  TRIAL: { label: "trial", variant: "warning" as const, icon: Clock },
  CANCELLED: { label: "cancelled", variant: "destructive" as const, icon: X },
} as const;

function MyApps() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith("ar");
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uninstallingId, setUninstallingId] = useState<string | null>(null);
  const [confirmUninstall, setConfirmUninstall] = useState<InstalledApp | null>(null);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<ApiResponse>("/my-apps");
      if (res.data.success) {
        setApps(res.data.data);
      }
    } catch {
      toast.error(t("marketplace.fetchError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const handleUninstall = async () => {
    if (!confirmUninstall) return;
    setUninstallingId(confirmUninstall.id);
    try {
      await apiClient.post(`/marketplace/apps/${confirmUninstall.app.slug}/uninstall`);
      toast.success(t("marketplace.deactivatedSuccess", { name: confirmUninstall.app.name }));
      setApps((prev) => prev.filter((a) => a.id !== confirmUninstall.id));
    } catch {
      toast.error(t("marketplace.deactivationError"));
    } finally {
      setUninstallingId(null);
      setConfirmUninstall(null);
    }
  };

  const filtered = search.trim()
    ? apps.filter((a) => {
        const q = search.toLowerCase();
        const name = a.app.name.toLowerCase();
        const desc = (a.app.description || "").toLowerCase();
        return name.includes(q) || desc.includes(q);
      })
    : apps;

  const StatusBadge = ({ status }: { status: string }) => {
    const config = STATUS_BADGE[status as keyof typeof STATUS_BADGE] || STATUS_BADGE.ACTIVE;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1 text-xs">
        <Icon size={12} />
        {t(`marketplace.${config.label}`)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50">
              <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t("marketplace.installedApps")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("marketplace.installedCurrently", { count: apps.length })}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 relative">
          <Search className={`absolute ${isRtl ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={String(t("marketplace.searchPlaceholder"))}
            className={`${isRtl ? "pr-10" : "pl-10"} h-10`}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <AppWindow className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              {search ? t("marketplace.noSearchResults", { query: search }) : t("marketplace.installedCurrently", { count: 0 })}
            </p>
            {!search && (
              <Link to="/marketplace">
                <Button variant="outline" className="mt-4">
                  <Store className="h-4 w-4 ml-2" />
                  {t("marketplace.browseAll")}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((installed) => (
              <div
                key={installed.id}
                className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                        {installed.app.icon ? (
                          <img src={installed.app.icon} alt="" className="w-6 h-6" />
                        ) : (
                          <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {installed.app.name}
                        </h3>
                        <StatusBadge status={installed.status} />
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
                    {installed.app.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                      <CreditCard size={12} />
                      {installed.activePricingModel === "FREE"
                        ? t("marketplace.freePrice")
                        : installed.activePricingModel === "PAY_PER_USE"
                          ? t("marketplace.payPerUse")
                          : t("marketplace.perMonth")}
                    </span>
                    {installed.monthlyUsage && installed.monthlyUsage.totalCost > 0 && (
                      <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                        {t("marketplace.currencyUnit")} {Number(installed.monthlyUsage.totalCost).toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2" dir={isRtl ? "rtl" : "ltr"}>
                    <Link
                      to={`/my-apps/${installed.app.slug}/settings`}
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full gap-1.5">
                        <Settings2 size={14} />
                        {t("marketplace.details")}
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => setConfirmUninstall(installed)}
                      disabled={uninstallingId === installed.id}
                    >
                      {uninstallingId === installed.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X size={16} />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmUninstall} onOpenChange={() => setConfirmUninstall(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("marketplace.deactivateTitle", { name: confirmUninstall?.app.name || "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("marketplace.deactivateConfirm")}
              <br />
              {t("marketplace.deactivateWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("marketplace.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUninstall}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {t("marketplace.confirmDeactivation")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MyApps;
