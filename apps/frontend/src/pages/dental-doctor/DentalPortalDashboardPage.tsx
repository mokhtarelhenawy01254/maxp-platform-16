import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ClipboardList,
  PackageCheck,
  ShoppingBag,
  Wallet,
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
      <div className="py-16 text-center text-gray-500">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return <div className="py-16 text-center text-red-600">{error}</div>;
  }

  const stats = [
    {
      key: "myCases",
      value: data?.activeCount ?? 0,
      icon: ClipboardList,
      color: "bg-indigo-100 text-indigo-700",
    },
    {
      key: "ready",
      value: data?.readyCount ?? 0,
      icon: PackageCheck,
      color: "bg-green-100 text-green-700",
    },
    {
      key: "overdue",
      value: data?.overdueCount ?? 0,
      icon: AlertTriangle,
      color: "bg-amber-100 text-amber-700",
    },
    {
      key: "outstanding",
      value: formatCurrency(data?.outstanding ?? 0),
      icon: Wallet,
      color: "bg-rose-100 text-rose-700",
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("dentalPortal.dashboard.greeting")},{" "}
          {dentist?.name || t("dentalPortal.layout.doctor")} 👋
        </h1>
        <p className="mt-1 text-gray-500">
          {t("dentalPortal.dashboard.welcomeBack")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.key}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-gray-500">
                    {t(`dentalPortal.dashboard.stats.${s.key}`)}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                </div>
                <div className={`rounded-lg p-3 ${s.color}`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-gray-800">
        {t("dentalPortal.dashboard.quickActions")}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-4 rounded-xl border bg-white p-5 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <Icon size={24} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{link.label}</p>
                <p className="text-sm text-gray-500">{link.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default DentalPortalDashboardPage;