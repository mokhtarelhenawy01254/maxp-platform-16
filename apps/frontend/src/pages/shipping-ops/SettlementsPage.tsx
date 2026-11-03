import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Plus,
  RefreshCw,
  Eye,
  Download,
  CheckCircle,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  SettlementItem,
  SettlementMerchant,
  SETTLEMENT_STATUS_MAP,
  formatEgp,
} from './settlements/SettlementTypes';
import { SettlementPreviewModal } from './settlements/SettlementPreviewModal';
import { SettlementDetailModal } from './settlements/SettlementDetailModal';
import { SettlementPayModal } from './settlements/SettlementPayModal';

export const SettlementsPage: React.FC = () => {
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [merchants, setMerchants] = useState<SettlementMerchant[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [merchantFilter, setMerchantFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modals state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null);
  const [payingSettlement, setPayingSettlement] = useState<SettlementItem | null>(null);

  const token = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
    ? window.localStorage.getItem('token') || window.localStorage.getItem('accessToken') || ''
    : '';

  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };

  const fetchMerchants = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/shipping-portal/merchants', { headers: authHeaders });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMerchants(data.data);
      }
    } catch {}
  }, []);

  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (merchantFilter) params.append('merchantId', merchantFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const res = await fetch(`/api/v1/shipping-portal/settlements?${params.toString()}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setSettlements(data.settlements || []);
      } else {
        toast.error(data.message || 'فشل في جلب قائمة التسويات');
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, [merchantFilter, statusFilter, fromDate, toDate]);

  useEffect(() => {
    fetchMerchants();
    fetchSettlements();
  }, [fetchMerchants, fetchSettlements]);

  // Aggregate metrics
  const totalGross = settlements.reduce((s, item) => s + Number(item.grossCOD || 0), 0);
  const totalNet = settlements.reduce((s, item) => s + Number(item.netPayout || 0), 0);
  const totalParcels = settlements.reduce((s, item) => s + (item.totalShipments || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-white dark:bg-slate-900 min-h-screen" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            تسويات وكشوف COD لعملاء الشحن
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            إجمالي المحصل − رسوم الشحن − رسوم COD − المرتجعات = صافي التوريد
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchSettlements()}
            disabled={loading}
            className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowPreviewModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            معاينة وإنشاء كشف جديد
          </button>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 block">عدد الكشوف</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
            {settlements.length}
          </span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 block">إجمالي الشحنات المدرجة</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
            {totalParcels}
          </span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 block">إجمالي محصل COD</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
            {formatEgp(totalGross)}
          </span>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium block">
            إجمالي صافي التوريدات
          </span>
          <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
            {formatEgp(totalNet)}
          </span>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap gap-2.5 items-center">
        <div className="min-w-[180px]">
          <select
            value={merchantFilter}
            onChange={(e) => setMerchantFilter(e.target.value)}
            className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            <option value="">جميع العملاء</option>
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            <option value="">جميع الحالات</option>
            <option value="DRAFT">مسودة</option>
            <option value="ISSUED">تم الإصدار</option>
            <option value="APPROVED">معتمد</option>
            <option value="PAID">تم التوريد والصرف</option>
            <option value="REJECTED">مرفوض</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>من:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>إلى:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Settlements Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">رقم الكشف</th>
              <th className="p-3">عميل الشحن</th>
              <th className="p-3">الفترة</th>
              <th className="p-3 text-center">الشحنات</th>
              <th className="p-3 text-left">إجمالي المحصل</th>
              <th className="p-3 text-left">الرسوم والمصاريف</th>
              <th className="p-3 text-left font-bold text-slate-900 dark:text-white">
                صافي التوريد
              </th>
              <th className="p-3 text-center">الحالة</th>
              <th className="p-3 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-500">
                  جارٍ تحميل بيانات الكشوف...
                </td>
              </tr>
            ) : settlements.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">
                  لا توجد كشوف تسوية مطابقة للبحث
                </td>
              </tr>
            ) : (
              settlements.map((item) => {
                const statusConfig =
                  SETTLEMENT_STATUS_MAP[item.status] || SETTLEMENT_STATUS_MAP.DRAFT;
                const totalFees =
                  Number(item.shippingFeesTotal || 0) +
                  Number(item.codFeesTotal || 0) +
                  Number(item.returnFeesTotal || 0);

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-3 font-mono font-medium text-blue-600 dark:text-blue-400">
                      {item.settlementNumber}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {item.merchant?.name || '—'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.merchant?.phone || ''}
                      </div>
                    </td>
                    <td className="p-3 text-[11px] text-slate-500">
                      <div>من: {new Date(item.periodStart).toLocaleDateString('ar-EG')}</div>
                      <div>إلى: {new Date(item.periodEnd).toLocaleDateString('ar-EG')}</div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        {item.totalShipments}
                      </span>
                      <div className="text-[10px] text-slate-400">
                        {item.deliveredCount} مسلّمة · {item.returnedCount} مرتجع
                      </div>
                    </td>
                    <td className="p-3 text-left tabular-nums font-medium text-slate-900 dark:text-white">
                      {formatEgp(item.grossCOD)}
                    </td>
                    <td className="p-3 text-left tabular-nums text-rose-600">
                      -{formatEgp(totalFees)}
                    </td>
                    <td className="p-3 text-left tabular-nums font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatEgp(item.netPayout)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${statusConfig.badgeClass}`}
                      >
                        {statusConfig.labelAr}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedSettlementId(item.id)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="عرض تفاصيل الأسطر"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={`/api/v1/shipping-portal/settlements/${item.id}/export`}
                          download
                          className="p-1.5 text-slate-500 hover:text-emerald-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="تحميل كشف CSV"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {item.status === 'APPROVED' && (
                          <button
                            onClick={() => setPayingSettlement(item)}
                            className="p-1.5 text-teal-600 hover:text-teal-700 rounded hover:bg-teal-50 dark:hover:bg-teal-950/30"
                            title="تسجيل التوريد والصرف"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <SettlementPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        merchants={merchants}
        onSettlementCreated={fetchSettlements}
        authHeaders={authHeaders}
      />

      <SettlementDetailModal
        isOpen={Boolean(selectedSettlementId)}
        onClose={() => setSelectedSettlementId(null)}
        settlementId={selectedSettlementId}
        authHeaders={authHeaders}
        onRefresh={fetchSettlements}
        onOpenPayModal={(item) => {
          setSelectedSettlementId(null);
          setPayingSettlement(item);
        }}
      />

      <SettlementPayModal
        isOpen={Boolean(payingSettlement)}
        onClose={() => setPayingSettlement(null)}
        settlement={payingSettlement}
        authHeaders={authHeaders}
        onPaid={fetchSettlements}
      />
    </div>
  );
};

export default SettlementsPage;
