import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Building2,
  MapPin,
  Scale,
  Banknote,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  shippingOpsService,
  ClientRateCardItem,
  RateCardInput,
  MerchantItem,
} from '../../services/shippingOpsService';
import { EGYPT_GOVERNORATES } from '../../constants/egyptGovernorates';
import { formatCurrency } from './shippingOpsShared';

export const RateCardsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [rateCards, setRateCards] = useState<ClientRateCardItem[]>([]);
  const [merchants, setMerchants] = useState<MerchantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter
  const [filterMerchantId, setFilterMerchantId] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ClientRateCardItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<RateCardInput>({
    merchantId: '',
    name: '',
    governorateCode: '',
    basePrice: 60,
    baseWeightKg: 1,
    extraKgPrice: 10,
    codFeeFixed: 0,
    codFeePercent: 0,
    returnFee: 20,
    isActive: true,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [cards, merchs] = await Promise.all([
        shippingOpsService.getRateCards({ merchantId: filterMerchantId || undefined }),
        shippingOpsService.getMerchants(),
      ]);
      setRateCards(cards);
      setMerchants(merchs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('shippingOps.loadError', 'حدث خطأ أثناء تحميل بطاقات الأسعار');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filterMerchantId, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingCard(null);
    setFormData({
      merchantId: merchants[0]?.id || '',
      name: '',
      governorateCode: '',
      basePrice: 60,
      baseWeightKg: 1,
      extraKgPrice: 10,
      codFeeFixed: 0,
      codFeePercent: 0,
      returnFee: 20,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (card: ClientRateCardItem) => {
    setEditingCard(card);
    setFormData({
      merchantId: card.merchantId,
      name: card.name,
      governorateCode: card.governorateCode || '',
      basePrice: Number(card.basePrice),
      baseWeightKg: Number(card.baseWeightKg || 1),
      extraKgPrice: Number(card.extraKgPrice || 0),
      codFeeFixed: Number(card.codFeeFixed || 0),
      codFeePercent: Number(card.codFeePercent || 0),
      returnFee: Number(card.returnFee || 0),
      isActive: card.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.merchantId) {
      toast.error('يرجى تحديد العميل/التاجر');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('اسم بطاقة السعر مطلوب');
      return;
    }

    try {
      setSaving(true);
      if (editingCard) {
        await shippingOpsService.updateRateCard(editingCard.id, formData);
        toast.success(isEn ? 'Rate card updated' : 'تم تحديث بطاقة السعر بنجاح');
      } else {
        await shippingOpsService.createRateCard(formData);
        toast.success(isEn ? 'Rate card created' : 'تم إنشاء بطاقة السعر بنجاح');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر حفظ بطاقة السعر';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(isEn ? 'Delete this rate card?' : 'هل أنت متأكد من رغبتك في حذف بطاقة السعر هذه؟')) {
      return;
    }
    try {
      setDeletingId(id);
      await shippingOpsService.deleteRateCard(id);
      toast.success(isEn ? 'Rate card deleted' : 'تم حذف بطاقة السعر');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر حذف بطاقة السعر';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-[1800px] mx-auto text-slate-900 dark:text-slate-100">
      {/* Header (No nav element) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t('shippingOps.rateCardsPage.title', 'بطاقات أسعار العملاء')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('shippingOps.rateCardsPage.subtitle', 'تخصيص أسعار شحن خاصة ومخصصة لكل تاجر وعميل حسب المحافظات والوزن')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadData}
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
            <span>{t('shippingOps.rateCardsPage.addRateCard', 'إضافة بطاقة سعر')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* Filter by Merchant */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 shadow-sm">
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
        {filterMerchantId && (
          <button
            onClick={() => setFilterMerchantId('')}
            className="text-xs text-rose-600 hover:underline"
          >
            إلغاء التصفية
          </button>
        )}
      </div>

      {/* Rate Cards Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right rtl:text-right ltr:text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">{t('shippingOps.rateCardsPage.name', 'اسم البطاقة')}</th>
                <th className="px-4 py-3 font-medium">{t('shippingOps.rateCardsPage.merchant', 'العميل')}</th>
                <th className="px-4 py-3 font-medium">{t('shippingOps.rateCardsPage.governorate', 'المحافظة')}</th>
                <th className="px-4 py-3 font-medium">{t('shippingOps.rateCardsPage.basePrice', 'السعر الأساسي')}</th>
                <th className="px-4 py-3 font-medium">{t('shippingOps.rateCardsPage.baseWeight', 'الوزن المشمول')}</th>
                <th className="px-4 py-3 font-medium">{t('shippingOps.rateCardsPage.extraKgPrice', 'سعر الكيلو الزائد')}</th>
                <th className="px-4 py-3 font-medium">{t('shippingOps.rateCardsPage.codFee', 'رسوم COD')}</th>
                <th className="px-4 py-3 font-medium">{t('shippingOps.rateCardsPage.returnFee', 'رسوم المرتجع')}</th>
                <th className="px-4 py-3 font-medium">{t('shippingOps.rateCardsPage.status', 'الحالة')}</th>
                <th className="px-4 py-3 font-medium text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && rateCards.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>{isEn ? 'Loading rate cards...' : 'جاري تحميل بطاقات الأسعار...'}</span>
                  </td>
                </tr>
              ) : rateCards.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <span>{t('shippingOps.rateCardsPage.noRateCards', 'لا توجد بطاقات أسعار مسجلة')}</span>
                  </td>
                </tr>
              ) : (
                rateCards.map((rc) => (
                  <tr key={rc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {rc.name}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {rc.merchant?.name || rc.merchantId}
                    </td>
                    <td className="px-4 py-3">
                      {rc.governorateCode ? (
                        <span className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{rc.governorateCode}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          عام (كل المحافظات)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(Number(rc.basePrice))}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">
                      {rc.baseWeightKg} كجم
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">
                      {formatCurrency(Number(rc.extraKgPrice))}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">
                      {Number(rc.codFeeFixed) > 0 ? `${rc.codFeeFixed} ج` : ''}
                      {Number(rc.codFeePercent) > 0 ? ` + ${rc.codFeePercent}%` : ''}
                      {Number(rc.codFeeFixed) === 0 && Number(rc.codFeePercent) === 0 ? 'مجاني' : ''}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">
                      {formatCurrency(Number(rc.returnFee))}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        rc.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {rc.isActive ? 'مفعلة' : 'معطلة'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(rc)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                          title="تعديل"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rc.id)}
                          disabled={deletingId === rc.id}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition disabled:opacity-50"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal: Create or Edit Rate Card */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-base">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>
                  {editingCard
                    ? t('shippingOps.rateCardsPage.editRateCard', 'تعديل بطاقة السعر')
                    : t('shippingOps.rateCardsPage.addRateCard', 'إضافة بطاقة سعر جديدة')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    العميل / التاجر <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.merchantId}
                    onChange={(e) => setFormData((p) => ({ ...p, merchantId: e.target.value }))}
                    disabled={Boolean(editingCard)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">اختر العميل...</option>
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    اسم بطاقة السعر <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: تسعير القاهرة الكبرى، تسعير الصعيد"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    المحافظة (اتركها فارغة لتعميمها على جميع المحافظات)
                  </label>
                  <select
                    value={formData.governorateCode || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, governorateCode: e.target.value || null }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('shippingOps.rateCardsPage.allGovernorates', 'عام (كل المحافظات)')}</option>
                    {EGYPT_GOVERNORATES.map((g) => (
                      <option key={g.id} value={g.nameAr}>
                        {isEn ? g.nameEn : g.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    السعر الأساسي (جنيه) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={formData.basePrice}
                    onChange={(e) => setFormData((p) => ({ ...p, basePrice: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    الوزن المشمول (كجم)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.baseWeightKg}
                    onChange={(e) => setFormData((p) => ({ ...p, baseWeightKg: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    سعر الكيلو الزائد (جنيه)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.extraKgPrice}
                    onChange={(e) => setFormData((p) => ({ ...p, extraKgPrice: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    رسوم المرتجع (جنيه)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.returnFee}
                    onChange={(e) => setFormData((p) => ({ ...p, returnFee: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    رسوم COD ثابتة (جنيه)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.codFeeFixed}
                    onChange={(e) => setFormData((p) => ({ ...p, codFeeFixed: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    رسوم COD نسبة (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.codFeePercent}
                    onChange={(e) => setFormData((p) => ({ ...p, codFeePercent: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
                  />
                </div>

                <div className="sm:col-span-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      تفعيل بطاقة السعر للاستخدام الفوري
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-3.5 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : t('shippingOps.rateCardsPage.saveRateCard', 'حفظ البطاقة')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RateCardsPage;
