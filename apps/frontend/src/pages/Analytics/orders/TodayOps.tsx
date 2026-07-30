import { RefreshCw as ArrowPathIcon, Check as CheckCircleIcon, X as XCircleIcon, Clock as ClockIcon, Circle as UserGroupIcon, Star as SparklesIcon, Filter as FunnelIcon, Phone as PhoneIcon, Activity as ChartBarIcon } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from "react";
;
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts";
import analyticsService from "../../../services/analyticsService";

interface TeamMember { name: string; confirms: number; cancels: number; others: number; total: number; }
interface ActionItem { id: string; orderLabel: string; oldStatus: string; newStatus: string; changedBy: string; createdAt: string; orderDate: string; isOldOrder: boolean; }
interface PendingItem { orderNumber: string; customerName: string; customerPhone: string; total: number; status: string; sourceType: string; createdAt: string; }
interface StatusRow { status: string; count: number; }
interface HourlyRow { hour: number; count: number; }
interface TodayActions { confirms: number; cancels: number; total: number; team: TeamMember[]; feed: ActionItem[]; }
interface DaySnapshot { date: string; totalOrders: number; regular: number; guests: number; pendingList: PendingItem[]; pendingListGuests: PendingItem[]; statusBreakdown: StatusRow[]; hourly: HourlyRow[]; }
interface PageData { todayActions: TodayActions; daySnapshot: DaySnapshot; }

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

function statusBadge(status: string | null): string {
  const m: Record<string, string> = {
    CONFIRMED: 'bg-emerald-100 text-emerald-800', PENDING: 'bg-yellow-100 text-yellow-800',
    CANCELLED: 'bg-red-100 text-red-800', DELIVERED: 'bg-blue-100 text-blue-800',
    PROCESSING: 'bg-indigo-100 text-indigo-800', SHIPPED: 'bg-purple-100 text-purple-800',
    REFUNDED: 'bg-orange-100 text-orange-800', DUPLICATE_ORDER: 'bg-gray-100 text-gray-600',
  };
  return m[status || ''] || 'bg-gray-100 text-gray-600';
}
function statusLabel(status: string | null): string {
  const m: Record<string, string> = {
    CONFIRMED: 'مؤكد', PENDING: 'معلق', CANCELLED: 'ملغي', DELIVERED: 'تم التسليم',
    PROCESSING: 'قيد المعالجة', SHIPPED: 'تم الشحن', REFUNDED: 'مسترجع', DUPLICATE_ORDER: 'مكرر',
  };
  return m[status || ''] || status || '-';
}
function fmtTime(d: string): string {
  const date = new Date(d);
  return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }) + ' ' +
    date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
}
function fmtHour(h: number): string { return h.toString().padStart(2, '0') + ':00'; }

export default function TodayOps() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapDate, setSnapDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tab, setTab] = useState<'actions' | 'snapshot'>('actions');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (snapDate) params.snapshotDate = snapDate;
      const qs = new URLSearchParams(params).toString();
      const res = await analyticsService.getTodayOps(qs);
      setData(res.data);
    } catch {
      setError("فشل تحميل التقرير");
    } finally {
      setLoading(false);
    }
  }, [snapDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh كل 30 ثانية
  useEffect(() => {
    intervalRef.current = setInterval(() => fetchData(), 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  if (loading && !data) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="loading-spinner" /></div>;
  }
  if (error && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={() => fetchData(true)} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  const a = data?.todayActions || { confirms: 0, cancels: 0, total: 0, team: [], feed: [] };
  const s = data?.daySnapshot || { date: '', totalOrders: 0, regular: 0, guests: 0, pendingList: [], pendingListGuests: [], statusBreakdown: [], hourly: [] };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">عمليات اليوم</h1>
          <p className="text-sm text-gray-500 mt-1">تحديث تلقائي كل ٣٠ ثانية</p>
        </div>
        <button onClick={() => fetchData(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
          <ArrowPathIcon className="h-4 w-4" /> تحديث
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setTab('actions')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'actions' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
          <SparklesIcon className="h-4 w-4 inline ml-1" />شغل النهارده
        </button>
        <button onClick={() => setTab('snapshot')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'snapshot' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
          <FunnelIcon className="h-4 w-4 inline ml-1" />تقرير يوم
        </button>
      </div>

      {/* Section 1: شغل النهارده */}
      {tab === 'actions' && (
        <SectionTodayActions a={a} onRefresh={() => fetchData(true)} />
      )}

      {/* Section 2: تقرير يوم */}
      {tab === 'snapshot' && (
        <SectionDaySnapshot
          s={s}
          snapDate={snapDate}
          onDateChange={setSnapDate}
          onRefresh={() => fetchData(true)}
        />
      )}
    </div>
  );
}

function SectionTodayActions({ a, onRefresh }: { a: TodayActions; onRefresh: () => void }) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="إجمالي الإجراءات" value={a.total} icon={SparklesIcon} detail={`${a.confirms} تأكيد + ${a.cancels} إلغاء`} tone="neutral" />
        <SummaryCard title="تأكيدات" value={a.confirms} icon={CheckCircleIcon} tone="good" />
        <SummaryCard title="إلغاءات" value={a.cancels} icon={XCircleIcon} tone={a.cancels > 0 ? 'bad' : 'good'} />
        <SummaryCard title="نسبة الإنجاز" value={a.total > 0 ? Math.round((a.confirms / a.total) * 100) + '%' : '0%'} icon={ChartBarIcon} detail={`${a.cancels > 0 ? Math.round((a.cancels / a.total) * 100) + '% إلغاء' : '0% إلغاء'}`} tone="good" />
      </div>

      {/* Team Activity */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">نشاط الفريق النهارده</h2>
        {a.team.length === 0 ? (
          <p className="text-gray-400 text-sm">لا يوجد نشاط اليوم</p>
        ) : (
          <div className="space-y-3">
            {a.team.map((m) => (
              <div key={m.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2">
                  <UserGroupIcon className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">{m.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-600 font-semibold">{m.confirms} تأكيد</span>
                  <span className="text-red-500 font-semibold">{m.cancels} إلغاء</span>
                  <span className="text-gray-400">{m.others} أخرى</span>
                  <span className="text-gray-500 font-medium">{m.total} total</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">آخر الإجراءات</h2>
        {a.feed.length === 0 ? (
          <p className="text-gray-400 text-sm">لا توجد إجراءات اليوم</p>
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
                  <th className="text-right py-3 px-2 font-medium">النوع</th>
                </tr>
              </thead>
              <tbody>
                {a.feed.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium text-gray-900">{item.orderLabel}</td>
                    <td className="py-3 px-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(item.oldStatus)}`}>{statusLabel(item.oldStatus)}</span></td>
                    <td className="py-3 px-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(item.newStatus)}`}>{statusLabel(item.newStatus)}</span></td>
                    <td className="py-3 px-2 text-gray-600">{item.changedBy}</td>
                    <td className="py-3 px-2 text-gray-500 text-xs">{fmtTime(item.createdAt)}</td>
                    <td className="py-3 px-2">{item.isOldOrder ? <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">قديم</span> : <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">جديد</span>}</td>
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

function SectionDaySnapshot({ s, snapDate, onDateChange, onRefresh }: {
  s: DaySnapshot; snapDate: string; onDateChange: (d: string) => void; onRefresh: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Date Picker */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">اختر اليوم:</label>
        <input type="date" value={snapDate} max={new Date().toISOString().slice(0, 10)}
          onChange={e => onDateChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="إجمالي الوارد" value={s.totalOrders} detail={`${s.regular} عادية + ${s.guests} ضيوف`} icon={SparklesIcon} tone="neutral" />
        <SummaryCard title="المؤكدة" value={s.statusBreakdown.find(st => st.status === 'CONFIRMED')?.count || 0} icon={CheckCircleIcon} tone="good" />
        <SummaryCard title="الملغية" value={s.statusBreakdown.find(st => st.status === 'CANCELLED')?.count || 0} icon={XCircleIcon} tone="neutral" />
        <SummaryCard title="المعلقة" value={s.pendingList.length + s.pendingListGuests.length} icon={ClockIcon} tone={(s.pendingList.length + s.pendingListGuests.length) > 0 ? 'bad' : 'good'} />
      </div>

      {/* Status Distribution + Hourly Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">توزيع الحالات</h2>
          {s.statusBreakdown.length === 0 ? (
            <p className="text-gray-400 text-sm">لا توجد طلبات في هذا اليوم</p>
          ) : (
            <div className="space-y-2">
              {s.statusBreakdown.map((b) => (
                <div key={b.status} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(b.status)}`}>{statusLabel(b.status)}</span>
                  <span className="text-sm font-semibold text-gray-700">{b.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hourly Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">نشاط الساعة</h2>
          {s.hourly.length === 0 ? (
            <p className="text-gray-400 text-sm">لا توجد بيانات</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={s.hourly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tickFormatter={fmtHour} />
                <YAxis allowDecimals={false} />
                <Tooltip labelFormatter={(h: number) => fmtHour(h)} formatter={(v: number) => [v, 'طلبات']} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Pending Orders Table */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">الطلبات المعلقة ⏳</h2>
        {s.pendingList.length === 0 && s.pendingListGuests.length === 0 ? (
          <p className="text-gray-400 text-sm">مافيش طلبات معلقة في هذا اليوم</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="text-right py-3 px-2 font-medium">الطلب</th>
                  <th className="text-right py-3 px-2 font-medium">العميل</th>
                  <th className="text-right py-3 px-2 font-medium">رقم الهاتف</th>
                  <th className="text-right py-3 px-2 font-medium">الإجمالي</th>
                  <th className="text-right py-3 px-2 font-medium">الحالة</th>
                  <th className="text-right py-3 px-2 font-medium">المصدر</th>
                  <th className="text-right py-3 px-2 font-medium">الوقت</th>
                  <th className="text-right py-3 px-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {s.pendingList.map((o) => (
                  <tr key={o.orderNumber} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium text-gray-900">{o.orderNumber}</td>
                    <td className="py-3 px-2 text-gray-700">{o.customerName || '-'}</td>
                    <td className="py-3 px-2 text-gray-600 dir-ltr">{o.customerPhone || '-'}</td>
                    <td className="py-3 px-2 text-gray-700">{Number(o.total).toLocaleString()} ج.م</td>
                    <td className="py-3 px-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(o.status)}`}>{statusLabel(o.status)}</span></td>
                    <td className="py-3 px-2 text-gray-500 text-xs">{o.sourceType || '-'}</td>
                    <td className="py-3 px-2 text-gray-500 text-xs">{fmtTime(o.createdAt)}</td>
                    <td className="py-3 px-2">{o.customerPhone && <a href={`tel:${o.customerPhone}`} className="text-blue-600 hover:text-blue-800"><PhoneIcon className="h-4 w-4" /></a>}</td>
                  </tr>
                ))}
                {s.pendingListGuests.map((o) => (
                  <tr key={`g-${o.orderNumber}`} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium text-gray-900">{o.orderNumber}</td>
                    <td className="py-3 px-2 text-gray-700">{o.customerName || '-'}</td>
                    <td className="py-3 px-2 text-gray-600 dir-ltr">{o.customerPhone || '-'}</td>
                    <td className="py-3 px-2 text-gray-700">{Number(o.total).toLocaleString()} ج.م</td>
                    <td className="py-3 px-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(o.status)}`}>{statusLabel(o.status)}</span></td>
                    <td className="py-3 px-2 text-gray-500 text-xs">ضيف</td>
                    <td className="py-3 px-2 text-gray-500 text-xs">{fmtTime(o.createdAt)}</td>
                    <td className="py-3 px-2">{o.customerPhone && <a href={`tel:${o.customerPhone}`} className="text-blue-600 hover:text-blue-800"><PhoneIcon className="h-4 w-4" /></a>}</td>
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
