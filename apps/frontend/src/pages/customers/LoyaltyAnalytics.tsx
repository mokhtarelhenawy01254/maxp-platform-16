import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import {
  TrendingUp,
  Star,
  Target,
  Award,
  DollarSign,
  Gift,
  RefreshCw,
  Users,
  BadgePercent,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Layers,
  Coins
} from "lucide-react";

interface CustomerLoyaltyProgram {
  id: string;
  name: string;
  nameAr?: string;
  type: string;
  customersCount: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
}

const LoyaltyAnalytics: React.FC = () => {
  const [stats, setStats] = useState<{ totalCashback: number } | null>(null);
  const [programs, setPrograms] = useState<CustomerLoyaltyProgram[]>([]);
  const [systemAnalytics, setSystemAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [programsRes, statsRes, systemRes] = await Promise.all([
        apiClient.get("/hr/customer-loyalty/programs"),
        apiClient.get("/wallet/stats"),
        apiClient.get("/hr/customer-loyalty/system-analytics"),
      ]);

      setPrograms(programsRes.data.data || []);
      setStats(statsRes.data.data || null);
      setSystemAnalytics((systemRes.data?.data as any) || null);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgramIcon = (type: string) => {
    switch (type) {
      case "POINTS":
        return <Star className="w-4 h-4 text-amber-500" />;
      case "TIER":
        return <Award className="w-4 h-4 text-primary" />;
      case "CASHBACK":
        return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case "REFERRAL":
        return <Users className="w-4 h-4 text-blue-500" />;
      default:
        return <Gift className="w-4 h-4 text-primary" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-muted-foreground gap-3" dir="rtl">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">جارِ تحميل تحليلات برامج الولاء والمكافآت...</span>
      </div>
    );
  }

  const totalIssued = programs.reduce((sum, p) => sum + Number(p.totalPointsIssued || 0), 0);
  const totalRedeemed = programs.reduce((sum, p) => sum + Number(p.totalPointsRedeemed || 0), 0);
  const totalCustomers = programs.reduce((sum, p) => sum + Number(p.customersCount || 0), 0);

  const avgPoints = totalCustomers > 0 ? Math.round((totalIssued - totalRedeemed) / totalCustomers) : 0;
  const redemptionRate = totalIssued > 0 ? Math.round((totalRedeemed / totalIssued) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/customers/loyalty-programs"
              className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-foreground">تحليلات برامج الولاء</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                مؤشرات تفاعل العملاء، النقاط المصدرة والمستبدلة، وعوائد الكاش باك
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-xs font-semibold text-foreground transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            <span>تحديث المؤشرات</span>
          </button>
        </div>
      </div>

      {/* Primary Telemetry Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-card border border-border/70 rounded-xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">العملاء المشتركين</span>
            <Users className="w-4 h-4 text-primary/70" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
            {totalCustomers.toLocaleString("ar-EG")}
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">متوسط رصيد النقاط</span>
            <Star className="w-4 h-4 text-amber-500/70" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
            {avgPoints.toLocaleString("ar-EG")}
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">نسبة الاستبدال</span>
            <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {redemptionRate}%
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
            {redemptionRate}%
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">إجمالي الكاش باك المسترد</span>
            <DollarSign className="w-4 h-4 text-emerald-500/70" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
            {stats?.totalCashback ? stats.totalCashback.toLocaleString("ar-EG") : "0"} <span className="text-xs font-normal text-muted-foreground">ج.م</span>
          </div>
        </div>
      </div>

      {/* Auto-Discount System Analytics Banner */}
      {systemAnalytics?.system === "AUTO_DISCOUNT" && (
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <BadgePercent className="w-4 h-4 text-primary" />
              <span>تحليل نظام الخصم والكوبونات التلقائية</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              Auto-Voucher Engine
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "عملاء لديهم كوبون", value: systemAnalytics.appliedCustomers ?? 0 },
              { label: "كوبونات متاحة", value: systemAnalytics.activeVouchers ?? 0 },
              { label: "كوبونات مستخدمة", value: systemAnalytics.usedVouchers ?? 0 },
              { label: "حُوِّلت لكاش باك", value: systemAnalytics.convertedVouchers ?? 0 },
              { label: "كوبونات منتهية", value: systemAnalytics.expiredVouchers ?? 0 },
              { label: "طلبات بانتظار الكوبون", value: systemAnalytics.waitingForDelivery ?? 0 },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1"
              >
                <span className="text-xl font-bold font-mono tabular-nums text-foreground block">
                  {Number(item.value || 0).toLocaleString("ar-EG")}
                </span>
                <span className="text-[11px] text-muted-foreground block truncate">{item.label}</span>
              </div>
            ))}
          </div>

          {Number(systemAnalytics.preActivationCustomers || 0) > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                يوجد {systemAnalytics.preActivationCustomers} عميل لديهم طلبات استلمت قبل تفعيل النظام — لا يتاح لهم كوبون خصم تلقائي.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Program Performance & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Programs Breakdown */}
        <div className="lg:col-span-2 bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Layers className="w-4 h-4 text-primary" />
              <span>أداء البرامج التفصيلي ({programs.length})</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              النقاط المصدرة ونسب الاستبدال
            </span>
          </div>

          <div className="space-y-2.5">
            {programs.map((program) => {
              const issued = Number(program.totalPointsIssued || 0);
              const redeemed = Number(program.totalPointsRedeemed || 0);
              const pct = issued > 0 ? Math.min(100, Math.round((redeemed / issued) * 100)) : 0;

              return (
                <div
                  key={program.id}
                  className="flex items-center justify-between p-3.5 rounded-lg border border-border/60 bg-muted/10 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-background border border-border/60 shrink-0">
                      {getProgramIcon(program.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-foreground truncate">
                        {program.nameAr || program.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {program.customersCount} عميل نشط
                      </p>
                    </div>
                  </div>

                  <div className="text-left rtl:text-right shrink-0">
                    <p className="font-bold font-mono tabular-nums text-xs text-foreground">
                      {issued.toLocaleString("ar-EG")}{" "}
                      <span className="text-[10px] font-normal text-muted-foreground">نقطة</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-20 bg-muted/60 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-1.5 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Recommendations Card */}
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground border-b border-border/40 pb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>تحليلات النمو والتوصيات</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              معدل استبدال النقاط الإجمالي يسجل {redemptionRate}% وهو مؤشر {redemptionRate >= 50 ? 'إيجابي جداً يعكس ارتباط العملاء المباشر ببرامج المكافآت' : 'يحتاج إلى تحفيز عبر طرح مكافآت جذابة سريعة الاستبدال'}.
            </p>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-foreground space-y-1">
              <span className="font-bold block text-primary text-[11px]">توصية المنظومة:</span>
              <p className="text-[11px] text-muted-foreground leading-normal">
                تفعيل شريحة كبار العملاء التراكمية عند تجاوز 5000 نقطة لتشجيع تكرار عمليات الشراء.
              </p>
            </div>
          </div>

          <Link
            to="/customers/loyalty-programs"
            className="w-full text-center py-2 px-3 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/40 text-xs font-semibold text-foreground transition-colors block mt-2"
          >
            إدارة قواعد البرامج
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyAnalytics;
