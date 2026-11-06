import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Building2,
  Layers,
  MapPin,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  shippingOpsService,
  ClientPricingPackageItem,
  PackageInput,
  MerchantItem,
} from '../../services/shippingOpsService';
import { EGYPT_GOVERNORATES } from '../../constants/egyptGovernorates';
import { formatCurrency } from './shippingOpsShared';

interface ClientPackagesTabProps {
  merchants: MerchantItem[];
  isEn: boolean;
}

export const ClientPackagesTab: React.FC<ClientPackagesTabProps> = ({ merchants, isEn }) => {
  const [packages, setPackages] = useState<ClientPricingPackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMerchantId, setFilterMerchantId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ClientPricingPackageItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<PackageInput>({
    merchantId: '',
    name: '',
    monthlyVolumeFrom: 0,
    monthlyVolumeTo: 500,
    pricingMode: 'PER_SHIPMENT',
    perShipmentPrice: 55,
    flatMonthlyPrice: 0,
    coverageMode: 'BOTH',
    governorates: [],
    cities: '',
    overagePricePerShipment: 65,
    isActive: true,
  });

  const loadPackages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await shippingOpsService.getPackages({
        merchantId: filterMerchantId || undefined,
      });
      setPackages(res);
    } catch {
      toast.error(isEn ? 'Failed to load packages' : 'فشل تحميل باقات الشحن الشهرية');
    } finally {
      setLoading(false);
    }
  }, [filterMerchantId, isEn]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const handleOpenCreate = () => {
    setEditingPackage(null);
    setFormData({
      merchantId: merchants[0]?.id || '',
      name: '',
      monthlyVolumeFrom: 0,
      monthlyVolumeTo: 500,
      pricingMode: 'PER_SHIPMENT',
      perShipmentPrice: 55,
      flatMonthlyPrice: 0,
      coverageMode: 'BOTH',
      governorates: [],
      cities: '',
      overagePricePerShipment: 65,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pkg: ClientPricingPackageItem) => {
    setEditingPackage(pkg);
    let parsedGovs: string[] = [];
    try {
      if (pkg.governorates) {
        parsedGovs = typeof pkg.governorates === 'string' && pkg.governorates.startsWith('[')
          ? JSON.parse(pkg.governorates)
          : [pkg.governorates];
      }
    } catch {
      parsedGovs = [];
    }

    let parsedCitiesStr = '';
    try {
      if (pkg.cities) {
        const c = typeof pkg.cities === 'string' && pkg.cities.startsWith('[')
          ? JSON.parse(pkg.cities)
          : pkg.cities;
        parsedCitiesStr = Array.isArray(c) ? c.join('، ') : String(c);
      }
    } catch {
      parsedCitiesStr = pkg.cities || '';
    }

    setFormData({
      merchantId: pkg.merchantId,
      name: pkg.name,
      monthlyVolumeFrom: pkg.monthlyVolumeFrom,
      monthlyVolumeTo: pkg.monthlyVolumeTo ?? null,
      pricingMode: pkg.pricingMode,
      perShipmentPrice: pkg.perShipmentPrice ?? 0,
      flatMonthlyPrice: pkg.flatMonthlyPrice ?? 0,
      coverageMode: pkg.coverageMode,
      governorates: parsedGovs,
      cities: parsedCitiesStr,
      overagePricePerShipment: pkg.overagePricePerShipment,
      isActive: pkg.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.merchantId) {
      toast.error(isEn ? 'Please select a merchant' : 'يرجى اختيار العميل');
      return;
    }
    if (!formData.name.trim()) {
      toast.error(isEn ? 'Package name is required' : 'اسم الباقة مطلوب');
      return;
    }

    try {
      setSaving(true);
      const payload: PackageInput = {
        ...formData,
        monthlyVolumeFrom: Number(formData.monthlyVolumeFrom) || 0,
        monthlyVolumeTo: formData.monthlyVolumeTo ? Number(formData.monthlyVolumeTo) : null,
        perShipmentPrice: formData.pricingMode === 'PER_SHIPMENT' ? Number(formData.perShipmentPrice) || 0 : null,
        flatMonthlyPrice: formData.pricingMode === 'PACKAGE_FLAT' ? Number(formData.flatMonthlyPrice) || 0 : null,
        overagePricePerShipment: Number(formData.overagePricePerShipment) || 0,
        cities: typeof formData.cities === 'string'
          ? formData.cities.split(/[,،]+/).map((s) => s.trim()).filter(Boolean)
          : formData.cities,
      };

      if (editingPackage) {
        await shippingOpsService.updatePackage(editingPackage.id, payload);
        toast.success(isEn ? 'Package updated' : 'تم تحديث الباقة بنجاح');
      } else {
        await shippingOpsService.createPackage(payload);
        toast.success(isEn ? 'Package created' : 'تم إنشاء الباقة بنجاح');
      }
      setIsModalOpen(false);
      loadPackages();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ الباقة';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isEn ? 'Are you sure you want to delete this package?' : 'هل أنت متأكد من حذف هذه الباقة؟')) return;
    try {
      setDeletingId(id);
      await shippingOpsService.deletePackage(id);
      toast.success(isEn ? 'Package deleted' : 'تم حذف الباقة بنجاح');
      loadPackages();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر حذف الباقة';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action / Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-80">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filterMerchantId}
            onChange={(e) => setFilterMerchantId(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{isEn ? 'All Merchants' : 'جميع العملاء / التجار'}</option>
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={loadPackages}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${loading ? 'animate-spin' : ''}`} />
            <span>{isEn ? 'Refresh' : 'تحديث'}</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isEn ? 'Add Package' : 'إضافة باقة شهرية'}</span>
          </button>
        </div>
      </div>

      {/* Packages Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{isEn ? 'Package' : 'اسم الباقة'}</th>
                <th className="px-4 py-3 text-start font-medium">{isEn ? 'Merchant' : 'العميل'}</th>
                <th className="px-4 py-3 text-center font-medium">{isEn ? 'Volume Range' : 'شحنات الشهر'}</th>
                <th className="px-4 py-3 text-center font-medium">{isEn ? 'Pricing Mode' : 'نظام التسعير'}</th>
                <th className="px-4 py-3 text-center font-medium">{isEn ? 'Base Price' : 'السعر المشمول'}</th>
                <th className="px-4 py-3 text-center font-medium">{isEn ? 'Overage / Extra' : 'سعر الزيادة'}</th>
                <th className="px-4 py-3 text-start font-medium">{isEn ? 'Coverage' : 'نطاق التغطية'}</th>
                <th className="px-4 py-3 text-center font-medium">{isEn ? 'Status' : 'الحالة'}</th>
                <th className="px-4 py-3 text-center font-medium">{isEn ? 'Actions' : 'إجراء'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && packages.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>{isEn ? 'Loading packages...' : 'جاري تحميل باقات الشحن...'}</span>
                  </td>
                </tr>
              ) : packages.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p>{isEn ? 'No pricing packages found' : 'لا توجد باقات شهرية مضافة حتى الآن'}</p>
                  </td>
                </tr>
              ) : (
                packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{pkg.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {pkg.merchant?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-slate-800 dark:text-slate-200">
                      {pkg.monthlyVolumeFrom} - {pkg.monthlyVolumeTo ?? '∞'} {isEn ? 'sh.' : 'شحنة'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {pkg.pricingMode === 'PACKAGE_FLAT' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400">
                          {isEn ? 'Monthly Flat' : 'ثابت شهري'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400">
                          {isEn ? 'Per Shipment' : 'لكل شحنة'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-bold tabular-nums text-slate-900 dark:text-white">
                      {pkg.pricingMode === 'PACKAGE_FLAT'
                        ? formatCurrency(pkg.flatMonthlyPrice || 0)
                        : formatCurrency(pkg.perShipmentPrice || 0)}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-amber-600 dark:text-amber-400 font-medium">
                      +{formatCurrency(pkg.overagePricePerShipment || 0)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {pkg.coverageMode === 'BOTH' ? (isEn ? 'Govs & Cities' : 'محافظات ومدن') :
                           pkg.coverageMode === 'CITIES' ? (isEn ? 'Cities Only' : 'مدن محددة') : (isEn ? 'Govs Only' : 'محافظات')}
                        </span>
                        {pkg.cities && (
                          <span className="text-[11px] text-slate-500 truncate max-w-[180px]">
                            {pkg.cities}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {pkg.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Active' : 'مفعل'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Inactive' : 'معطل'}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(pkg)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition"
                          title={isEn ? 'Edit' : 'تعديل'}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(pkg.id)}
                          disabled={deletingId === pkg.id}
                          className="p-1 text-slate-400 hover:text-red-600 transition disabled:opacity-50"
                          title={isEn ? 'Delete' : 'حذف'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Package Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span>{editingPackage ? (isEn ? 'Edit Package' : 'تعديل باقة شهرية') : (isEn ? 'Add Pricing Package' : 'إضافة باقة شحن شهرية')}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Client / Merchant' : 'العميل / المتجر'} *
                </label>
                <select
                  required
                  value={formData.merchantId}
                  onChange={(e) => setFormData({ ...formData, merchantId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent dark:bg-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{isEn ? 'Select Client' : 'اختر العميل...'}</option>
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Package Name' : 'اسم الباقة'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={isEn ? 'e.g. VIP 500 Nasr City' : 'مثال: باقة 0–500 شحنة (مدينة نصر والتجمع)'}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Volume From' : 'الحد الأدنى للشحنات'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.monthlyVolumeFrom}
                    onChange={(e) => setFormData({ ...formData, monthlyVolumeFrom: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Volume To (Max)' : 'الحد الأعلى للشحنات'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.monthlyVolumeTo ?? ''}
                    onChange={(e) => setFormData({ ...formData, monthlyVolumeTo: e.target.value ? Number(e.target.value) : null })}
                    placeholder={isEn ? 'Unlimited' : 'مفتوح (اتركه فارغاً)'}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Pricing Mode' : 'طريقة الاحتساب'}
                  </label>
                  <select
                    value={formData.pricingMode}
                    onChange={(e) => setFormData({ ...formData, pricingMode: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent dark:bg-slate-900"
                  >
                    <option value="PER_SHIPMENT">{isEn ? 'Per Shipment (ج/شحنة)' : 'سعر لكل شحنة'}</option>
                    <option value="PACKAGE_FLAT">{isEn ? 'Flat Monthly (ثابت شهري)' : 'اشتراك شهري ثابت'}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {formData.pricingMode === 'PACKAGE_FLAT'
                      ? (isEn ? 'Monthly Fee (EGP)' : 'المبلغ الشهري الثابت')
                      : (isEn ? 'Price / Shipment (EGP)' : 'سعر الشحنة داخل الباقة')} *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={formData.pricingMode === 'PACKAGE_FLAT' ? (formData.flatMonthlyPrice ?? 0) : (formData.perShipmentPrice ?? 0)}
                    onChange={(e) => setFormData({
                      ...formData,
                      ...(formData.pricingMode === 'PACKAGE_FLAT'
                        ? { flatMonthlyPrice: Number(e.target.value) || 0 }
                        : { perShipmentPrice: Number(e.target.value) || 0 }),
                    })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Overage Price / Shipment (EGP)' : 'سعر كل شحنة زائدة بعد تجاوز الحد (Overage)'} *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={formData.overagePricePerShipment}
                  onChange={(e) => setFormData({ ...formData, overagePricePerShipment: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent tabular-nums"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Coverage Mode' : 'نوع التغطية'}
                  </label>
                  <select
                    value={formData.coverageMode}
                    onChange={(e) => setFormData({ ...formData, coverageMode: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent dark:bg-slate-900"
                  >
                    <option value="BOTH">{isEn ? 'Governorates & Cities' : 'محافظات ومدن معاً'}</option>
                    <option value="CITIES">{isEn ? 'Specific Cities Only' : 'مدن محددة فقط'}</option>
                    <option value="GOVERNORATES">{isEn ? 'Governorates Only' : 'محافظات فقط'}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Covered Cities (comma separated)' : 'المدن المشمولة (مفصولة بفواصل)'}
                  </label>
                  <input
                    type="text"
                    value={typeof formData.cities === 'string' ? formData.cities : ''}
                    onChange={(e) => setFormData({ ...formData, cities: e.target.value })}
                    placeholder={isEn ? 'Nasr City, New Cairo' : 'مدينة نصر، التجمع الخامس'}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300"
                />
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {isEn ? 'Package is Active' : 'الباقة مفعّلة وجاهزة للتسعير'}
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {isEn ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm disabled:opacity-50"
                >
                  {saving ? (isEn ? 'Saving...' : 'جاري الحفظ...') : (isEn ? 'Save Package' : 'حفظ الباقة')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
