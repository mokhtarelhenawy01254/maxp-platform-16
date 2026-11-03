// @vitest-environment jsdom
/**
 * Shipping Client Dashboard (SHIP-W2C)
 * KPIs: Monthly shipments, delivery rate %, returns, pending COD balance + Recent 5 shipments
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shippingClientApi } from './useShippingClientApi';

interface DashboardData {
  totalShipments: number;
  deliveredCount: number;
  returnedCount: number;
  pendingCount: number;
  deliveryRate: number;
  estimatedPendingCod: number;
  recentShipments: Array<{
    id: string;
    trackingNumber: string;
    recipientName: string;
    recipientPhone: string;
    destinationGovernorate: string;
    status: string;
    codAmount: number | null;
    currency: string;
    createdAt: string;
  }>;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'قيد المراجعة', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  ACCEPTED: { label: 'تم القبول', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  OUT_FOR_DELIVERY: { label: 'خرج للتوصيل', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  DELIVERED: { label: 'تم التسليم', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  RETURNED: { label: 'مرتجع', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  CANCELLED: { label: 'ملغي', className: 'bg-gray-100 text-gray-700 border-gray-200' },
};

export default function ClientDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    shippingClientApi
      .getSummary()
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'فشل في تحميل بيانات لوحة التحكم');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-sm text-gray-500 font-medium">جاري تحميل البيانات...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900">لوحة تحكم التاجر</h1>
          <p className="text-xs text-gray-500 mt-0.5">متابعة دقيقة للشحنات ومعدلات التسليم ورصيد التحصيل</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/client-portal/shipping/new')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
          >
            + شحنة جديدة
          </button>
          <button
            onClick={() => navigate('/client-portal/shipping/pickups')}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-medium rounded-md shadow-sm transition-colors"
          >
            طلب بيكاب
          </button>
          <button
            onClick={() => navigate('/client-portal/shipping/bulk')}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-medium rounded-md shadow-sm transition-colors"
          >
            رفع ملف CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Shipments */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <span className="text-xs font-medium text-gray-500">إجمالي الشحنات</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {data?.totalShipments ?? 0}
            </span>
            <span className="text-xs text-gray-400">شحنة</span>
          </div>
        </div>

        {/* Delivery Rate */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <span className="text-xs font-medium text-gray-500">نسبة التسليم</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600 tabular-nums">
              {data?.deliveryRate ?? 0}%
            </span>
            <span className="text-xs text-gray-400">مكتمل</span>
          </div>
        </div>

        {/* Returns */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <span className="text-xs font-medium text-gray-500">المرتجعات والمحاولات</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-600 tabular-nums">
              {data?.returnedCount ?? 0}
            </span>
            <span className="text-xs text-gray-400">شحنة</span>
          </div>
        </div>

        {/* Pending COD */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <span className="text-xs font-medium text-gray-500">رصيد COD التقديري</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-blue-600 tabular-nums">
              {(data?.estimatedPendingCod ?? 0).toLocaleString('en-US')}
            </span>
            <span className="text-xs text-gray-400">ج.م</span>
          </div>
        </div>
      </div>

      {/* Recent Shipments */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">آخر ٥ شحنات</h2>
          <button
            onClick={() => navigate('/client-portal/shipping/shipments')}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            عرض الكل &larr;
          </button>
        </div>

        {(!data?.recentShipments || data.recentShipments.length === 0) ? (
          <div className="py-12 text-center text-sm text-gray-400">لا توجد شحنات مسجلة حتى الآن</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 font-medium">رقم التتبع</th>
                  <th className="px-4 py-2.5 font-medium">المستلم</th>
                  <th className="px-4 py-2.5 font-medium">المحافظة</th>
                  <th className="px-4 py-2.5 font-medium">مبلغ التحصيل (COD)</th>
                  <th className="px-4 py-2.5 font-medium">الحالة</th>
                  <th className="px-4 py-2.5 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recentShipments.map((s) => {
                  const statusInfo = STATUS_LABELS[s.status] || {
                    label: s.status,
                    className: 'bg-gray-50 text-gray-600 border-gray-200',
                  };
                  return (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/client-portal/shipping/shipments/${s.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-blue-600">
                        {s.trackingNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{s.recipientName}</td>
                      <td className="px-4 py-3 text-gray-600">{s.destinationGovernorate}</td>
                      <td className="px-4 py-3 text-gray-900 tabular-nums font-semibold">
                        {s.codAmount ? `${s.codAmount.toLocaleString('en-US')} ج.م` : 'بدون تحصيل'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 tabular-nums">
                        {new Date(s.createdAt).toLocaleDateString('ar-EG')}
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
