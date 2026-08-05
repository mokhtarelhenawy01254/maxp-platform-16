import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../services/api';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface CaptainStats {
  captainName: string;
  captainPhone: string | null;
  branchName: string | null;
  branchPhone: string | null;
  total: number;
  delivered: number;
  returned: number;
  active: number;
  delayed: number;
  remitted: number;
  deliveryRate: number;
  returnRate: number;
  activeRate: number;
  delayRate: number;
  totalRevenue: number;
  totalShipping: number;
  delayReasonSummary: { reason: string; count: number }[];
  returnReasonSummary: { reason: string; count: number }[];
  recentOrders: string[];
}

interface TotalStats {
  totalCaptains: number;
  totalShipments: number;
  totalDelivered: number;
  totalReturned: number;
  totalActive: number;
  totalRevenue: number;
  avgDeliveryRate: number;
}

const TurboCaptains: React.FC = () => {
  const { t } = useTranslation();
  const [captains, setCaptains] = useState<CaptainStats[]>([]);
  const [totalStats, setTotalStats] = useState<TotalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('delivery_rate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/turbo/captains/stats`, {
        params: { sortBy, sortOrder, search: search || undefined }
      });
      if (res.data.success) {
        setCaptains(res.data.data || []);
        setTotalStats(res.data.totalStats || null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load captain stats');
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-blue-600 ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>;
  };

  const getScoreColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (rate: number) => {
    if (rate >= 80) return 'bg-green-100';
    if (rate >= 60) return 'bg-amber-100';
    return 'bg-red-100';
  };

  if (loading && captains.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            تقارير المندوبين
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            تحليل أداء مندوبي Turbo - نسب التسليم والمرتجعات
          </p>
        </div>
      </div>

      {totalStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{totalStats.totalCaptains}</div>
            <div className="text-xs text-gray-500 mt-1">إجمالي المندوبين</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalStats.totalShipments}</div>
            <div className="text-xs text-gray-500 mt-1">إجمالي الشحنات</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{totalStats.totalDelivered}</div>
            <div className="text-xs text-gray-500 mt-1">تم التسليم</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-red-600">{totalStats.totalReturned}</div>
            <div className="text-xs text-gray-500 mt-1">مرتجعات</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-amber-600">{totalStats.avgDeliveryRate}%</div>
            <div className="text-xs text-gray-500 mt-1">متوسط نسبة التسليم</div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث باسم المندوب..."
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 flex-1 max-w-xs"
          />
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            بحث
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th onClick={() => handleSort('captain_name')} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                  <SortIcon field="captain_name" /> المندوب
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفرع</th>
                <th onClick={() => handleSort('total')} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                  <SortIcon field="total" /> إجمالي
                </th>
                <th onClick={() => handleSort('delivered')} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                  <SortIcon field="delivered" /> ✅ تم
                </th>
                <th onClick={() => handleSort('returned')} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                  <SortIcon field="returned" /> ❌ مرتجع
                </th>
                <th onClick={() => handleSort('active')} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                  <SortIcon field="active" /> 🚚 نشط
                </th>
                <th onClick={() => handleSort('delivery_rate')} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                  <SortIcon field="delivery_rate" /> 📈 نسبة التسليم
                </th>
                <th onClick={() => handleSort('return_rate')} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                  <SortIcon field="return_rate" /> نسبة المرتجع
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">أبرز أسباب التأخير</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {captains.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    لا يوجد مندوبين بعد. انتظر حتى وصول بيانات Webhook من Turbo.
                  </td>
                </tr>
              ) : (
                captains.map((cap, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <Link to={`/orders/turbo-captains/${encodeURIComponent(cap.captainName)}`} className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400">
                        {cap.captainName}
                      </Link>
                      {cap.captainPhone && (
                        <div className="text-xs text-gray-500 ltr">{cap.captainPhone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {cap.branchName || '-'}
                      </div>
                      {cap.branchPhone && (
                        <div className="text-xs text-gray-500 ltr">{cap.branchPhone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                      {cap.total}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-green-600 font-medium">
                      {cap.delivered + cap.remitted}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-red-600 font-medium">
                      {cap.returned}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-blue-600 font-medium">
                      {cap.active}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreBg(cap.deliveryRate)} ${getScoreColor(cap.deliveryRate)}`}>
                        {cap.deliveryRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${cap.returnRate > 20 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                        {cap.returnRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {cap.delayReasonSummary.length > 0 ? (
                          cap.delayReasonSummary.filter((d) => d != null).map((d, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap max-w-[200px] truncate" title={d.reason}>
                              {d.reason.substring(0, 25)}... ({d.count})
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TurboCaptains;
