import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Link as LinkIcon,
  Users,
  RefreshCw,
  Search,
  ShoppingBag,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

interface ReferralCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface ReferralOrder {
  id: string;
  orderNumber: string;
  total: number;
}

interface Referral {
  id: string;
  referralCode: string;
  source?: string | null;
  converted: boolean;
  convertedAt?: string | null;
  createdAt: string;
  customer?: ReferralCustomer | null;
  order?: ReferralOrder | null;
}

export default function AffiliateReferrals() {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const loadReferrals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/affiliates/referrals");
      const raw = response.data?.data ?? response.data;
      const list = Array.isArray(raw) ? raw : [];
      setReferrals(list);
    } catch (err: any) {
      setError(err?.response?.data?.message || "حدث خطأ أثناء تحميل سجل الإحالات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReferrals();
  }, [loadReferrals]);

  const safeReferrals = useMemo(() => (Array.isArray(referrals) ? referrals : []), [referrals]);

  const filteredReferrals = useMemo(() => {
    return safeReferrals.filter((r) => {
      const q = search.toLowerCase();
      const customerName = r.customer
        ? `${r.customer.firstName} ${r.customer.lastName}`.toLowerCase()
        : "";
      const matchesSearch =
        !q ||
        r.referralCode.toLowerCase().includes(q) ||
        customerName.includes(q) ||
        (r.source && r.source.toLowerCase().includes(q)) ||
        (r.order?.orderNumber && r.order.orderNumber.toLowerCase().includes(q));

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "converted" && r.converted) ||
        (filterStatus === "pending" && !r.converted);

      return matchesSearch && matchesStatus;
    });
  }, [safeReferrals, search, filterStatus]);

  const totalReferrals = safeReferrals.length;
  const convertedReferrals = useMemo(
    () => safeReferrals.filter((r) => r.converted).length,
    [safeReferrals]
  );
  const pendingReferrals = totalReferrals - convertedReferrals;

  const totalRevenue = useMemo(
    () => safeReferrals.reduce((sum, r) => sum + Number(r.order?.total || 0), 0),
    [safeReferrals]
  );

  const conversionRate =
    totalReferrals > 0 ? Number(((convertedReferrals / totalReferrals) * 100).toFixed(1)) : 0;

  if (loading && safeReferrals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-2.5 text-muted-foreground">
        <RefreshCw className="size-5 animate-spin text-primary" />
        <span className="text-xs font-mono">جاري تحميل سجل الإحالات والتحويلات...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <TrendingUp className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              سجل الإحالات والتحويلات
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              {totalReferrals} إحالة مسجلة
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            متابعة مسار الروابط الإعلانية ومعدلات التحويل إلى طلبات بيع فعلية
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadReferrals()}
            className="h-8 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98]"
          >
            <RefreshCw className="size-3.5" />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono">
        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">إجمالي الإحالات</p>
            <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">
              {totalReferrals}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">نقرات وزيارات مسجلة</p>
          </div>
          <div className="size-7 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
            <LinkIcon className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-500">الإحالات المحولة</p>
            <p className="text-xl font-bold tracking-tight text-emerald-500 font-mono tabular-nums mt-0.5">
              {convertedReferrals}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">أنتجت طلبات بيع</p>
          </div>
          <div className="size-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-amber-500">قيد المتابعة</p>
            <p className="text-xl font-bold tracking-tight text-amber-500 font-mono tabular-nums mt-0.5">
              {pendingReferrals}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">زيارات لم تكمل الشراء</p>
          </div>
          <div className="size-7 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
            <Clock className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-500">معدل التحويل (CR)</p>
            <p className="text-xl font-bold tracking-tight text-purple-500 font-mono tabular-nums mt-0.5">
              {conversionRate}%
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
              مبيعات: {formatPrice(totalRevenue)}
            </p>
          </div>
          <div className="size-7 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
            <TrendingUp className="size-3.5" />
          </div>
        </div>
      </div>

      {/* Main Single-Surface Chassis */}
      <div className="rounded-lg border border-border/70 bg-card shadow-xs overflow-hidden">
        {/* Controls Bar */}
        <div className="p-2.5 sm:p-3 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              className="h-8 pr-8 text-xs font-mono bg-background border-border/70"
              placeholder="بحث بالرمز أو العميل أو المصدر..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 font-mono text-xs">
            {[
              { id: "all", label: `الكل (${safeReferrals.length})` },
              { id: "converted", label: `تم التحويل (${convertedReferrals})` },
              { id: "pending", label: `قيد المتابعة (${pendingReferrals})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  filterStatus === tab.id
                    ? "bg-card text-foreground font-semibold shadow-xs border border-border/70"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {filteredReferrals.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <div className="size-9 rounded-full bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center">
              <Users className="size-4" />
            </div>
            <h3 className="text-xs font-semibold text-foreground font-mono">لا توجد إحالات تطابق البحث</h3>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              شارك روابط الإحالة في حملاتك التسويقية لتسجيل حركات الزيارة والطلبات
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground font-mono text-[11px]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">رمز الإحالة</th>
                  <th className="px-4 py-2.5 font-medium">العميل المنسوب</th>
                  <th className="px-4 py-2.5 font-medium">المصدر التسويقي</th>
                  <th className="px-4 py-2.5 font-medium">الطلب الناتج</th>
                  <th className="px-4 py-2.5 font-medium text-center">الحالة</th>
                  <th className="px-4 py-2.5 font-medium">تاريخ الإنشاء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredReferrals.map((referral) => {
                  const customerName = referral.customer
                    ? `${referral.customer.firstName} ${referral.customer.lastName}`.trim()
                    : "—";

                  return (
                    <tr key={referral.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-foreground font-semibold">
                        <div className="flex items-center gap-1.5">
                          <LinkIcon className="size-3 text-primary shrink-0" />
                          <span>{referral.referralCode}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-foreground">
                        <div>
                          <p className="font-medium">{customerName}</p>
                          {referral.customer?.phone && (
                            <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">
                              {referral.customer.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground text-[11px]">
                        {referral.source || "مباشر"}
                      </td>
                      <td className="px-4 py-2.5 font-mono">
                        {referral.order ? (
                          <div className="flex items-center gap-1.5">
                            <ShoppingBag className="size-3 text-emerald-500 shrink-0" />
                            <span className="font-semibold text-foreground">
                              {referral.order.orderNumber}
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                              ({formatPrice(referral.order.total)})
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${
                            referral.converted
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }`}
                        >
                          {referral.converted ? "تم التحويل" : "قيد المتابعة"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground text-[11px]">
                        {new Date(referral.createdAt).toLocaleDateString("ar-EG")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
