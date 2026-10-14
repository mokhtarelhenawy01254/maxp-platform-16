import React, { useState, useEffect } from "react";
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
  Building2,
  FileSpreadsheet,
  BadgeAlert,
  RefreshCw,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

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

  const loadData = async () => {
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

  useEffect(() => {
    void loadData();
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-2.5 text-muted-foreground">
        <RefreshCw className="size-5 animate-spin text-primary" />
        <span className="text-xs font-mono">جاري تحميل مؤشرات مبيعات الجملة والتوزيع...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-3" dir="rtl">
        <div className="size-10 rounded-lg bg-destructive/10 text-destructive mx-auto flex items-center justify-center border border-destructive/20">
          <AlertTriangle className="size-5" />
        </div>
        <h2 className="text-sm font-semibold text-foreground font-mono">تعذر تحميل لوحة الجملة</h2>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button size="sm" variant="outline" onClick={() => void loadData()} className="h-8 text-xs font-mono">
          إعادة المحاولة
        </Button>
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
      color: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
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
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Building2 className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              لوحة قيادة البيع بالجملة والتوزيع
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              B2B Commerce Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            متابعة حركة السحب، مديونيات التجار، وقوائم التسعير المخصصة لشركاء التوزيع
          </p>
        </div>

        {/* Quick Nav Links */}
        <div className="flex items-center gap-1.5 flex-wrap font-mono text-xs self-end sm:self-auto">
          <Link
            to="/wholesale/customers"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border/70 bg-card hover:bg-muted/40 text-foreground transition-colors active:scale-[0.98]"
          >
            <Users className="size-3.5 text-primary" />
            <span>التجار</span>
          </Link>
          <Link
            to="/wholesale/price-lists"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border/70 bg-card hover:bg-muted/40 text-foreground transition-colors active:scale-[0.98]"
          >
            <Tag className="size-3.5 text-primary" />
            <span>قوائم الأسعار</span>
          </Link>
          <Link
            to="/wholesale/debts"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border/70 bg-card hover:bg-muted/40 text-foreground transition-colors active:scale-[0.98]"
          >
            <Wallet className="size-3.5 text-primary" />
            <span>أعمار الديون</span>
          </Link>
          <Link
            to="/wholesale/statements"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border/70 bg-card hover:bg-muted/40 text-foreground transition-colors active:scale-[0.98]"
          >
            <FileSpreadsheet className="size-3.5 text-primary" />
            <span>كشوف الحسابات</span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            className="h-8 px-2 text-xs font-mono border-border/70 active:scale-[0.98]"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-card border border-border/70 rounded-lg p-3.5 shadow-xs flex flex-col justify-between space-y-3 hover:border-border/90 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-[11px] text-muted-foreground font-medium">{card.label}</p>
                  <div className="flex items-baseline gap-1.5 font-mono">
                    <span className="text-xl font-bold tracking-tight tabular-nums text-foreground">
                      {card.value}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium">{card.suffix}</span>
                  </div>
                </div>
                <div className={`size-8 rounded-md flex items-center justify-center border ${card.color}`}>
                  <Icon className="size-4" />
                </div>
              </div>

              {card.link && (
                <div className="pt-2 border-t border-border/50">
                  <Link
                    to={card.link}
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-mono"
                  >
                    <span>عرض التفاصيل والتقارير</span>
                    <ArrowUpRight className="size-3 rtl:rotate-90" />
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
