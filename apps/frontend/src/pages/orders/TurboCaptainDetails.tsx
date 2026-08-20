import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../../services/api';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  shipping: number;
  status: string;
  turboShipmentId: string;
  turboTrackingNumber: string;
  turboShipmentStatus: string;
  turboDelayReason: string | null;
  turboReturnReason: string | null;
  turboExpectedBranch: string | null;
  governorate: string | null;
  city: string | null;
  createdAt: string;
}

interface CaptainInfo {
  name: string;
  phone: string | null;
  branch: string | null;
  branchPhone: string | null;
}

interface Stats {
  total: number;
  delivered: number;
  returned: number;
  active: number;
  delayed: number;
  remitted: number;
  totalRevenue: number;
  totalShipping: number;
  deliveryRate: number;
  delayReasons: Record<string, number>;
  returnReasons: Record<string, number>;
}

const statusBadgeClass = (status: string) => {
  const s = (status || '').toLowerCase().trim();
  if (s === 'delivered' || s === 'remitted') return 'bg-green-100 text-green-700 border-green-200';
  if (s.startsWith('returned')) return 'bg-red-100 text-red-700 border-red-200';
  if (s === 'delayed') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-blue-100 text-blue-700 border-blue-200';
};

const statusArabic = (status: string) => {
  const s = (status || '').toLowerCase().trim();
  if (s === 'delivered') return '╪¬┘à ╪º┘ä╪¬╪│┘ä┘è┘à';
  if (s === 'remitted') return '╪¬┘à ╪º┘ä╪¬┘ê╪▒┘è╪»';
  if (s.startsWith('returned')) return '┘à╪▒╪¬╪¼╪╣';
  if (s === 'delayed') return '┘à╪ñ╪¼┘ä╪⌐';
  if (s === 'processing') return '┘é┘è╪» ╪º┘ä╪¬┘å┘ü┘è╪░';
  if (s === 'turbo_sent') return '┘é┘è╪» ╪º┘ä╪º┘å╪¬╪╕╪º╪▒';
  if (s === 'turbo_saved') return '┘à╪¡┘ü┘ê╪╕╪⌐';
  if (s === 'out_for_delivery') return '┘à╪│┘ä┘à╪⌐ ┘ä┘ä┘à┘å╪»┘ê╪¿';
  if (s === 'created') return '┘à┘å╪┤╪ú╪⌐';
  return s;
};

const TurboCaptainDetails: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [captain, setCaptain] = useState<CaptainInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const captainName = decodeURIComponent(name || '');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/turbo/captains/${encodeURIComponent(captainName)}/orders`, {
        params: { page, limit: 50, status: statusFilter || undefined }
      });
      if (res.data.success) {
        setOrders(res.data.data || []);
        setStats(res.data.stats || null);
        setCaptain(res.data.captain || null);
        setTotalPages(res.data.pagination?.pages || 1);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load captain orders');
    } finally {
      setLoading(false);
    }
  }, [captainName, page, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6">
        <Link to="/orders/turbo-captains" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
          ΓåÉ ╪º┘ä╪╣┘ê╪»╪⌐ ┘ä╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä┘à┘å╪»┘ê╪¿┘è┘å
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {captain?.name || captainName}
        </h1>
        {captain && (
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            {captain.phone && <span>≡ƒô₧ {captain.phone}</span>}
            {captain.branch && <span>≡ƒôì {captain.branch}{captain.branchPhone ? ` (${captain.branchPhone})` : ''}</span>}
          </div>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-xs text-gray-500 mt-1">╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪┤╪¡┘å╪º╪¬</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{stats.delivered + stats.remitted}</div>
            <div className="text-xs text-gray-500 mt-1">╪¬┘à ╪º┘ä╪¬╪│┘ä┘è┘à</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-red-600">{stats.returned}</div>
            <div className="text-xs text-gray-500 mt-1">┘à╪▒╪¬╪¼╪╣╪º╪¬</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-amber-600">{stats.active}</div>
            <div className="text-xs text-gray-500 mt-1">┘å╪┤╪╖</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.deliveryRate}%</div>
            <div className="text-xs text-gray-500 mt-1">┘å╪│╪¿╪⌐ ╪º┘ä╪¬╪│┘ä┘è┘à</div>
          </div>
        </div>
      )}

      {stats && (Object.keys(stats.delayReasons).length > 0 || Object.keys(stats.returnReasons).length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {Object.keys(stats.delayReasons).length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg shadow p-4">
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-2">ΓÅ░ ╪ú╪│╪¿╪º╪¿ ╪º┘ä╪¬╪ú╪«┘è╪▒</h3>
              {Object.entries(stats.delayReasons).sort((a, b) => b[1] - a[1]).map(([reason, count]) => (
                <div key={reason} className="flex justify-between text-sm py-1 border-b border-amber-100 last:border-0">
                  <span className="text-amber-700 dark:text-amber-300 truncate ml-2">{reason}</span>
                  <span className="font-bold text-amber-800 dark:text-amber-200">{count}</span>
                </div>
              ))}
            </div>
          )}
          {Object.keys(stats.returnReasons).length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-4">
              <h3 className="text-sm font-bold text-red-800 dark:text-red-200 mb-2">Γ¥î ╪ú╪│╪¿╪º╪¿ ╪º┘ä╪º╪▒╪¬╪¼╪º╪╣</h3>
              {Object.entries(stats.returnReasons).sort((a, b) => b[1] - a[1]).map(([reason, count]) => (
                <div key={reason} className="flex justify-between text-sm py-1 border-b border-red-100 last:border-0">
                  <span className="text-red-700 dark:text-red-300 truncate ml-2">{reason}</span>
                  <span className="font-bold text-red-800 dark:text-red-200">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex gap-2 flex-wrap">
          {['', 'delivered', 'returned', 'active', 'delayed'].map(f => (
            <button
              key={f}
              onClick={() => { setStatusFilter(f); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {f === '' ? '╪º┘ä┘â┘ä' : f === 'delivered' ? '╪¬┘à ╪º┘ä╪¬╪│┘ä┘è┘à' : f === 'returned' ? '┘à╪▒╪¬╪¼╪╣' : f === 'active' ? '┘å╪┤╪╖' : '┘à╪ñ╪¼┘ä╪⌐'}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">╪º┘ä╪╖┘ä╪¿</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">╪º┘ä╪╣┘à┘è┘ä</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">╪º┘ä╪Ñ╪¼┘à╪º┘ä┘è</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">╪¡╪º┘ä╪⌐ ╪º┘ä┘å╪╕╪º┘à</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">╪¡╪º┘ä╪⌐ Turbo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">╪│╪¿╪¿ ╪º┘ä╪¬╪ú╪«┘è╪▒</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">╪│╪¿╪¿ ╪º┘ä╪º╪▒╪¬╪¼╪º╪╣</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">╪º┘ä╪¬╪º╪▒┘è╪«</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    ┘ä╪º ╪¬┘ê╪¼╪» ╪╖┘ä╪¿╪º╪¬ ╪¿┘ç╪░╪º ╪º┘ä┘ü┘ä╪¬╪▒
                  </td>
                </tr>
              ) : (
                orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <Link to={`/orders/${encodeURIComponent(o.orderNumber)}`} className="text-blue-600 hover:text-blue-800 font-mono text-sm font-medium">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 dark:text-gray-100">{o.customerName || '-'}</div>
                      {o.customerPhone && <div className="text-xs text-gray-500 ltr">{o.customerPhone}</div>}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                      {parseFloat(o.total.toString()).toFixed(0)} ╪¼.┘à
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(o.status)}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(o.turboShipmentStatus)}`}>
                        {statusArabic(o.turboShipmentStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-amber-600 max-w-[200px] truncate" title={o.turboDelayReason || ''}>
                      {o.turboDelayReason || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-red-600 max-w-[200px] truncate" title={o.turboReturnReason || ''}>
                      {o.turboReturnReason || '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500 whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded text-sm bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
            >
              ╪º┘ä╪│╪º╪¿┘é
            </button>
            <span className="text-sm text-gray-500">╪╡┘ü╪¡╪⌐ {page} ┘à┘å {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded text-sm bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
            >
              ╪º┘ä╪¬╪º┘ä┘è
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TurboCaptainDetails;
