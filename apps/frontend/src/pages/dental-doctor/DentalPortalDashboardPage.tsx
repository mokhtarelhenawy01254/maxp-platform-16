import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ClipboardList,
  PackageCheck,
  ShoppingBag,
  Wallet,
  Stethoscope,
  ChevronLeft,
  Activity,
  Plus,
} from "lucide-react";

import {
  formatCurrency,
  getDashboard,
  getStoredDentist,
  type DentalDashboardData,
} from "./shared";

const DentalPortalDashboardPage: React.FC = () => {
  const { t: tRaw } = useTranslation();
  const t = tRaw as unknown as (key: string) => string;
  const [data, setData] = useState<DentalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dentist = getStoredDentist();

  useEffect(() => {
    let cancelled = false;
    getDashboard()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError(t("dentalPortal.dashboard.error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-3 text-xs sm:text-sm">جاري تحميل لوحة متابعة الحالات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
        {error}
      </div>
    );
  }

  const stats = [
    {
      key: "myCases",
      value: data?.activeCount ?? 0,
      icon: ClipboardList,
      badgeColor: "bg-primary/10 text-primary border-primary/20",
    },
    {
      key: "ready",
      value: data?.readyCount ?? 0,
      icon: PackageCheck,
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      key: "overdue",
      value: data?.overdueCount ?? 0,
      icon: AlertTriangle,
      badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
      key: "outstanding",
      value: formatCurrency(data?.outstanding ?? 0),
      icon: Wallet,
      badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    },
  ];

  const quickLinks = [
    {
      to: "/dental-portal/catalog",
      label: t("dentalPortal.dashboard.newOrder"),
      desc: t("dentalPortal.dashboard.browseStore"),
      icon: ShoppingBag,
    },
    {
      to: "/dental-portal/cases",
      label: t("dentalPortal.dashboard.viewCases"),
      desc: t("dentalPortal.dashboard.trackCases"),
      icon: ClipboardList,
    },
  ];

  return (
    <div className="w-full space-y-6 text-foreground" dir="rtl">
      {/* Top Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center flex-shrink-0 shadow-xs">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                {t("dentalPortal.dashboard.greeting")},{" "}
                {dentist?.name || t("dentalPortal.layout.doctor")}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/70">
                {dentist?.clinicName || "العيادة"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("dentalPortal.dashboard.welcomeBack")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/dental-portal/new-order"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>طلب حالة جديدة</span>
          </Link>
          <Link
            to="/dental-portal/cases"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/70 transition-all active:scale-[0.98]"
          >
            <ClipboardList className="w-3.5 h-3.5 text-primary" />
            <span>الحالات الجارية</span>
          </Link>
        </div>
      </div>

      {/* Modern KPI Telemetry Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.key}
              className="p-4 rounded-xl bg-card border border-border/70 shadow-xs hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {t(`dentalPortal.dashboard.stats.${s.key}`)}
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${s.badgeColor}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold text-foreground font-mono tabular-nums">
                  {s.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-sm sm:text-base font-bold text-foreground">
          {t("dentalPortal.dashboard.quickActions")}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-3.5 rounded-xl border border-border/70 bg-card p-4 shadow-xs transition-all hover:border-primary/40 hover:bg-accent/40 group"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                    {link.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{link.desc}</p>
                </div>
                <ChevronLeft className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DentalPortalDashboardPage;