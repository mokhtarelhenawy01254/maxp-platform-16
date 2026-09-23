import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  TruckIcon,
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import shippingSettlementService, {
  SettlementCompanySummary,
  SettlementOrder
} from "../../services/shippingSettlementService";

const SETTLEMENT_STATUS_OPTIONS = [
  { value: "", labelKey: "shippingSettlement.allStatuses", fallback: "كل الحالات" },
  { value: "PENDING", labelKey: "shippingSettlement.pending", fallback: "قيد التسوية" },
  { value: "SETTLED", labelKey: "shippingSettlement.settled", fallback: "تم التسوية" }
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
      setSummary(Array.isArray(res.data) ? res.data : []);
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
      if (selectedCompanyId) params['shippingCompanyId'] = selectedCompanyId;
      if (statusFilter) params['settlementStatus'] = statusFilter;
      if (search) params['search'] = search;
      if (dateFrom) params['startDate'] = dateFrom;
      if (dateTo) params['endDate'] = dateTo;
      const res = await shippingSettlementService.getOrders(params);
      setOrders(Array.isArray(res.data) ? res.data : []);
      setTotalPages(res.pagination?.pages || 1);
      setTotalOrders(res.pagination?.total || 0);
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
    () => summary.reduce((sum, item) => sum + item.pendingAmount, 0),
    [summary]
  );
  const totalDelivered = useMemo(
    () => summary.reduce((sum, item) => sum + item.deliveredShipments, 0),
    [summary]
  );
  const totalSettled = useMemo(
    () => summary.reduce((sum, item) => sum + item.settledAmount, 0),
    [summary]
  );

  const allSelected = orders.length > 0 && selectedIds.length === orders.length;

  const sourceTypeOf = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => map.set(o.id, o.sourceType));
    return map;
  }, [orders]);

  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.length === orders.length ? [] : orders.map((o) => o.id)));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkSettle = async (shippingCompanyId?: string) => {
    if (shippingCompanyId) {
      try {
        setProcessing(true);
        const res = await shippingSettlementService.settle({ shippingCompanyId });
        toast.success(`تمت تسوية ${res.data.updated} شحنة`);
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
      toast.success(`تمت تسوية ${res.data.updated} شحنة`);
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
      toast.success(`تم التراجع عن تسوية ${res.data.updated} شحنة`);
      await Promise.all([loadSummary(), loadOrders()]);
    } catch (error: any) {
      toast.error(error?.message || "تعذر التراجع عن التسوية");
    } finally {
      setProcessing(false);
    }
  };

  const selectedCompany = summary.find((item) => item.company.id === selectedCompanyId);

  const getCompanyName = (item: SettlementCompanySummary) =>
    item.company.id === "TURBO" ? t("shippingSettlement.turbo", "Turbo Express") : item.company.name;

  const getStatusBadge = (order: SettlementOrder) => {
    if (order.settlementStatus === "SETTLED") {
      return <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700 dark:bg-green-900/25 dark:text-green-300">{t("shippingSettlement.settled", "تم التسوية")}</span>;
    }
    if (!order.delivered) {
      return <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">{t("shippingSettlement.notDelivered", "غير مسلّم")}</span>;
    }
    return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/25 dark:text-amber-300">{t("shippingSettlement.pending", "قيد التسوية")}</span>;
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("shippingSettlement.title", "تسويات شركات الشحن")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("shippingSettlement.description", "تقفيل حسابات الشحنات المسلّمة مع شركات الشحن")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/shipping/courier-settlements"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            تسويات المناديب والتوصيل الداخلي ←
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">{t("shippingSettlement.pendingAmount", "مستحق التحصيل من الشركات")}</div>
          <div className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">{formatPrice(totalPending)}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">{t("shippingSettlement.deliveredCount", "شحنات مسلّمة بانتظار التسوية")}</div>
          <div className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{totalDelivered}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">{t("shippingSettlement.settledAmount", "تمت تسويته")}</div>
          <div className="mt-1 text-2xl font-black text-green-600 dark:text-green-400">{formatPrice(totalSettled)}</div>
        </div>
      </div>

      {loadingSummary ? (
        <div className="p-6 text-center text-sm text-gray-500">جاري التحميل...</div>
      ) : summary.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">
          {t("shippingSettlement.noCompanies", "لا توجد شركات شحن")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {summary.map((item) => (
            <button
              key={item.company.id}
              onClick={() => {
                setSelectedCompanyId((prev) => (prev === item.company.id ? "" : item.company.id));
                setPage(1);
              }}
              className={`rounded-2xl border p-4 text-right transition-colors ${
                selectedCompanyId === item.company.id
                  ? "border-indigo-400 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/20"
                  : "border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 hover:border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 dark:text-white">{getCompanyName(item)}</span>
                <TruckIcon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>{item.deliveredShipments} {t("shippingSettlement.deliveredCount", "مسلّمة")}</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{formatPrice(item.pendingAmount)}</span>
              </div>
              {item.deliveredShipments > 0 && (
                <div className="mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBulkSettle(item.company.id);
                    }}
                    disabled={processing}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {t("shippingSettlement.settleCompany", "تسوية الكل")}
                  </button>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={String(t("shippingSettlement.search", "ابحث برقم الطلب أو التتبع أو العميل..."))}
              className="min-h-[42px] w-full rounded-xl border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm dark:border-gray-600 dark:bg-gray-900"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
            >
              {SETTLEMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey, opt.fallback)}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
            />
          </div>
        </div>

        {selectedCompany && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-sm dark:border-indigo-900/60 dark:bg-indigo-950/20">
            <span className="font-bold text-indigo-700 dark:text-indigo-300">
              {getCompanyName(selectedCompany)}
            </span>
            <button
              onClick={() => setSelectedCompanyId("")}
              className="text-xs text-indigo-600 hover:underline"
            >
              {t("shippingSettlement.clearCompany", "إزالة الفلتر")}
            </button>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                checked={allSelected}
                onChange={toggleSelectAll}
              />
              {t("shippingSettlement.selectAll", "تحديد الكل")}
            </label>
            <span className="text-xs text-gray-500">{selectedIds.length}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkSettle()}
              disabled={processing || selectedIds.length === 0}
              className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              <BanknotesIcon className="ml-1 inline h-4 w-4" />
              {t("shippingSettlement.settleSelected", "تسوية المحدد")}
            </button>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          {loadingOrders ? (
            <div className="p-6 text-center text-sm text-gray-500">جاري التحميل...</div>
          ) : orders.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              {t("shippingSettlement.noOrders", "لا توجد شحنات")}
            </div>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-right text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="py-2 pl-3" />
                  <th className="py-2">{t("shippingSettlement.order", "الطلب")}</th>
                  <th className="py-2">{t("shippingSettlement.customer", "العميل")}</th>
                  <th className="py-2">{t("shippingSettlement.tracking", "التتبع")}</th>
                  <th className="py-2">{t("shippingSettlement.date", "التاريخ")}</th>
                  <th className="py-2">{t("shippingSettlement.amount", "المبلغ")}</th>
                  <th className="py-2">{t("shippingSettlement.status", "الحالة")}</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 text-gray-700 dark:border-gray-800 dark:text-gray-200">
                    <td className="py-2 pl-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                        checked={selectedIds.includes(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        disabled={!order.delivered || order.settlementStatus === "SETTLED"}
                      />
                    </td>
                    <td className="py-2 font-bold">{order.order?.orderNumber || "—"}</td>
                    <td className="py-2">{order.order?.customerName || "—"}</td>
                    <td className="py-2 text-xs text-gray-500">{order.trackingNumber || order.externalShipmentId || "—"}</td>
                    <td className="py-2 text-xs text-gray-500">{formatDate(order.createdAt)}</td>
                    <td className="py-2 font-semibold">{order.order ? formatPrice(order.order.total) : formatPrice(order.cost)}</td>
                    <td className="py-2">{getStatusBadge(order)}</td>
                    <td className="py-2 text-left">
                      {order.settlementStatus === "SETTLED" && (
                        <button
                          onClick={() => handleUnsettle(order.id)}
                          disabled={processing}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                        >
                          <ArrowPathIcon className="h-3.5 w-3.5" />
                          {t("shippingSettlement.unsettle", "تراجع")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>{t("shippingSettlement.showing", { count: orders.length, total: totalOrders })}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="rounded-lg border px-3 py-1 disabled:opacity-50"
              >
                {t("shippingSettlement.previous", "السابق")}
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="rounded-lg border px-3 py-1 disabled:opacity-50"
              >
                {t("shippingSettlement.next", "التالي")}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white p-3 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800">
        <CheckCircleIcon className="h-4 w-4 text-green-500" />
        {t("shippingSettlement.hint", "التسوية تشمل الشحنات المرتبطة بطلبات بحالة DELIVERED فقط")}
        <XCircleIcon className="h-4 w-4 text-gray-400" />
      </div>
    </div>
  );
};

export default SettlementPage;
