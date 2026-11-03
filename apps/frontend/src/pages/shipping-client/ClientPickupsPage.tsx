// @vitest-environment jsdom
/**
 * Shipping Client — Pickup Requests (SHIP-W2C)
 * Request pickup from merchant warehouse + list of scheduled pickups
 */

import React, { useState, useEffect } from 'react';
import { shippingClientApi } from './useShippingClientApi';

const GOVERNORATES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'القليوبية', 'الدقهلية', 'الشرقية',
  'المنوفية', 'الغربية', 'كفر الشيخ', 'دمياط', 'بورسعيد', 'الإسماعيلية',
  'السويس', 'بني سويف', 'الفيوم', 'المنيا', 'أسيوط', 'سوهاج', 'قنا',
  'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد', 'مطروح', 'شمال سيناء', 'جنوب سيناء'
];

const PICKUP_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  REQUESTED: { label: 'قيد الطلب', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  SCHEDULED: { label: 'مجدول', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  ASSIGNED: { label: 'تم إسناد مندوب', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  COMPLETED: { label: 'تم الاستلام', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'ملغي', className: 'bg-gray-100 text-gray-700 border-gray-200' },
};

export default function ClientPickupsPage() {
  const [pickups, setPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [showModal, setShowModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [governorate, setGovernorate] = useState('القاهرة');
  const [city, setCity] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('10:00 - 14:00');
  const [expectedParcels, setExpectedParcels] = useState(5);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadPickups = () => {
    setLoading(true);
    shippingClientApi
      .getPickups()
      .then((res) => {
        setPickups(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'فشل في تحميل طلبات البيكاب');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadPickups();
  }, []);

  const handleCreatePickup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!contactName.trim() || !contactPhone.trim() || !pickupAddress.trim() || !scheduledDate) {
      setFormError('يرجى ملء جميع الحقول الإلزامية');
      return;
    }

    setSubmitting(true);
    try {
      await shippingClientApi.createPickup({
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        pickupAddress: pickupAddress.trim(),
        governorate,
        city: city.trim() || undefined,
        scheduledDate,
        timeSlot,
        expectedParcels: Number(expectedParcels) || 1,
        notes: notes.trim() || undefined,
      });

      setShowModal(false);
      loadPickups();
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء إرسال طلب البيكاب');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-lg font-bold text-gray-900">طلبات الاستلام (البيكاب)</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            طلب حضور مندوب الشحن لاستلام الطرود من مقرك أو مخزنك
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-sm transition-colors self-start sm:self-auto"
        >
          + طلب بيكاب جديد
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-400">جاري تحميل طلبات البيكاب...</div>
        ) : pickups.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400">لا توجد طلبات بيكاب سابقة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 font-medium">رقم الطلب</th>
                  <th className="px-4 py-2.5 font-medium">تاريخ الاستلام</th>
                  <th className="px-4 py-2.5 font-medium">الفترة</th>
                  <th className="px-4 py-2.5 font-medium">مسؤول التواصل</th>
                  <th className="px-4 py-2.5 font-medium">عنوان الاستلام</th>
                  <th className="px-4 py-2.5 font-medium">الطرود المتوقعة</th>
                  <th className="px-4 py-2.5 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pickups.map((p) => {
                  const statusInfo = PICKUP_STATUS_STYLES[p.status] || {
                    label: p.status,
                    className: 'bg-gray-50 text-gray-600 border-gray-200',
                  };
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-blue-600">
                        {p.pickupNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium tabular-nums">
                        {new Date(p.scheduledDate).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.timeSlot || 'طوال اليوم'}</td>
                      <td className="px-4 py-3 text-gray-900">
                        {p.contactName} ({p.contactPhone})
                      </td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">
                        {p.governorate} — {p.pickupAddress}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-semibold text-gray-900">
                        {p.expectedParcels} طرد
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${statusInfo.className}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-gray-200 w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">طلب بيكاب جديد</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreatePickup} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">اسم المسؤول *</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="أحمد علي"
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">رقم الهاتف *</label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="w-full px-3 py-2 border border-gray-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">المحافظة *</label>
                  <select
                    value={governorate}
                    onChange={(e) => setGovernorate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
                  >
                    {GOVERNORATES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">المدينة / المنطقة</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="العبور، العاشر من رمضان..."
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">عنوان الاستلام بالتفصيل *</label>
                <input
                  type="text"
                  required
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="الشارع، المخزن، المعلم المميز"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">تاريخ الاستلام *</label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-2.5 py-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">الفترة الزمنية</label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded bg-white"
                  >
                    <option value="10:00 - 14:00">صباحاً (10 - 2)</option>
                    <option value="14:00 - 18:00">مساءً (2 - 6)</option>
                    <option value="طوال اليوم">طوال اليوم</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">عدد الطرود</label>
                  <input
                    type="number"
                    min="1"
                    value={expectedParcels}
                    onChange={(e) => setExpectedParcels(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 border border-gray-300 rounded tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="تعليمات للمندوب أو موقع المخزن"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'جاري الإرسال...' : 'تأكيد الطلب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
