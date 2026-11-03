import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  RefreshCw,
  Download,
  Calendar,
  Layers,
  MapPin,
  Users,
  Truck,
} from 'lucide-react';
import {
  shippingReportsService,
  SummaryReportResponse,
  GovernorateReportResponse,
  ClientReportResponse,
  CourierReportResponse,
} from '../../services/shippingReportsService';
import {
  DatePreset,
  getDateRangeFromPreset,
  exportToCsv,
} from './reports/shippingReportsHelpers';
import { ShippingReportsSummaryTab } from './reports/ShippingReportsSummaryTab';
import { ShippingReportsGovTab } from './reports/ShippingReportsGovTab';
import { ShippingReportsClientTab } from './reports/ShippingReportsClientTab';
import { ShippingReportsCourierTab } from './reports/ShippingReportsCourierTab';

type ReportTab = 'summary' | 'governorate' | 'client' | 'courier';

export const ShippingReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('summary');
  const [preset, setPreset] = useState<DatePreset>('30days');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Tab Data States
  const [summaryData, setSummaryData] = useState<SummaryReportResponse | null>(null);
  const [govData, setGovData] = useState<GovernorateReportResponse | null>(null);
  const [clientData, setClientData] = useState<ClientReportResponse | null>(null);
  const [courierData, setCourierData] = useState<CourierReportResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getEffectiveDateRange = useCallback(() => {
    if (preset === 'custom') {
      return {
        from: customFrom || undefined,
        to: customTo || undefined,
      };
    }
    return getDateRangeFromPreset(preset);
  }, [preset, customFrom, customTo]);

  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = getEffectiveDateRange();

      if (activeTab === 'summary') {
        const res = await shippingReportsService.getSummary(params);
        setSummaryData(res);
      } else if (activeTab === 'governorate') {
        const res = await shippingReportsService.getByGovernorate(params);
        setGovData(res);
      } else if (activeTab === 'client') {
        const res = await shippingReportsService.getByClient(params);
        setClientData(res);
      } else if (activeTab === 'courier') {
        const res = await shippingReportsService.getByCourier(params);
        setCourierData(res);
      }
    } catch (err: unknown) {
      console.error('Error fetching shipping reports:', err);
      const msg = err instanceof Error ? err.message : 'تعذر تحميل التقرير المطلوب';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeTab, getEffectiveDateRange]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // CSV Export Handler for Active Tab
  const handleExportCsv = () => {
    if (activeTab === 'summary' && summaryData) {
      const headers = ['الحالة', 'العدد', 'النسبة المئوية %'];
      const rows = summaryData.rows.map(r => [r.label, r.count, `${r.percentage}%`]);
      exportToCsv('shipping-report-summary', headers, rows);
    } else if (activeTab === 'governorate' && govData) {
      const headers = ['المحافظة', 'إجمالي الشحنات', 'مسلّمة', 'مرتجعة', 'نسبة النجاح %', 'متوسط زمن التسليم (ساعات)'];
      const rows = govData.rows.map(r => [
        r.governorate,
        r.shipments,
        r.delivered,
        r.returned,
        `${r.successRate}%`,
        r.avgDeliveryHours,
      ]);
      exportToCsv('shipping-report-by-governorate', headers, rows);
    } else if (activeTab === 'client' && clientData) {
      const headers = ['العميل / التاجر', 'الهاتف', 'الشحنات', 'مسلّمة', 'مرتجعة', 'COD محصّل', 'رسوم الشحن', 'رسوم المرتجع', 'صافي المستحق'];
      const rows = clientData.rows.map(r => [
        r.clientName,
        r.phone || '',
        r.shipments,
        r.delivered,
        r.returned,
        r.codCollected,
        r.shippingFees,
        r.returnFees,
        r.net,
      ]);
      exportToCsv('shipping-report-by-client', headers, rows);
    } else if (activeTab === 'courier' && courierData) {
      const headers = ['اسم المندوب', 'الهاتف', 'مسلّمة', 'مرتجعة', 'عمولات مستحقة (DUE)', 'عمولات مدفوعة (PAID)', 'إجمالي العمولات'];
      const rows = courierData.rows.map(r => [
        r.courierName,
        r.phone || '',
        r.delivered,
        r.returned,
        r.commissionsDue,
        r.commissionsPaid,
        r.totalCommissions,
      ]);
      exportToCsv('shipping-report-by-courier', headers, rows);
    }
  };

  const tabs = [
    { id: 'summary', label: 'ملخص الأداء', icon: Layers },
    { id: 'governorate', label: 'المحافظات', icon: MapPin },
    { id: 'client', label: 'العملاء', icon: Users },
    { id: 'courier', label: 'المناديب', icon: Truck },
  ] as const;

  const presets: { id: DatePreset; label: string }[] = [
    { id: 'today', label: 'اليوم' },
    { id: '7days', label: '7 أيام' },
    { id: '30days', label: '30 يوم' },
    { id: 'custom', label: 'مخصص' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-[1800px] mx-auto text-slate-900 dark:text-slate-100">
      {/* Cockpit Header (No in-page navigation element) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              تقارير الشحن والتوصيل
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            تحليلات الأداء الشاملة لكل محافظة، عميل، ومندوب، ومتابعة معدلات RTO ونسب النجاح
          </p>
        </div>

        {/* Action Controls & Date Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Preset Filter Buttons */}
          <div className="inline-flex items-center p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                className={`px-3 py-1 rounded-md font-medium transition active:scale-95 ${
                  preset === p.id
                    ? 'bg-white dark:bg-slate-800 text-primary dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 disabled:opacity-50"
            title="تصدير بيانات التقرير الحالي كملف CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span>تصدير CSV</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadReportData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 dark:text-slate-300 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Custom Date Pickers Drawer if preset === 'custom' */}
      {preset === 'custom' && (
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center gap-3 flex-wrap text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            الفترة المخصصة:
          </span>
          <div className="flex items-center gap-2">
            <span>من:</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span>إلى:</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>
          <button
            onClick={loadReportData}
            className="px-3 py-1 bg-primary text-white rounded font-medium hover:bg-primary/90 transition text-xs"
          >
            تطبيق الفلتر
          </button>
        </div>
      )}

      {/* In-Page Content Switcher Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-2 -mb-px overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ReportTab)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-primary text-primary dark:text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Active Tab Views */}
      <div className="min-h-[400px]">
        {activeTab === 'summary' && (
          <ShippingReportsSummaryTab data={summaryData} loading={loading} />
        )}
        {activeTab === 'governorate' && (
          <ShippingReportsGovTab data={govData} loading={loading} />
        )}
        {activeTab === 'client' && (
          <ShippingReportsClientTab data={clientData} loading={loading} />
        )}
        {activeTab === 'courier' && (
          <ShippingReportsCourierTab data={courierData} loading={loading} />
        )}
      </div>
    </div>
  );
};

export default ShippingReportsPage;
