import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  Layers,
  PackageCheck,
  Wallet,
} from "lucide-react";
import {
  type DashboardData,
  fetchDashboard,
  fmtMoney,
} from "../../shared";
import { type DashboardKpiCardItem } from "../types/dashboardTypes";

export function useDentalDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchDashboard());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byStatus = data?.byStatus ?? {};
  const topDoctors = data?.topDoctors ?? [];
  const topDebtors = data?.topDebtors ?? [];
  const totalCases = Object.values(byStatus).reduce(
    (a, b) => a + (Number(b) || 0),
    0
  );
  const activeCasesCount =
    data?.activeCasesCount ??
    data?.activeCount ??
    Object.entries(byStatus)
      .filter(([st]) => !["DELIVERED", "CLOSED"].includes(st))
      .reduce((sum, [, cnt]) => sum + (Number(cnt) || 0), 0);

  const cards: DashboardKpiCardItem[] = [
    {
      id: "todayReceived",
      label: "وارد اليوم (مستلم)",
      value: data?.todayReceived ?? "—",
      icon: <PackageCheck className="w-5 h-5" />,
      tone: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      tooltip: "عرض الحالات التي تم استلامها وتسجيلها اليوم",
      onClick: () => navigate("/dental-lab/cases?dateRange=received_today"),
    },
    {
      id: "todayDue",
      label: "خارج اليوم (تسليمات اليوم)",
      value: data?.todayDue ?? "—",
      icon: <Clock className="w-5 h-5" />,
      tone: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      tooltip: "عرض الحالات المطلوب خروجها وتسليمها اليوم للعيادات",
      onClick: () => navigate("/dental-lab/cases?dateRange=due_today"),
    },
    {
      id: "activeCases",
      label: "الحالات الجارية (نشطة)",
      value: activeCasesCount,
      icon: <Layers className="w-5 h-5" />,
      tone: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
      tooltip: "عرض كافة الحالات قيد التشغيل في المعمل",
      onClick: () => navigate("/dental-lab/cases?tab=ACTIVE"),
    },
    {
      id: "readyCount",
      label: t("dentalLab.dashboard.readyCount"),
      value: data?.readyCount ?? "—",
      icon: <CheckCircle2 className="w-5 h-5" />,
      tone: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      tooltip: "عرض الحالات الجاهزة للتسليم",
      onClick: () => navigate("/dental-lab/cases?status=READY"),
    },
    {
      id: "overdueCount",
      label: t("dentalLab.dashboard.overdueCount"),
      value: data?.overdueCount ?? "—",
      icon: <AlertTriangle className="w-5 h-5" />,
      tone: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-900/20",
      tooltip: "عرض الحالات المتأخرة عن موعد التسليم",
      onClick: () => navigate("/dental-lab/cases?tab=OVERDUE"),
    },
    {
      id: "revenue",
      label: t("dentalLab.dashboard.collected"),
      value: data?.revenue != null ? `${fmtMoney(data.revenue)} ج.م` : "—",
      icon: <Coins className="w-5 h-5" />,
      tone: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      tooltip: "عرض الفواتير والتحصيلات",
      onClick: () => navigate("/dental-lab/invoices"),
    },
    {
      id: "outstanding",
      label: t("dentalLab.dashboard.outstanding"),
      value:
        data?.outstanding != null ? `${fmtMoney(data.outstanding)} ج.م` : "—",
      icon: <Wallet className="w-5 h-5" />,
      tone: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-900/20",
      tooltip: "عرض الفواتير المعلقة غير المسددة",
      onClick: () => navigate("/dental-lab/invoices?status=UNPAID"),
    },
  ];

  return {
    data,
    loading,
    error,
    refresh: load,
    cards,
    byStatus,
    topDoctors,
    topDebtors,
    totalCases,
    activeCasesCount,
  };
}
