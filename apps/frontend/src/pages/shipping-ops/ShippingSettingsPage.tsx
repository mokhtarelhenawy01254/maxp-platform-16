import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  Printer,
  PackageOpen,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Users,
  Globe,
} from 'lucide-react';
import { shippingOpsService, ShippingPolicyData } from '../../services/shippingOpsService';
import ShippingEmployeesTab from './settings/ShippingEmployeesTab';
import ShippingIntegrationsTab from './settings/ShippingIntegrationsTab';

const ALL_DAYS = [
  { key: 'SATURDAY', labelAr: 'السبت', labelEn: 'Saturday' },
  { key: 'SUNDAY', labelAr: 'الأحد', labelEn: 'Sunday' },
  { key: 'MONDAY', labelAr: 'الاثنين', labelEn: 'Monday' },
  { key: 'TUESDAY', labelAr: 'الثلاثاء', labelEn: 'Tuesday' },
  { key: 'WEDNESDAY', labelAr: 'الأربعاء', labelEn: 'Wednesday' },
  { key: 'THURSDAY', labelAr: 'الخميس', labelEn: 'Thursday' },
  { key: 'FRIDAY', labelAr: 'الجمعة', labelEn: 'Friday' },
];

export const ShippingSettingsPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [activeTab, setActiveTab] = useState<'policy' | 'employees' | 'integrations'>('policy');
  const [policy, setPolicy] = useState<ShippingPolicyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Policy Form fields
  const [printFee, setPrintFee] = useState<string>('0');
  const [openMode, setOpenMode] = useState<string>('ALWAYS_ALLOW');
  const [feeAlways, setFeeAlways] = useState<string>('0');
  const [feeAsk, setFeeAsk] = useState<string>('0');
  const [feeDeny, setFeeDeny] = useState<string>('0');
  const [remittanceDays, setRemittanceDays] = useState<string[]>(['SUNDAY', 'WEDNESDAY']);
  const [maxDeliveryDays, setMaxDeliveryDays] = useState<string>('11');

  const loadPolicy = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await shippingOpsService.getShippingPolicy();
      setPolicy(data);
      if (data) {
        setPrintFee(String(data.printFeePerWaybill ?? 0));
        setOpenMode(data.openPackageMode || 'ALWAYS_ALLOW');
        setFeeAlways(String(data.openPackageFeeAlways ?? 0));
        setFeeAsk(String(data.openPackageFeeAsk ?? 0));
        setFeeDeny(String(data.openPackageFeeDeny ?? 0));
        if (data.remittanceDays) {
          const parsed = Array.isArray(data.remittanceDays)
            ? data.remittanceDays
            : (typeof data.remittanceDays === 'string' ? JSON.parse(data.remittanceDays) : ['SUNDAY', 'WEDNESDAY']);
          setRemittanceDays(parsed);
        }
        if (data.maxDeliveryDays != null) {
          setMaxDeliveryDays(String(data.maxDeliveryDays));
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل سياسة الشحن';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  const toggleDay = (dayKey: string) => {
    if (remittanceDays.includes(dayKey)) {
      if (remittanceDays.length === 1) return; // keep at least 1 day
      setRemittanceDays(remittanceDays.filter((d) => d !== dayKey));
    } else {
      setRemittanceDays([...remittanceDays, dayKey]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const payload = {
        printFeePerWaybill: parseFloat(printFee) || 0,
        openPackageMode: openMode,
        openPackageFeeAlways: parseFloat(feeAlways) || 0,
        openPackageFeeAsk: parseFloat(feeAsk) || 0,
        openPackageFeeDeny: parseFloat(feeDeny) || 0,
        remittanceDays,
        maxDeliveryDays: parseInt(maxDeliveryDays, 10) || 11,
      };

      const updated = await shippingOpsService.updateShippingPolicy(payload);
      setPolicy(updated);
      setSuccessMsg(isEn ? 'Settings saved successfully' : 'تم حفظ إعدادات السياسة وجدول التوريد بنجاح');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل حفظ الإعدادات';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-[1200px] mx-auto text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>{isEn ? 'Shipping Operations Settings' : 'إعدادات وتشغيل الشحن'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isEn
              ? 'Configure delivery policy, remittance schedule, employees, and store integrations (Turbo standard)'
              : 'تهيئة جدول التوريد، سياسة التوصيل والرسوم، موظفي الشحن، وتكاملات المتاجر الخارجية (معايير Turbo)'}
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('policy')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'policy'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {isEn ? 'Policy & Remittance' : 'السياسات والتوريد'}
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'employees'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isEn ? 'Employees' : 'فريق العمل'}</span>
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'integrations'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isEn ? 'Integrations' : 'التكاملات'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'employees' && <ShippingEmployeesTab />}
      {activeTab === 'integrations' && <ShippingIntegrationsTab />}

      {activeTab === 'policy' && (
        <>
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs sm:text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Remittance Schedule & Max Delivery Days (SHIP-T5) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm sm:text-base font-bold">
                  {isEn ? 'Remittance Schedule & Max Delivery Window (Turbo)' : 'جدول أيام التوريد وأقصى فترة تسليم (معايير Turbo)'}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Remittance Days */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isEn ? 'Weekly Remittance Days' : 'أيام التوريد الأسبوعية'}
                  </label>
                  <p className="text-[11px] text-slate-500">
                    {isEn ? 'Select the days when COD remittances are generated for merchants' : 'الأيام المعتمدة لصرف وتوريد متحصلات الشحن للتجار'}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {ALL_DAYS.map((d) => {
                      const selected = remittanceDays.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => toggleDay(d.key)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                            selected
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 ring-1 ring-indigo-500'
                              : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {isEn ? d.labelEn : d.labelAr}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Max Delivery Days */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isEn ? 'Max Delivery Days (SLA)' : 'أقصى فترة توصيل مسموحة (أيام)'}
                  </label>
                  <p className="text-[11px] text-slate-500">
                    {isEn
                      ? 'Shipments exceeding this threshold from creation without delivery will trigger stale alerts'
                      : 'أي شحنة تتجاوز هذه الفترة منذ إنشائها دون تسليم تظهر في تنبيه الشحنات المتأخرة'}
                  </p>
                  <div className="relative max-w-xs pt-1">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={maxDeliveryDays}
                      onChange={(e) => setMaxDeliveryDays(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 text-sm font-bold tabular-nums"
                      placeholder="11"
                    />
                    <span className="absolute left-3 top-3 text-xs text-slate-400 font-medium">يوم</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Print Fee */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Printer className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm sm:text-base font-bold">
                  {isEn ? 'Waybill Printing Fee Policy' : 'رسوم طباعة البوالص للعميل (Print Fee)'}
                </h2>
              </div>

              <div className="max-w-xs">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Fee per Waybill (EGP)' : 'رسوم طباعة البوليصة للشحنة الواحدة (ج.م)'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={printFee}
                    onChange={(e) => setPrintFee(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 text-sm font-bold tabular-nums focus:ring-1 focus:ring-blue-500"
                    placeholder="1.50"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium">ج.م</span>
                </div>
              </div>
            </div>

            {/* Section 3: Open Package Policy */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <PackageOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h2 className="text-sm sm:text-base font-bold">
                  {isEn ? 'Package Inspection Policy & Fees' : 'سياسة فتح ومعاينة الشحنات بالرسوم'}
                </h2>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {isEn ? 'Policy Mode' : 'وضع سياسة الفتح الافتراضي'}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label
                    className={`p-3.5 border rounded-xl cursor-pointer flex flex-col justify-between transition ${
                      openMode === 'ALWAYS_ALLOW'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {isEn ? 'Always Allow' : 'سماح دائم (ALWAYS_ALLOW)'}
                      </span>
                      <input
                        type="radio"
                        name="openMode"
                        value="ALWAYS_ALLOW"
                        checked={openMode === 'ALWAYS_ALLOW'}
                        onChange={() => setOpenMode('ALWAYS_ALLOW')}
                        className="text-blue-600"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isEn
                        ? 'All shipments marked allowOpenPackage=true and fee deducted once upon creation.'
                        : 'كل شحنة تسمح بالفتح تلقائياً وتُخصم الرسوم مرة واحدة عند الإنشاء.'}
                    </p>
                  </label>

                  <label
                    className={`p-3.5 border rounded-xl cursor-pointer flex flex-col justify-between transition ${
                      openMode === 'ASK_EACH'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {isEn ? 'Ask Each Shipment' : 'سؤال لكل شحنة (ASK_EACH)'}
                      </span>
                      <input
                        type="radio"
                        name="openMode"
                        value="ASK_EACH"
                        checked={openMode === 'ASK_EACH'}
                        onChange={() => setOpenMode('ASK_EACH')}
                        className="text-blue-600"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isEn
                        ? 'Default prohibited. Fee deducted only when courier confirms client approval.'
                        : 'افتراضياً ممنوع؛ وتُخصم رسوم الطلب فقط عند تأكيد الفتح بطلب العميل.'}
                    </p>
                  </label>

                  <label
                    className={`p-3.5 border rounded-xl cursor-pointer flex flex-col justify-between transition ${
                      openMode === 'ALWAYS_DENY'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {isEn ? 'Always Deny' : 'إغلاق دائم (ALWAYS_DENY)'}
                      </span>
                      <input
                        type="radio"
                        name="openMode"
                        value="ALWAYS_DENY"
                        checked={openMode === 'ALWAYS_DENY'}
                        onChange={() => setOpenMode('ALWAYS_DENY')}
                        className="text-blue-600"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isEn ? 'Inspections strictly prohibited for all shipments.' : 'ممنوع فتح ومعاينة الشحنات نهائياً بدون استثناء.'}
                    </p>
                  </label>
                </div>
              </div>

              {/* Pricing per mode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Always Allow Fee (EGP)' : 'رسوم السماح الدائم (ج.م)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={feeAlways}
                    onChange={(e) => setFeeAlways(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 text-sm font-semibold tabular-nums"
                    placeholder="2.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Ask Each Fee (EGP)' : 'رسوم تأكيد الفتح (ج.م)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={feeAsk}
                    onChange={(e) => setFeeAsk(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 text-sm font-semibold tabular-nums"
                    placeholder="5.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Deny Mode Fee (EGP)' : 'رسوم الإغلاق الدائم (ج.م)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={feeDeny}
                    onChange={(e) => setFeeDeny(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 text-sm font-semibold tabular-nums"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? (isEn ? 'Saving...' : 'جاري الحفظ...') : (isEn ? 'Save Policy Settings' : 'حفظ إعدادات السياسة والتوريد')}</span>
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default ShippingSettingsPage;
