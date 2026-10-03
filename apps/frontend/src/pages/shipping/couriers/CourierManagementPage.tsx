import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  TruckIcon,
  PlusIcon,
  PhoneIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  BanknotesIcon,
  CubeIcon,
  Cog6ToothIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import courierService, { Courier, CourierDashboardSummary, CourierInput } from '../../../services/courierService';
import { useCurrency } from '../../../hooks/useCurrency';

const VEHICLE_LABELS: Record<string, string> = {
  MOTORCYCLE: 'دراجة نارية / موتوسيكل',
  CAR: 'سيارة ملاكي',
  VAN: 'فان / سيارة نقل بضائع',
  BICYCLE: 'دراجة هوائية',
  ON_FOOT: 'توصيل راجل'
};

const CourierManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [summary, setSummary] = useState<CourierDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [saving, setSaving] = useState(false);
  const [fleetSettings, setFleetSettings] = useState<any>(null);
  const [formData, setFormData] = useState<CourierInput>({
    name: '',
    phone: '',
    nationalId: '',
    vehicleType: 'MOTORCYCLE',
    plateNumber: '',
    governorates: '',
    commissionType: 'FIXED_PER_ORDER',
    commissionAmount: 0,
    isActive: true,
    notes: ''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [couriersRes, summaryRes, settings] = await Promise.all([
        courierService.getCouriers({
          search: search || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined
        }),
        courierService.getSummary(),
        courierService.getFleetSettings()
      ]);

      if (couriersRes.success) setCouriers(couriersRes.data || []);
      if (summaryRes.success) setSummary(summaryRes.data || null);
      if (settings) setFleetSettings(settings);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل بيانات المناديب');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreate = () => {
    setEditingCourier(null);
    const defaultType = fleetSettings?.commission?.defaultType;
    const mappedType = defaultType === 'PERCENTAGE'
      ? 'PERCENTAGE'
      : defaultType === 'FIXED_SALARY'
      ? 'FIXED_SALARY'
      : 'FIXED_PER_ORDER';
    const defaultAmount = Number(fleetSettings?.commission?.defaultValue ?? 30);

    setFormData({
      name: '',
      phone: '',
      nationalId: '',
      vehicleType: 'MOTORCYCLE',
      plateNumber: '',
      governorates: '',
      commissionType: mappedType,
      commissionAmount: defaultAmount,
      isActive: true,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Courier) => {
    setEditingCourier(c);
    setFormData({
      name: c.name,
      phone: c.phone,
      nationalId: c.nationalId || '',
      vehicleType: c.vehicleType,
      plateNumber: c.plateNumber || '',
      governorates: c.governorates || '',
      commissionType: c.commissionType,
      commissionAmount: c.commissionAmount,
      isActive: c.isActive,
      notes: c.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('الاسم ورقم الهاتف حقول مطلوبة');
      return;
    }

    setSaving(true);
    try {
      if (editingCourier) {
        await courierService.updateCourier(editingCourier.id, formData);
        toast.success('تم تحديث بيانات المندوب بنجاح');
      } else {
        await courierService.createCourier(formData);
        toast.success('تمت إضافة المندوب بنجاح');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل حفظ بيانات المندوب');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف أو تعطيل المندوب "${name}"؟`)) return;
    try {
      await courierService.deleteCourier(id);
      toast.success('تم حذف/تعطيل المندوب');
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر إتمام العملية');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">إدارة المناديب والتوصيل الداخلي</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            متابعة أسطول التوصيل الداخلي، أداء المناديب، ومراقبة العهد النقدية والبضائع في الميدان
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/shipping/delivery-runs"
            className="px-3.5 py-2 text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            رحلات التوزيع والمانيفست
          </Link>
          <Link
            to="/shipping/courier-settlements"
            className="px-3.5 py-2 text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            التوريد المالي وتسوية الوردية
          </Link>
          <Link
            to="/marketplace/apps/internal-courier-fleet/settings"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Cog6ToothIcon className="w-4 h-4 text-slate-500" />
            إعدادات الأسطول
          </Link>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-slate-900 dark:bg-slate-50 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition active:scale-95"
          >
            <PlusIcon className="w-4 h-4" />
            إضافة مندوب جديد
          </button>
        </div>
      </div>

      {/* Telemetry Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="text-xs text-slate-500 dark:text-slate-400">إجمالي الأسطول</div>
            <div className="text-xl font-bold mt-1 tabular-nums">{summary.totalCouriers}</div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="text-xs text-slate-500 dark:text-slate-400">مناديب في الميدان</div>
            <div className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 tabular-nums">
              {summary.activeCouriers}
            </div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="text-xs text-slate-500 dark:text-slate-400">مناديب متاحين</div>
            <div className="text-xl font-bold mt-1 tabular-nums">{summary.availableCouriers}</div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="text-xs text-slate-500 dark:text-slate-400">طرود في الطريق</div>
            <div className="text-xl font-bold mt-1 text-blue-600 dark:text-blue-400 tabular-nums">
              {summary.totalParcelsInField}
            </div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="text-xs text-slate-500 dark:text-slate-400">كاش متوقع بالشارع</div>
            <div className="text-sm sm:text-base font-bold mt-1 tabular-nums">
              {formatPrice(summary.totalExpectedCashInField)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20">
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">بانتظار التوريد للخزينة</div>
            <div className="text-sm sm:text-base font-bold mt-1 text-amber-900 dark:text-amber-300 tabular-nums">
              {formatPrice(summary.totalCashAwaitingRemittance)}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlassIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالاسم، الهاتف، أو رقم اللوحة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
          >
            <option value="ALL">كل حالات العمل</option>
            <option value="AVAILABLE">متاح بالمقر</option>
            <option value="ON_DUTY">في المأمورية</option>
            <option value="OFF_DUTY">خارج الدوام</option>
          </select>
          <button
            onClick={fetchData}
            title="تحديث"
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Couriers Grid/Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4 font-medium">المندوب</th>
                <th className="py-3 px-4 font-medium">وسيلة الانتقال</th>
                <th className="py-3 px-4 font-medium">الحالة</th>
                <th className="py-3 px-4 font-medium">شحنات جارية</th>
                <th className="py-3 px-4 font-medium">كاش معلق بالعهدة</th>
                <th className="py-3 px-4 font-medium">نسبة النجاح</th>
                <th className="py-3 px-4 font-medium text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {couriers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    لا يوجد مناديب مسجلين حالياً تطابق معايير البحث
                  </td>
                </tr>
              ) : (
                couriers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5" dir="ltr">
                        <PhoneIcon className="w-3.5 h-3.5" />
                        {c.phone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs">{VEHICLE_LABELS[c.vehicleType] || c.vehicleType}</div>
                      {c.plateNumber && (
                        <div className="text-[11px] text-slate-400 tabular-nums">لوحة: {c.plateNumber}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {c.status === 'ON_DUTY' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          في الميدان
                        </span>
                      ) : c.status === 'AVAILABLE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          متاح بالمقر
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                          خارج الدوام
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 tabular-nums">
                      {c.activeShipmentsCount > 0 ? (
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {c.activeShipmentsCount} طرد
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 tabular-nums font-medium">
                      {c.pendingSettlementCash > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          {formatPrice(c.pendingSettlementCash)}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 tabular-nums">
                      <span className={`font-semibold ${c.successRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {c.successRate}%
                      </span>
                    </td>
                      <td className="py-3.5 px-4 text-left">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={async () => {
                            const pin = window.prompt(
                              `تعيين رمز PIN ميداني للمندوب ${c.name} (من 4 إلى 6 أرقام).\nاتركه فاضي وألغِ لإلغاء الرمز الحالي.`
                            );
                            if (pin === null) return;
                            if (pin.trim() !== '' && !/^\d{4,6}$/.test(pin.trim())) {
                              toast.error('رمز PIN يجب أن يكون من 4 إلى 6 أرقام');
                              return;
                            }
                            try {
                              const res = await courierService.setCourierPin(c.id, pin.trim() || null);
                              if (res.success) toast.success(res.message || 'تم التحديث');
                            } catch (err: any) {
                              toast.error(err?.message || 'تعذر تعيين رمز PIN');
                            }
                          }}
                          title="تعيين/إلغاء رمز PIN الميداني"
                          className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                          <KeyIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          title="تعديل بيانات المندوب"
                          className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          title="حذف المندوب"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base sm:text-lg">
                {editingCourier ? 'تعديل بيانات المندوب' : 'إضافة مندوب توصيل داخلي'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">اسم المندوب *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                    placeholder="مثال: أحمد عبد الله"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">رقم الهاتف *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">الرقم القومي (اختياري)</label>
                  <input
                    type="text"
                    value={formData.nationalId || ''}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                    placeholder="14 رقم"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">وسيلة الانتقال</label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                  >
                    <option value="MOTORCYCLE">دراجة نارية / موتوسيكل</option>
                    <option value="CAR">سيارة ملاكي</option>
                    <option value="VAN">فان / نقل بضائع</option>
                    <option value="BICYCLE">دراجة هوائية</option>
                    <option value="ON_FOOT">راجل / مشياً</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">رقم اللوحة / المركبة</label>
                  <input
                    type="text"
                    value={formData.plateNumber || ''}
                    onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                    placeholder="مثال: أ ب ج 123"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">عمولة التوصيل للطرد (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.commissionAmount || 0}
                    onChange={(e) => setFormData({ ...formData, commissionAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">المناطق / خطوط السير المغطاة</label>
                <input
                  type="text"
                  value={formData.governorates || ''}
                  onChange={(e) => setFormData({ ...formData, governorates: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                  placeholder="مثال: القاهرة، مدينة نصر، مصر الجديدة، التجمع"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">ملاحظات داخلية</label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                  placeholder="أي تفاصيل خاصة بالمندوب..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-white bg-slate-900 dark:bg-slate-50 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : editingCourier ? 'حفظ التعديلات' : 'إضافة المندوب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourierManagementPage;
