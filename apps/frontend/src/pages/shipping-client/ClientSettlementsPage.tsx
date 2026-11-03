import React, { useState, useEffect, useCallback } from 'react';
import { Receipt, RefreshCw, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';
import { ClientSettlementDetailModal } from './ClientSettlementDetailModal';

interface ClientSettlement {
  id: string;
  settlementNumber: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  totalShipments: number;
  deliveredCount: number;
  returnedCount: number;
  grossCOD: number;
  shippingFeesTotal: number;
  codFeesTotal: number;
  returnFeesTotal: number;
  netPayout: number;
  paymentMethod?: string;
  paymentReference?: string;
  paidAt?: string;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  DRAFT: { label: 'مسودة', badge: 'bg-gray-100 text-gray-700 border-gray-300' },
  ISSUED: { label: 'تم الإصدار', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  APPROVED: { label: 'معتمد', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PAID: { label: 'تم التوريد والصرف', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
  REJECTED: { label: 'مرفوض', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const formatEgp = (n: number | string | undefined | null) =>
  `${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;

export const ClientSettlementsPage: React.FC = () => {
  const [settlements, setSettlements] = useState<ClientSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null);

  const token = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
    ? window.localStorage.getItem('token') || window.localStorage.getItem('accessToken') || ''
    : '';

  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };

  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/v1/shipping-client/settlements?${params.toString()}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setSettlements(data.settlements || []);
      } else {
        toast.error(data.message || 'فشل في تحميل كشوف التسوية');
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  const totalGross = settlements.reduce((s, item) => s + Number(item.grossCOD || 0), 0);
  const totalNet = settlements.reduce((s, item) => s + Number(item.netPayout || 0), 0);

  return (
    <div className="space-y-4 w-full max-w-[1800px] mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            كشوف COD والتسويات الدورية
          </h1>
          <p className="text-xs text-gray-500">
            كشف حساب الشحنات المسلمة والمرتجعة وصافي المستحقات والتوريدات
          </p>
        </div>
        <button
          onClick={() => fetchSettlements()}
          disabled={loading}
          className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors self-start sm:self-auto"
          title="تحديث"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <span className="text-gray-500 block text-[11px]">عدد الكشوف</span>
          <span className="text-base font-bold text-gray-900 tabular-nums">
            {settlements.length}
          </span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <span className="text-gray-500 block text-[11px]">إجمالي COD المحصّل</span>
          <span className="text-base font-bold text-gray-900 tabular-nums">
            {formatEgp(totalGross)}
          </span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <span className="text-gray-500 block text-[11px]">رسوم الشحن والمرتجعات</span>
          <span className="text-base font-bold text-rose-600 tabular-nums">
            -{formatEgp(totalGross - totalNet)}
          </span>
        </div>
        <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
          <span className="text-emerald-700 font-medium block text-[11px]">صافي التوريدات</span>
          <span className="text-base font-bold text-emerald-700 tabular-nums">
            {formatEgp(totalNet)}
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-2.5 rounded-lg border border-gray-200 flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-900"
        >
          <option value="">جميع الحالات</option>
          <option value="ISSUED">تم الإصدار</option>
          <option value="APPROVED">معتمد</option>
          <option value="PAID">تم التوريد والصرف</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-right text-xs">
          <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
            <tr>
              <th className="p-3">رقم الكشف</th>
              <th className="p-3">دورة الكشف</th>
              <th className="p-3 text-center">عدد الشحنات</th>
              <th className="p-3 text-left">إجمالي المحصّل</th>
              <th className="p-3 text-left">إجمالي الرسوم</th>
              <th className="p-3 text-left font-bold text-gray-900">صافي المستحق</th>
              <th className="p-3 text-center">الحالة</th>
              <th className="p-3 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  جارٍ تحميل الكشوف...
                </td>
              </tr>
            ) : settlements.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">
                  لا توجد كشوف تسوية مسجلة حتى الآن
                </td>
              </tr>
            ) : (
              settlements.map((item) => {
                const conf = STATUS_MAP[item.status] || STATUS_MAP.DRAFT;
                const totalFees =
                  Number(item.shippingFeesTotal || 0) +
                  Number(item.codFeesTotal || 0) +
                  Number(item.returnFeesTotal || 0);

                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-mono font-medium text-blue-600">
                      {item.settlementNumber}
                    </td>
                    <td className="p-3 text-[11px] text-gray-600">
                      <div>من: {new Date(item.periodStart).toLocaleDateString('ar-EG')}</div>
                      <div>إلى: {new Date(item.periodEnd).toLocaleDateString('ar-EG')}</div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-semibold text-gray-800 tabular-nums">
                        {item.totalShipments}
                      </span>
                      <div className="text-[10px] text-gray-400">
                        {item.deliveredCount} مسلّمة · {item.returnedCount} مرتجع
                      </div>
                    </td>
                    <td className="p-3 text-left tabular-nums font-medium text-gray-900">
                      {formatEgp(item.grossCOD)}
                    </td>
                    <td className="p-3 text-left tabular-nums text-rose-600">
                      -{formatEgp(totalFees)}
                    </td>
                    <td className="p-3 text-left tabular-nums font-bold text-emerald-600 text-sm">
                      {formatEgp(item.netPayout)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${conf.badge}`}
                      >
                        {conf.label}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedSettlementId(item.id)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100"
                          title="عرض الأسطر والتفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={`/api/v1/shipping-client/settlements/${item.id}/export`}
                          download
                          className="p-1.5 text-gray-500 hover:text-emerald-600 rounded hover:bg-gray-100"
                          title="تحميل كشف CSV"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ClientSettlementDetailModal
        isOpen={Boolean(selectedSettlementId)}
        onClose={() => setSelectedSettlementId(null)}
        settlementId={selectedSettlementId}
        authHeaders={authHeaders}
      />
    </div>
  );
};

export default ClientSettlementsPage;
