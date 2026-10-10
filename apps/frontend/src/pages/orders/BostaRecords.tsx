import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { MagnifyingGlassIcon, TruckIcon } from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { useDateFormat } from "../../hooks/useDateFormat";
import { useTranslation } from "react-i18next";

interface BostaOrder {
  id: string; orderNumber: string; customerName: string; customerPhone: string;
  total: number; status: string; trackingNumber?: string; createdAt: string;
}

const BostaRecords: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<BostaOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const totalPages = 1;
  const [totalOrders, setTotalOrders] = useState(0);

  useEffect(() => { fetchOrders(); }, [page]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/orders-new/simple", { params: { page: page.toString(), limit: "20", search: searchQuery } });
      if (res.data.success) {
        let fetched = res.data.data || [];
        setOrders(fetched);
        setTotalOrders(res.data.pagination?.total || fetched.length);
      }
    } catch { toast.error(t("orders.failedToLoadOrdersShort")); }
    finally { setLoading(false); }
  };

  const toggleSelection = (id: string) => setSelectedOrders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelectedOrders(selectedOrders.length === orders.length ? [] : orders.map(o => o.id));

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TruckIcon className="h-6 w-6 text-indigo-600" /> {t("orders.bostaRecordsTitle")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t("orders.bostaRecordsSubtitle")}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex items-center gap-2 w-full md:w-96">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" placeholder={t("orders.bostaRecordsSearchPlaceholder")} value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
              className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <button onClick={() => fetchOrders()} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm">{t("orders.search")}</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-right" dir="rtl">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase w-10">
                  <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    checked={orders.length > 0 && selectedOrders.length === orders.length} onChange={toggleAll} />
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t("orders.orderLabel")}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t("orders.customer")}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t("orders.total")}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t("orders.trackingNumber")}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t("orders.orderStatus")}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t("orders.date")}</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t("orders.actions")}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500"><div className="flex justify-center mb-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>{t("orders.loadingOrders")}</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500">{t("orders.noOrders")}</td></tr>
              ) : orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap"><input type="checkbox"
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    checked={selectedOrders.includes(order.id)} onChange={() => toggleSelection(order.id)} /></td>
                  <td className="px-6 py-4 whitespace-nowrap"><Link to={`/orders/${encodeURIComponent(String(order.id))}`}
                    className="text-indigo-600 hover:text-indigo-900 font-medium">#{order.orderNumber || order.id.substring(0, 8)}</Link></td>
                  <td className="px-6 py-4"><div className="text-sm font-medium text-gray-900">{order.customerName}</div><div className="text-sm text-gray-500">{order.customerPhone}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatPrice(order.total)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{order.trackingNumber ? <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 font-mono">{order.trackingNumber}</span> : <span className="text-gray-400 text-xs">-</span>}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{order.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(order.createdAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <Link to={`/orders/${encodeURIComponent(String(order.id))}`} className="text-indigo-600 hover:text-indigo-900">{t("orders.view")}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">{t("orders.totalOrders")}: <span className="font-medium">{totalOrders}</span></div>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => { setPage(p => p - 1); setSearchParams({ page: String(page - 1) }); }}
              className="px-3 py-1 border rounded disabled:opacity-50">{t("orders.previous")}</button>
            <span className="px-3 py-1">{t("orders.pageOf", { page, totalPages: 1 })}</span>
            <button onClick={() => { setPage(p => p + 1); setSearchParams({ page: String(page + 1) }); }}
              className="px-3 py-1 border rounded disabled:opacity-50">{t("orders.next")}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BostaRecords;
