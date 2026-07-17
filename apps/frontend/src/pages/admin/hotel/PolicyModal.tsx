import { useState } from "react";
import Modal, { INPUT_CLS, BTN_PRIMARY, BTN_GHOST } from "./Modal";
import { hotelApi, HotelPolicy } from "./shared";

export default function PolicyModal({
  data,
  onClose,
  onSaved,
  onError
}: {
  data?: HotelPolicy | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    checkInTime: data?.checkInTime || "14:00",
    checkOutTime: data?.checkOutTime || "12:00",
    earlyCheckInFee: data?.earlyCheckInFee ?? 0,
    lateCheckOutFee: data?.lateCheckOutFee ?? 0,
    cancelFreeBefore: data?.cancelFreeBefore ?? 5,
    cancelPenaltyPct: data?.cancelPenaltyPct ?? 100,
    childrenAllowed: data?.childrenAllowed ?? true,
    extraBedPrice: data?.extraBedPrice ?? 0,
    quietHoursFrom: data?.quietHoursFrom || "22:00",
    quietHoursTo: data?.quietHoursTo || "08:00",
    smokingAllowed: data?.smokingAllowed ?? false,
    visitorsAllowed: data?.visitorsAllowed ?? false,
    visitorsHours: data?.visitorsHours || "10:00-20:00",
    customRules: data?.customRules || [],
  });
  const [newRule, setNewRule] = useState("");

  const addRule = () => {
    if (!newRule.trim()) return;
    setForm({ ...form, customRules: [...form.customRules, newRule.trim()] });
    setNewRule("");
  };

  const removeRule = (i: number) => {
    setForm({ ...form, customRules: form.customRules.filter((_: any, idx: number) => idx !== i) });
  };

  const save = async () => {
    try {
      await hotelApi.policies.update(form);
      onSaved();
    } catch (e: any) {
      onError(e.message);
    }
  };

  return (
    <Modal title="سياسات الفندق" onClose={onClose}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div>
          <h3 className="text-sm font-medium mb-2">⏰ أوقات الدخول والخروج</h3>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-gray-500">تسجيل الوصول</label><input className={INPUT_CLS} value={form.checkInTime} onChange={e => setForm({ ...form, checkInTime: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">تسجيل المغادرة</label><input className={INPUT_CLS} value={form.checkOutTime} onChange={e => setForm({ ...form, checkOutTime: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">رسوم الدخول المبكر</label><input type="number" className={INPUT_CLS} value={form.earlyCheckInFee} onChange={e => setForm({ ...form, earlyCheckInFee: +e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">رسوم المغادرة المتأخرة</label><input type="number" className={INPUT_CLS} value={form.lateCheckOutFee} onChange={e => setForm({ ...form, lateCheckOutFee: +e.target.value })} /></div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">📋 سياسة الإلغاء</h3>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-gray-500">أيام الإلغاء المجاني</label><input type="number" className={INPUT_CLS} value={form.cancelFreeBefore} onChange={e => setForm({ ...form, cancelFreeBefore: +e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">نسبة الغرامة (%)</label><input type="number" className={INPUT_CLS} value={form.cancelPenaltyPct} onChange={e => setForm({ ...form, cancelPenaltyPct: +e.target.value })} /></div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">👶 سياسة الأطفال والأسرة</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.childrenAllowed} onChange={e => setForm({ ...form, childrenAllowed: e.target.checked })} />
              مسموح بوجود أطفال
            </label>
            <div className="pr-6">
              <label className="text-xs text-gray-500">سعر السرير الإضافي</label>
              <input type="number" className={INPUT_CLS} value={form.extraBedPrice} onChange={e => setForm({ ...form, extraBedPrice: +e.target.value })} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">🚭 سياسات عامة</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.smokingAllowed} onChange={e => setForm({ ...form, smokingAllowed: e.target.checked })} />
              التدخين مسموح
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.visitorsAllowed} onChange={e => setForm({ ...form, visitorsAllowed: e.target.checked })} />
              الزوار مسموح بهم
            </label>
            {form.visitorsAllowed && (
              <div className="pr-6">
                <label className="text-xs text-gray-500">أوقات الزيارة</label>
                <input className={INPUT_CLS} value={form.visitorsHours} onChange={e => setForm({ ...form, visitorsHours: e.target.value })} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-gray-500">هدوء من</label><input className={INPUT_CLS} value={form.quietHoursFrom} onChange={e => setForm({ ...form, quietHoursFrom: e.target.value })} /></div>
              <div><label className="text-xs text-gray-500">هدوء إلى</label><input className={INPUT_CLS} value={form.quietHoursTo} onChange={e => setForm({ ...form, quietHoursTo: e.target.value })} /></div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">📜 قواعد إضافية</h3>
          <div className="space-y-2">
            {form.customRules.map((rule: string, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <input className={INPUT_CLS} value={rule} onChange={e => {
                  const next = [...form.customRules];
                  next[i] = e.target.value;
                  setForm({ ...form, customRules: next });
                }} />
                <button className="text-red-500 text-sm" onClick={() => removeRule(i)}>×</button>
              </div>
            ))}
            <div className="flex gap-2">
              <input className={INPUT_CLS} placeholder="قاعدة جديدة..." value={newRule} onChange={e => setNewRule(e.target.value)} />
              <button className={BTN_GHOST} onClick={addRule}>+</button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button className={BTN_GHOST} onClick={onClose}>إلغاء</button>
        <button className={BTN_PRIMARY} onClick={save}>حفظ</button>
      </div>
    </Modal>
  );
}
