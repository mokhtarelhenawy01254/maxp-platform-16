import React, { useEffect, useState } from "react";
import {
  ArrowPathIcon, CheckCircleIcon, XCircleIcon,
  ClockIcon, UserGroupIcon, SparklesIcon,
} from "@heroicons/react/24/outline";
import analyticsService from "../../../services/analyticsService";

interface SummaryData {
  totalOrders: number; totalGuests: number; totalAll: number;
  confirmedOrders: number; guestConfirmed: number; totalConfirmed: number;
  cancelledOrders: number; guestCancelled: number; totalCancelled: number;
  pendingOrders: number; cancellationRate: number; confirmationRate: number;
}

interface StatusBreakdown {
  regular: { status: string; count: number }[];
  guest: { status: string; count: number }[];
}

interface TeamMember {
  name: string; changes: number; confirms: number; cancels: number; others: number;
}

interface ActivityItem {
  id: string; orderLabel: string; oldStatus: string; newStatus: string;
  changedBy: string; createdAt: string;
}

interface TodayOpsData {
  summary: SummaryData;
  statusBreakdown: StatusBreakdown;
  teamActivity: TeamMember[];
  activityFeed: ActivityItem[];
}

const emptySummary: SummaryData = {
  totalOrders:0,totalGuests:0,totalAll:0,confirmedOrders:0,guestConfirmed:0,totalConfirmed:0,
  cancelledOrders:0,guestCancelled:0,totalCancelled:0,pendingOrders:0,cancellationRate:0,confirmationRate:0,
};

function SummaryCard({ title, value, detail, icon: Icon, tone }: {
  title: string; value: string | number; detail?: string; icon: React.ComponentType<{ className?: string }>; tone?: 'good' | 'bad' | 'neutral';
}) {
  const colors = tone === 'good' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
    tone === 'bad' ? 'bg-red-50 border-red-200 text-red-800' :
    'bg-white border-gray-200 text-gray-800';
  const iconColors = tone === 'good' ? 'text-emerald-500' : tone === 'bad' ? 'text-red-500' : 'text-blue-500';
  return (
    <div className={`rounded-xl border p-4 ${colors}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium opacity-75">{title}</p>
        <Icon className={`h-5 w-5 ${iconColors}`} />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {detail && <p className="text-xs opacity-60 mt-1">{detail}</p>}
    </div>
  );
}

export default function TodayOps() {
  const [data, setData] = useState<TodayOpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await analyticsService.getTodayOps();
      setData(res.data);
    } catch (err) {
      setError("فشل تحميل التقرير");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={() => fetchData()} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  const s = data?.summary || emptySummary;
  const breakdown = data?.statusBreakdown || { regular: [], guest: [] };
  const team = data?.teamActivity || [];
  const feed = data?.activityFeed || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">عمليات اليوم</h1>
          <p className="text-sm text-gray-500 mt-1">نظرة سريعة على أداء اليوم</p>
        </div>
        <button onClick={() => fetchData(true)} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="إجمالي الطلبات" value={s.totalAll} detail={`${s.totalOrders} عادية + ${s.totalGuests} ضيوف`} icon={SparklesIcon} tone="neutral" />
        <SummaryCard title="المؤكدة" value={s.totalConfirmed} detail={`نسبة ${s.confirmationRate}%`} icon={CheckCircleIcon} tone="good" />
        <SummaryCard title="الملغية" value={s.totalCancelled} detail={`نسبة ${s.cancellationRate}%`} icon={XCircleIcon} tone={s.totalCancelled > 0 ? 'bad' : 'good'} />
        <SummaryCard title="معلقة" value={s.pendingOrders} detail="لم يتم الرد أو التأكيد" icon={ClockIcon} tone={s.pendingOrders > 0 ? 'bad' : 'good'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">توزيع الحالات</h2>
          {breakdown.regular.length === 0 && breakdown.guest.length === 0 ? (
            <p className="text-gray-400 text-sm">لا توجد طلبات اليوم</p>
          ) : (
            <div className="space-y-3">
              {breakdown.regular.map((b) => (
                <div key={b.status} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(b.status)}`}>{statusLabel(b.status)}</span>
                  <span className="text-sm font-semibold text-gray-700">{b.count}</span>
                </div>
              ))}
              {breakdown.guest.length > 0 && (
                <>
                  <div className="pt-2 pb-1"><span className="text-xs font-medium text-gray-400 uppercase tracking-wide">ضيوف</span></div>
                  {breakdown.guest.map((b) => (
                    <div key={`g-${b.status}`} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(b.status)}`}>{statusLabel(b.status)}</span>
                      <span className="text-sm font-semibold text-gray-700">{b.count}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">نشاط الفريق</h2>
          {team.length === 0 ? (
            <p className="text-gray-400 text-sm">لا يوجد نشاط مسجل</p>
          ) : (
            <div className="space-y-3">
              {team.map((m) => (
                <div key={m.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <UserGroupIcon className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-600 font-medium">{m.confirms} تأكيد</span>
                    <span className="text-red-500 font-medium">{m.cancels} إلغاء</span>
                    <span className={`font-semibold ${m.changes > 0 ? 'text-gray-900' : 'text-gray-400'}`}>{m.changes} total</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">آخر النشاطات</h2>
        {feed.length === 0 ? (
          <p className="text-gray-400 text-sm">لا توجد نشاطات حديثة</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="text-right py-3 px-2 font-medium">الطلب</th>
                  <th className="text-right py-3 px-2 font-medium">من</th>
                  <th className="text-right py-3 px-2 font-medium">إلى</th>
                  <th className="text-right py-3 px-2 font-medium">بواسطة</th>
                  <th className="text-right py-3 px-2 font-medium">الوقت</th>
                </tr>
              </thead>
              <tbody>
                {feed.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium text-gray-900">{item.orderLabel}</td>
                    <td className="py-3 px-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(item.oldStatus)}`}>{statusLabel(item.oldStatus)}</span></td>
                    <td className="py-3 px-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(item.newStatus)}`}>{statusLabel(item.newStatus)}</span></td>
                    <td className="py-3 px-2 text-gray-600">{item.changedBy}</td>
                    <td className="py-3 px-2 text-gray-500">{formatTime(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function statusBadge(status: string | null): string {
  const map: Record<string, string> = {
    CONFIRMED: 'bg-emerald-100 text-emerald-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    CANCELLED: 'bg-red-100 text-red-800',
    DELIVERED: 'bg-blue-100 text-blue-800',
    PROCESSING: 'bg-indigo-100 text-indigo-800',
    SHIPPED: 'bg-purple-100 text-purple-800',
    REFUNDED: 'bg-orange-100 text-orange-800',
    DUPLICATE_ORDER: 'bg-gray-100 text-gray-600',
  };
  return map[status || ''] || 'bg-gray-100 text-gray-600';
}

function statusLabel(status: string | null): string {
  const map: Record<string, string> = {
    CONFIRMED: 'مؤكد',
    PENDING: 'معلق',
    CANCELLED: 'ملغي',
    DELIVERED: 'تم التسليم',
    PROCESSING: 'قيد المعالجة',
    SHIPPED: 'تم الشحن',
    REFUNDED: 'مسترجع',
    DUPLICATE_ORDER: 'مكرر',
  };
  return map[status || ''] || status || '-';
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }) + ' ' + hours + ':' + mins;
}
