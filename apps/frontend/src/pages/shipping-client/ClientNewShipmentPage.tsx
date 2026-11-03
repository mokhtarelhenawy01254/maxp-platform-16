// @vitest-environment jsdom
/**
 * Shipping Client — New Shipment Form (SHIP-W2C)
 * Instant rate-card calculation + full parcel creation fields
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { shippingClientApi } from './useShippingClientApi';

const GOVERNORATES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'القليوبية', 'الدقهلية', 'الشرقية',
  'المنوفية', 'الغربية', 'كفر الشيخ', 'دمياط', 'بورسعيد', 'الإسماعيلية',
  'السويس', 'بني سويف', 'الفيوم', 'المنيا', 'أسيوط', 'سوهاج', 'قنا',
  'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد', 'مطروح', 'شمال سيناء', 'جنوب سيناء'
];

interface RateCard {
  id: string;
  name: string;
  governorateCode: string | null;
  basePrice: number;
  baseWeightKg: number;
  extraKgPrice: number;
  codFeeFixed: number;
  codFeePercent: number;
  returnFee: number;
}

export default function ClientNewShipmentPage() {
  const navigate = useNavigate();
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);

  // Form State
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientPhone2, setRecipientPhone2] = useState('');
  const [destinationGovernorate, setDestinationGovernorate] = useState('القاهرة');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [pieces, setPieces] = useState(1);
  const [weight, setWeight] = useState(1);
  const [codAmount, setCodAmount] = useState<number | ''>(0);
  const [declaredValue, setDeclaredValue] = useState<number | ''>('');
  const [contentDescription, setContentDescription] = useState('');
  const [isFragile, setIsFragile] = useState(false);
  const [allowOpenPackage, setAllowOpenPackage] = useState(true);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSuccess, setCreatedSuccess] = useState<any | null>(null);

  // Fetch client rate cards on load
  useEffect(() => {
    shippingClientApi
      .getRateCard()
      .then((res) => {
        setRateCards(res.data || []);
        setLoadingCards(false);
      })
      .catch(() => {
        setLoadingCards(false);
      });
  }, []);

  // Instant Price Calculation from Client's Rate Card
  const livePriceQuote = useMemo(() => {
    if (!rateCards || rateCards.length === 0) return null;

    // 1. Find matching card for this governorate
    const card =
      rateCards.find((c) => c.governorateCode === destinationGovernorate) ||
      rateCards.find((c) => !c.governorateCode) ||
      rateCards[0];

    if (!card) return null;

    const basePrice = Number(card.basePrice) || 0;
    const baseWeightKg = Number(card.baseWeightKg) || 1;
    const extraKgPrice = Number(card.extraKgPrice) || 0;
    const codFeeFixed = Number(card.codFeeFixed) || 0;
    const codFeePercent = Number(card.codFeePercent) || 0;

    const w = Number(weight) || 1;
    const extraWeight = Math.max(0, Math.ceil(w - baseWeightKg));
    const extraFee = extraWeight * extraKgPrice;

    const cod = Number(codAmount) || 0;
    const codFee = cod > 0 ? codFeeFixed + (cod * codFeePercent) / 100 : 0;

    const total = basePrice + extraFee + codFee;

    return {
      total,
      basePrice,
      extraFee,
      codFee,
      cardName: card.name,
    };
  }, [rateCards, destinationGovernorate, weight, codAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!recipientName.trim()) {
      setError('اسم المستلم مطلوب');
      return;
    }
    if (!recipientPhone.trim()) {
      setError('رقم الهاتف مطلوب');
      return;
    }
    if (!destinationAddress.trim()) {
      setError('العنوان التفصيلي مطلوب');
      return;
    }

    setSubmitting(true);
    try {
      const res = await shippingClientApi.createShipment({
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        recipientPhone2: recipientPhone2.trim() || undefined,
        destinationGovernorate,
        destinationCity: destinationCity.trim() || undefined,
        destinationAddress: destinationAddress.trim(),
        pieces: Number(pieces) || 1,
        weight: Number(weight) || 1,
        codAmount: codAmount === '' ? 0 : Number(codAmount),
        declaredValue: declaredValue === '' ? undefined : Number(declaredValue),
        contentDescription: contentDescription.trim() || undefined,
        isFragile,
        allowOpenPackage,
        notes: notes.trim() || undefined,
      });

      setCreatedSuccess(res.data);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إنشاء الشحنة');
    } finally {
      setSubmitting(false);
    }
  };

  if (createdSuccess) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-lg border border-gray-200 p-6 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
          ✓
        </div>
        <h2 className="text-lg font-bold text-gray-900">تم إنشاء الشحنة بنجاح</h2>
        <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm">
          <span className="text-gray-500">رقم البوليصة: </span>
          <span className="font-mono font-bold text-blue-600">{createdSuccess.trackingNumber}</span>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => {
              setCreatedSuccess(null);
              setRecipientName('');
              setRecipientPhone('');
              setRecipientPhone2('');
              setDestinationAddress('');
              setCodAmount(0);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            إنشاء شحنة أخرى
          </button>
          <button
            onClick={() => navigate(`/client-portal/shipping/shipments/${createdSuccess.id}`)}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
          >
            عرض التفاصيل
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">إنشاء شحنة جديدة</h1>
          <p className="text-xs text-gray-500 mt-0.5">تسجيل طرد جديد مع تسعير فوري ومباشر وفق بطاقتك</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Fields (2 Cols) */}
        <div className="md:col-span-2 bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 pb-2 border-b border-gray-100">
            بيانات المستلم والتسليم
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">اسم المستلم *</label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="أحمد محمد"
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">رقم الهاتف الأساسي *</label>
              <input
                type="tel"
                required
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="010XXXXXXXX"
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">رقم هاتف بديل (اختياري)</label>
              <input
                type="tel"
                value={recipientPhone2}
                onChange={(e) => setRecipientPhone2(e.target.value)}
                placeholder="011XXXXXXXX"
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">المحافظة *</label>
              <select
                value={destinationGovernorate}
                onChange={(e) => setDestinationGovernorate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
              >
                {GOVERNORATES.map((gov) => (
                  <option key={gov} value={gov}>
                    {gov}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">المدينة / المنطقة</label>
              <input
                type="text"
                value={destinationCity}
                onChange={(e) => setDestinationCity(e.target.value)}
                placeholder="مدينة نصر / الدقي"
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">العنوان التفصيلي *</label>
              <input
                type="text"
                required
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="الشارع، رقم العمارة، الشقة"
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <h2 className="text-sm font-semibold text-gray-900 pt-3 pb-2 border-b border-gray-100">
            مواصفات الطرد والتحصيل
          </h2>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">عدد القطع</label>
              <input
                type="number"
                min="1"
                value={pieces}
                onChange={(e) => setPieces(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">الوزن (كجم)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 1)}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">مبلغ COD (ج.م)</label>
              <input
                type="number"
                min="0"
                value={codAmount}
                onChange={(e) => setCodAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded tabular-nums font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">وصف المحتوى</label>
            <input
              type="text"
              value={contentDescription}
              onChange={(e) => setContentDescription(e.target.value)}
              placeholder="ملابس، إلكترونيات، مستحضرات..."
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="inline-flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isFragile}
                onChange={(e) => setIsFragile(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>طرد قابل للكسر</span>
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allowOpenPackage}
                onChange={(e) => setAllowOpenPackage(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>السماح بفتح الشحنة للمعاينة</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">ملاحظات للمندوب</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="الاتصال قبل الوصول، مواعيد محددة..."
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded"
            />
          </div>
        </div>

        {/* Live Rate Card Preview (1 Col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-xs font-bold text-gray-900 pb-2 border-b border-gray-100">
              تسعير لحظي (بطاقة الأسعار)
            </h3>

            {loadingCards ? (
              <div className="text-xs text-gray-400 py-4 text-center">جاري جلب الأسعار...</div>
            ) : livePriceQuote ? (
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>سعر الشحن الأساسي:</span>
                  <span className="tabular-nums font-medium">{livePriceQuote.basePrice} ج.م</span>
                </div>
                {livePriceQuote.extraFee > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>رسوم وزن إضافي:</span>
                    <span className="tabular-nums font-medium">+{livePriceQuote.extraFee} ج.م</span>
                  </div>
                )}
                {livePriceQuote.codFee > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>رسوم تحصيل COD:</span>
                    <span className="tabular-nums font-medium">+{livePriceQuote.codFee} ج.م</span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-100 flex justify-between items-baseline font-bold text-sm text-gray-900">
                  <span>إجمالي تكلفة الشحن:</span>
                  <span className="text-blue-600 tabular-nums text-base">{livePriceQuote.total} ج.م</span>
                </div>
                <div className="text-[11px] text-gray-400 pt-1">
                  البطاقة المطبقة: {livePriceQuote.cardName}
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-400 py-3 text-center">
                يتم احتساب السعر تلقائياً وفق سياسة الشركة
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded shadow-sm transition-colors"
            >
              {submitting ? 'جاري الحفظ...' : 'تأكيد وحفظ الشحنة'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
