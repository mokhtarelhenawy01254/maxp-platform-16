import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Truck,
  RotateCcw,
  Search,
  Check,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Building2,
  Calendar,
  Layers,
  Banknote,
} from "lucide-react";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import shippingSettlementService, {
  SettlementCompanySummary,
  SettlementOrder,
} from "../../services/shippingSettlementService";
import { SettlementOrdersTable } from "./SettlementOrdersTable";

const SETTLEMENT_STATUS_OPTIONS = [
  { value: "", labelKey: "shippingSettlement.allStatuses", fallback: "كل الحالات" },
  { value: "PENDING", labelKey: "shippingSettlement.pending", fallback: "قيد التسوية" },
  { value: "SETTLED", labelKey: "shippingSettlement.settled", fallback: "تم التسوية" },
];

const SettlementPage: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();

  const [summary, setSummary] = useState<SettlementCompanySummary[]>([]);
  const [orders, setOrders] = useState<SettlementOrder[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  const loadSummary = async () => {
    try {
      setLoadingSummary(true);
      const res = await shippingSettlementService.getSummary();
      setSummary(Array.isArray(res?.data) ? res.data : []);
    } catch (error: any) {
      toast.error(error?.message || "تعذر تحميل ملخص التسويات");
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      const params: Record<string, any> = { page };
      if (selectedCompanyId) params["shippingCompanyId"] = selectedCompanyId;
      if (statusFilter) params["settlementStatus"] = statusFilter;
      if (search) params["search"] = search;
      if (dateFrom) params["startDate"] = dateFrom;
      if (dateTo) params["endDate"] = dateTo;
      const res = await shippingSettlementService.getOrders(params);
      setOrders(Array.isArray(res?.data) ? res.data : []);
      setTotalPages(res?.pagination?.pages || 1);
      setTotalOrders(res?.pagination?.total || 0);
    } catch (error: any) {
      toast.error(error?.message || "تعذر تحميل الشحنات");
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [page, selectedCompanyId, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [selectedCompanyId, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (page !== 1) {
        setPage(1);
      } else {
        loadOrders();
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [search, dateFrom, dateTo]);

  const totalPending = useMemo(
    () => (summary || []).reduce((sum, item) => sum + (item.pendingAmount || 0), 0),
    [summary],
  );
  const totalDelivered = useMemo(
    () => (summary || []).reduce((sum, item) => sum + (item.deliveredShipments || 0), 0),
    [summary],
  );
  const totalSettled = useMemo(
    () => (summary || []).reduce((sum, item) => sum + (item.settledAmount || 0), 0),
    [summary],
  );

  const allSelected = orders.length > 0 && selectedIds.length === orders.length;

  const sourceTypeOf = useMemo(() => {
    const map = new Map<string, string>();
    (orders || []).forEach((o) => map.set(o.id, o.sourceType));
    return map;
  }, [orders]);

  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.length === orders.length ? [] : (orders || []).map((o) => o.id)));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkSettle = async (shippingCompanyId?: string) => {
    if (shippingCompanyId) {
      try {
        setProcessing(true);
        const res = await shippingSettlementService.settle({ shippingCompanyId });
        toast.success(`تمت تسوية ${res.data?.updated || 0} شحنة`);
        setSelectedIds([]);
        await Promise.all([loadSummary(), loadOrders()]);
      } catch (error: any) {
        toast.error(error?.message || "تعذر تنفيذ التسوية");
      } finally {
        setProcessing(false);
      }
      return;
    }

    if (selectedIds.length === 0) {
      toast.error("حدد شحنات للتسوية أولاً");
      return;
    }
    const shipmentIds = selectedIds.filter((id) => sourceTypeOf.get(id) !== "TURBO");
    const turboOrderIds = selectedIds.filter((id) => sourceTypeOf.get(id) === "TURBO");
    try {
      setProcessing(true);
      const res = await shippingSettlementService.settle({ shipmentIds, turboOrderIds });
      toast.success(`تمت تسوية ${res.data?.updated || 0} شحنة`);
      setSelectedIds([]);
      await Promise.all([loadSummary(), loadOrders()]);
    } catch (error: any) {
      toast.error(error?.message || "تعذر تنفيذ التسوية");
    } finally {
      setProcessing(false);
    }
  };

  const handleUnsettle = async (id: string) => {
    try {
      setProcessing(true);
      const isTurbo = sourceTypeOf.get(id) === "TURBO";
      const res = isTurbo
        ? await shippingSettlementService.unsettle([], [id])
        : await shippingSettlementService.unsettle([id]);
      toast.success(`تم التراجع عن تسوية ${res.data?.updated || 0} شحنة`);
      await Promise.all([loadSummary(), loadOrders()]);
    } catch (error: any) {
      toast.error(error?.message || "تعذر التراجع عن التسوية");
    } finally {
      setProcessing(false);
    }
  };

  const getCompanyName = (item: SettlementCompanySummary) =>
    item.company.id === "TURBO" ? t("shippingSettlement.turbo", "Turbo Express") : item.company.name;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Truck className="h-5 w-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {t("shippingSettlement.title", "تسويات شركات الشحن")}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("shippingSettlement.description", "تقفيل حسابات الشحنات المسلّمة مع شركات الشحن")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/shipping/courier-settlements"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-border/70 bg-card hover:bg-muted/30 text-foreground rounded-xl transition shadow-2xs"
          >
            <span>تسويات المناديب والتوصيل الداخلي</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="text-xs text-muted-foreground">{t("shippingSettlement.pendingAmount", "مستحق التحصيل من الشركات")}</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {formatPrice(totalPending)}
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="text-xs text-muted-foreground">{t("shippingSettlement.deliveredCount", "شحنات مسلّمة بانتظار التسوية")}</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-foreground">
            {totalDelivered}
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="text-xs text-muted-foreground">{t("shippingSettlement.settledAmount", "تمت تسويته")}</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatPrice(totalSettled)}
          </div>
        </div>
      </div>

      {/* Company Cards */}
      {loadingSummary ? (
        <div className="p-8 text-center text-xs text-muted-foreground">جاري تحميل الملخص...</div>
      ) : (summary || []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card p-8 text-center text-xs text-muted-foreground">
          {t("shippingSettlement.noCompanies", "لا توجد شركات شحن")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(summary || []).map((item) => (
            <button
              key={item.company.id}
              type="button"
              onClick={() => {
                setSelectedCompanyId((prev) => (prev === item.company.id ? "" : item.company.id));
                setPage(1);
              }}
              className={`rounded-2xl border p-4 text-right transition-all shadow-2xs ${
                selectedCompanyId === item.company.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border/70 bg-card hover:border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs sm:text-sm text-foreground">{getCompanyName(item)}</span>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">
                  {item.deliveredShipments} {t("shippingSettlement.deliveredCount", "مسلّمة")}
                </span>
                <span className="font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                  {formatPrice(item.pendingAmount)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="bg-card p-3 rounded-2xl border border-border/70 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="البحث برقم الطلب، التتبع، أو اسم العميل..."
              className="w-full pr-9 pl-3 py-2 text-xs border border-border/70 rounded-xl bg-muted/20 text-foreground placeholder:text-muted-foreground focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-border/70 rounded-xl bg-muted/20 text-foreground focus:outline-hidden"
            >
              {SETTLEMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.fallback}
                </option>
              ))}
            </select>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => handleBulkSettle()}
                disabled={processing}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs active:scale-[0.97] disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>تسوية المحددة ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      {loadingOrders && (orders || []).length === 0 ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <RotateCcw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (orders || []).length === 0 ? (
        <div className="bg-card border border-border/70 rounded-2xl p-12 text-center shadow-2xs">
          <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground mx-auto mb-3 border border-border/60">
            <Truck className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground mb-1">لا توجد شحنات مطابقة</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            لم يتم العثور على أي شحنات بانتظار التسوية بحسب الفلاتر المحددة.
          </p>
        </div>
      ) : (
        <SettlementOrdersTable
          orders={orders}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          allSelected={allSelected}
          formatPrice={formatPrice}
          formatDate={formatDate}
          onUnsettle={handleUnsettle}
          processing={processing}
          totalPages={totalPages}
          page={page}
          setPage={setPage}
        />
      )}
    </div>
  );
};

export default SettlementPage;
