import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../services/apiClient";
import {
  TrendingUp,
  RefreshCw,
  Search,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { cn } from "../../lib/utils";

export interface BillingActivityRecord {
  id: string;
  referenceId?: string;
  companyId?: string;
  companyName?: string;
  company?: {
    id: string;
    name: string;
    email?: string;
    slug?: string;
  };
  type: string;
  amount: number;
  currency?: string;
  status: string;
  description?: string;
  createdAt: string;
}

interface SummaryData {
  today: { amount: number; count: number };
  thisMonth: { amount: number; count: number };
  totalCount: number;
}

const PERIOD_OPTIONS = [
  { id: "today", label: "اليوم" },
  { id: "week", label: "الأسبوع" },
  { id: "month", label: "الشهر" },
  { id: "all", label: "الكل" },
] as const;

type PeriodType = (typeof PERIOD_OPTIONS)[number]["id"];

const TYPE_OPTIONS = [
  { value: "ALL", label: "كل الأنواع" },
  { value: "PLATFORM_FEE", label: "رسوم المنصة (PLATFORM_FEE)" },
  { value: "APP_SUBSCRIPTION", label: "اشتراكات التطبيقات (APP_SUBSCRIPTION)" },
  { value: "APP_USAGE", label: "استهلاك الموارد (APP_USAGE)" },
  { value: "WALLET_RECHARGE", label: "شحن رصيد المحفظة" },
  { value: "OTHER", label: "أخرى" },
];

export const BillingActivity: React.FC = () => {
  const [items, setItems] = useState<BillingActivityRecord[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    today: { amount: 0, count: 0 },
    thisMonth: { amount: 0, count: 0 },
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>("all");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {};
      if (period !== "all") params.period = period;
      if (selectedType !== "ALL") params.type = selectedType;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await apiClient.get("/super-admin/billing/activity", { params });
      const resData = response.data;

      // Extract list items defensively
      let rawList: BillingActivityRecord[] = [];
      if (Array.isArray(resData?.data?.items)) {
        rawList = resData.data.items;
      } else if (Array.isArray(resData?.items)) {
        rawList = resData.items;
      } else if (Array.isArray(resData?.data)) {
        rawList = resData.data;
      } else if (Array.isArray(resData)) {
        rawList = resData;
      }
      setItems(rawList);

      const sum = resData?.data?.summary || resData?.summary;
      if (sum) {
        setSummary({
          today: { amount: sum.today?.amount ?? sum.today?.total ?? 0, count: sum.today?.count ?? 0 },
          thisMonth: { amount: sum.thisMonth?.amount ?? sum.thisMonth?.total ?? 0, count: sum.thisMonth?.count ?? 0 },
          totalCount: sum.allTime?.count ?? rawList.length,
        });
      }
    } catch (error) {
      console.error("Failed to load billing activity:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [period, selectedType, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchData();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const getTypeBadge = (type: string) => {
    const t = type?.toUpperCase() || "";
    if (t === "PLATFORM_FEE") return <Badge variant="outline" className="text-[11px] font-mono border-blue-500/30 text-blue-600 bg-blue-500/10">رسوم المنصة</Badge>;
    if (t === "APP_SUBSCRIPTION") return <Badge variant="outline" className="text-[11px] font-mono border-indigo-500/30 text-indigo-600 bg-indigo-500/10">اشتراك تطبيق</Badge>;
    if (t === "APP_USAGE") return <Badge variant="outline" className="text-[11px] font-mono border-amber-500/30 text-amber-600 bg-amber-500/10">استهلاك موارد</Badge>;
    if (t === "WALLET_RECHARGE") return <Badge variant="outline" className="text-[11px] font-mono border-emerald-500/30 text-emerald-600 bg-emerald-500/10">شحن رصيد</Badge>;
    return <Badge variant="outline" className="text-[11px] font-mono border-border text-muted-foreground">{type || "أخرى"}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase() || "";
    if (s === "SUCCESS" || s === "PAID" || s === "COMPLETED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
          <CheckCircle2 className="size-3" /> مكتملة
        </span>
      );
    }
    if (s === "PENDING" || s === "PROCESSING") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
          <Clock className="size-3" /> قيد المعالجة
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10">
        <AlertCircle className="size-3" /> {status || "فشلت"}
      </span>
    );
  };

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0 shadow-2xs">
            <TrendingUp className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                الحركة المالية المركزية للمنصة
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border border-border/80 bg-muted/30">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {items.length} حركة مسجلة
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              متابعة وتحصيل اشتراكات التطبيقات ورسوم المنصة واستهلاك الموارد لحظياً
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform self-end sm:self-auto"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin text-primary")} />
          <span>تحديث</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 rounded-xl border border-border/80 bg-card divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">تحصيل اليوم</span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {summary.today.amount.toLocaleString()}{" "}
            <span className="text-xs font-normal text-muted-foreground">ج.م</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
            {summary.today.count} حركة دفع اليوم
          </p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">تحصيل هذا الشهر</span>
            <span className="size-1.5 rounded-full bg-blue-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {summary.thisMonth.amount.toLocaleString()}{" "}
            <span className="text-xs font-normal text-muted-foreground">ج.م</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
            {summary.thisMonth.count} حركة خلال الشهر
          </p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">إجمالي الحركات</span>
            <span className="size-1.5 rounded-full bg-purple-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {summary.totalCount.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">سجل التدقيق المالي الشامل</p>
        </div>
      </div>

      {/* Single Surface Table Chassis */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        {/* Filters bar */}
        <div className="p-2.5 sm:p-3 border-b border-border/60 bg-muted/20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Period chips */}
            <div className="inline-flex items-center p-0.5 rounded-lg border border-border/80 bg-background">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPeriod(opt.id)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                    period === opt.id
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Type selector */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-lg border border-border/80 bg-background text-foreground font-mono"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="h-8 pr-8 text-xs font-mono bg-background border-border/70"
              placeholder="بحث بالشركة أو المرجع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/60 bg-muted/10">
                <TableHead className="font-mono text-xs text-right">المرجع</TableHead>
                <TableHead className="font-mono text-xs text-right">الشركة / العميل</TableHead>
                <TableHead className="font-mono text-xs text-right">نوع الحركة</TableHead>
                <TableHead className="font-mono text-xs text-right">المبلغ</TableHead>
                <TableHead className="font-mono text-xs text-right">الحالة</TableHead>
                <TableHead className="font-mono text-xs text-right">البيان / الوصف</TableHead>
                <TableHead className="font-mono text-xs text-right">التاريخ والوقت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <LoadingSpinner size="sm" />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                      <CreditCard className="size-7 text-muted-foreground/50" />
                      <p className="text-xs font-semibold text-foreground">لا توجد حركات مالية مطابقة</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        لم يتم تسجيل أي عمليات تحصيل أو خصم ضمن الفلاتر المحددة
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-b border-border/50 hover:bg-muted/15 transition-colors"
                  >
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border/50">
                        #{row.referenceId || row.id.substring(0, 8)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {row.company?.name || row.companyName || "منصة MaxP"}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground truncate">
                          {row.company?.email || row.companyId || "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(row.type)}</TableCell>
                    <TableCell>
                      <span className="text-xs font-bold font-mono tabular-nums text-foreground">
                        {Number(row.amount || 0).toLocaleString()}{" "}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          {row.currency || "EGP"}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground max-w-xs truncate" title={row.description}>
                        {row.description || "—"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-[11px] font-mono tabular-nums text-muted-foreground">
                        <span>{new Date(row.createdAt).toLocaleDateString("ar-EG")}</span>
                        <span className="text-[10px] text-muted-foreground/70">
                          {new Date(row.createdAt).toLocaleTimeString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default BillingActivity;
