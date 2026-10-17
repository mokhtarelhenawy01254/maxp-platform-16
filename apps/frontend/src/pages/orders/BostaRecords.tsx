import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Search,
  Truck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Package,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { useTranslation } from "react-i18next";

interface BostaOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: string;
  trackingNumber?: string;
  createdAt: string;
}

export const BostaRecords: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<BostaOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);

  useEffect(() => {
    fetchOrders();
  }, [page]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/orders-new/simple", {
        params: { page: page.toString(), limit: "20", search: searchQuery },
      });
      if (res.data.success) {
        const fetched = res.data.data || [];
        setOrders(fetched);
        setTotalOrders(res.data.pagination?.total || fetched.length);
      }
    } catch {
      toast.error(t("orders.failedToLoadOrdersShort"));
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    setSelectedOrders(
      selectedOrders.length === orders.length ? [] : orders.map((o) => o.id),
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-background">
      {/* 1. Header & Search Command Strip */}
      <header className="h-auto min-h-12 border-b border-border/70 px-3 sm:px-4 py-2 sm:py-0 bg-card/95 backdrop-blur-md flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3 shrink-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <Truck className="h-4 w-4 text-primary shrink-0" />
          <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">
            {t("orders.bostaRecordsTitle")}
          </h1>
          <span className="hidden md:inline-block text-[10px] text-muted-foreground font-mono">
            Bosta Shipments
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={String(t("orders.bostaRecordsSearchPlaceholder"))}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
              className="h-8 w-full rounded-md border border-border/70 bg-background/80 pr-8 pl-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/5 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={fetchOrders}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border/70 bg-card px-2.5 text-xs font-semibold text-foreground hover:bg-muted transition active:scale-[0.97]"
          >
            {t("orders.search")}
          </button>
          <button
            type="button"
            onClick={fetchOrders}
            disabled={loading}
            aria-label={String(t("common.refresh", { defaultValue: "تحديث" }))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-card text-foreground hover:bg-muted transition active:scale-[0.97] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* 2. Main Table Chassis */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-background p-2 sm:p-4">
        <div className="rounded-xl border border-border/70 bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/60 text-right" dir="rtl">
              <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 sm:px-4 py-2.5 text-right w-10">
                    <input
                      type="checkbox"
                      aria-label="تحديد كل الطلبات"
                      className="rounded border-border/80 text-primary focus:ring-primary h-3.5 w-3.5"
                      checked={orders.length > 0 && selectedOrders.length === orders.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-3 sm:px-4 py-2.5 text-right">{t("orders.orderLabel")}</th>
                  <th className="px-3 sm:px-4 py-2.5 text-right">{t("orders.customer")}</th>
                  <th className="px-3 sm:px-4 py-2.5 text-right">{t("orders.total")}</th>
                  <th className="px-3 sm:px-4 py-2.5 text-right">{t("orders.trackingNumber")}</th>
                  <th className="px-3 sm:px-4 py-2.5 text-right">{t("orders.orderStatus")}</th>
                  <th className="px-3 sm:px-4 py-2.5 text-right">{t("orders.date")}</th>
                  <th className="px-3 sm:px-4 py-2.5 text-center">{t("orders.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="flex justify-center mb-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                      </div>
                      <span>{t("orders.loadingOrders")}</span>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <span>{t("orders.noOrders")}</span>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap">
                        <input
                          type="checkbox"
                          aria-label={`تحديد الطلب ${order.orderNumber || order.id}`}
                          className="rounded border-border/80 text-primary focus:ring-primary h-3.5 w-3.5"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => toggleSelection(order.id)}
                        />
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap">
                        <Link
                          to={`/orders/${encodeURIComponent(String(order.id))}`}
                          className="font-mono font-semibold text-primary hover:underline tabular-nums"
                        >
                          #{order.orderNumber || order.id.substring(0, 8)}
                        </Link>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5">
                        <div className="font-medium text-foreground">{order.customerName}</div>
                        <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
                          {order.customerPhone}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap font-mono font-medium text-foreground tabular-nums">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap">
                        {order.trackingNumber ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono bg-muted text-foreground border border-border/60 tabular-nums">
                            {order.trackingNumber}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted/60 text-foreground border border-border/50">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap text-muted-foreground font-mono text-[11px] tabular-nums">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap text-center">
                        <Link
                          to={`/orders/${encodeURIComponent(String(order.id))}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-semibold"
                        >
                          <span>{t("orders.view")}</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Pagination Strip */}
          <div className="px-3 sm:px-4 py-2.5 border-t border-border/70 flex items-center justify-between text-xs bg-card">
            <div className="text-muted-foreground">
              {t("orders.totalOrders")}:{" "}
              <span className="font-mono font-bold text-foreground tabular-nums">
                {totalOrders}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => p - 1);
                  setSearchParams({ page: String(page - 1) });
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 border border-border/70 rounded-md text-foreground hover:bg-muted disabled:opacity-40 transition"
              >
                <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                <span>{t("orders.previous")}</span>
              </button>
              <span className="px-2 font-mono tabular-nums text-muted-foreground">
                {page}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPage((p) => p + 1);
                  setSearchParams({ page: String(page + 1) });
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 border border-border/70 rounded-md text-foreground hover:bg-muted disabled:opacity-40 transition"
              >
                <span>{t("orders.next")}</span>
                <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BostaRecords;
