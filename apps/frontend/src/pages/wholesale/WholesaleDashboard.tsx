import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import {
  Users,
  Tag,
  Wallet,
  AlertTriangle,
  TrendingUp,
  ShoppingBag,
  ArrowUpRight,
  Sparkles,
  Building2,
  FileSpreadsheet,
  BadgeAlert,
} from "lucide-react";

interface DashboardStats {
  totalCustomers: number;
  activePriceLists: number;
  totalOutstanding: number;
  overdueAmount: number;
  monthlySales: number;
  monthlyOrderCount: number;
}

export default function WholesaleDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.get("/wholesale/dashboard");
        setStats(res?.data?.data || null);
      } catch (err: any) {
        setError(err?.response?.data?.message || "تعذر تحميل لوحة الجملة");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">جاري تحميل مؤشرات مبيعات الجملة...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-3 rtl font-sans" dir="rtl">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center border border-red-500/20">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">تعذر تحميل لوحة الجملة</h2>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  const cards = [
    {
      label: "عملاء الجملة المسجلين",
      value: stats?.totalCustomers ?? 0,
      suffix: "تاجر / عميل",
      icon: Users,
      color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
      link: "/wholesale/customers",
    },
    {
      label: "قوائم الأسعار الفعالة",
      value: stats?.activePriceLists ?? 0,
      suffix: "قائمة تسعير",
      icon: Tag,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      link: "/wholesale/price-lists",
    },
    {
      label: "إجمالي المديونية القائمة",
      value: (stats?.totalOutstanding ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      suffix: "ج.م",
      icon: Wallet,
      color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
      link: "/wholesale/debts",
    },
    {
      label: "المديونيات المتأخرة",
      value: (stats?.overdueAmount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      suffix: "ج.م",
      icon: BadgeAlert,
      color: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",
      link: "/wholesale/debts",
    },
    {
      label: "مبيعات الجملة هذا الشهر",
      value: (stats?.monthlySales ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      suffix: "ج.م",
      icon: TrendingUp,
      color: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
    },
    {
      label: "طلبات الجملة خلال الشهر",
      value: stats?.monthlyOrderCount ?? 0,
      suffix: "طلب توريد",
      icon: ShoppingBag,
      color: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 rtl font-sans" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Building2 className="w-3.5 h-3.5" />
              منظومة البيع بالجملة
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              B2B Commerce Engine
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            لوحة قيادة البيع بالجملة والتوزيع
          </h1>
          <p className="text-xs text-muted-foreground">
            متابعة حركة السحب، مديونيات التجار، وقوائم التسعير المخصصة لشركاء التوزيع
          </p>
        </div>

        {/* Quick Nav Links */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/wholesale/customers"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-primary" />
            التجار
          </Link>
          <Link
            to="/wholesale/price-lists"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-colors"
          >
            <Tag className="w-3.5 h-3.5 text-primary" />
            قوائم الأسعار
          </Link>
          <Link
            to="/wholesale/debts"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-colors"
          >
            <Wallet className="w-3.5 h-3.5 text-primary" />
            أعمار الديون
          </Link>
          <Link
            to="/wholesale/statements"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
            كشوف الحسابات
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold font-mono tabular-nums text-foreground">
                      {card.value}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">{card.suffix}</span>
                  </div>
                </div>
                <div className={`p-2.5 rounded-xl border ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              {card.link && (
                <div className="pt-2 border-t border-border/60">
                  <Link
                    to={card.link}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                  >
                    عرض التفاصيل والتقارير
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
