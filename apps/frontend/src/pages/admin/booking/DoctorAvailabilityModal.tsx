import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { BookingDoctor, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, DoctorAvailability, api, getAuthHeaders } from "./shared";

interface Props {
  doctor: BookingDoctor;
  onClose: () => void;
  onSaved: () => void;
}

const DAYS = [
  { value: 0, label: "الأحد" },
  { value: 1, label: "الإثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
  { value: 6, label: "السبت" },
];

interface DaySlot { isAvailable: boolean; startTime: string; endTime: string; }

export default function DoctorAvailabilityModal({ doctor, onClose, onSaved }: Props) {
  const [slots, setSlots] = useState<Record<number, DaySlot>>({
    0: { isAvailable: false, startTime: "09:00", endTime: "17:00" },
    1: { isAvailable: false, startTime: "09:00", endTime: "17:00" },
    2: { isAvailable: false, startTime: "09:00", endTime: "17:00" },
    3: { isAvailable: false, startTime: "09:00", endTime: "17:00" },
    4: { isAvailable: false, startTime: "09:00", endTime: "17:00" },
    5: { isAvailable: false, startTime: "09:00", endTime: "17:00" },
    6: { isAvailable: false, startTime: "09:00", endTime: "17:00" },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(api(`doctors/availability?doctorId=${doctor.id}`), { headers: getAuthHeaders() });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "فشل التحميل");
        const data: DoctorAvailability[] = json.data || [];
        setSlots(prev => {
          const next = { ...prev };
          for (const a of data) {
            next[a.dayOfWeek] = { isAvailable: a.isAvailable, startTime: a.startTime, endTime: a.endTime };
          }
          return next;
        });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "خطأ");
      } finally {
        setLoading(false);
      }
    })();
  }, [doctor.id]);

  const updateDay = (day: number, patch: Partial<DaySlot>) => {
    setSlots(prev => {
      const cur = prev[day] || { isAvailable: false, startTime: "09:00", endTime: "17:00" };
      return { ...prev, [day]: { isAvailable: patch.isAvailable ?? cur.isAvailable, startTime: patch.startTime ?? cur.startTime, endTime: patch.endTime ?? cur.endTime } };
    });
  };

  const toggleAll = (available: boolean) => {
    setSlots(prev => {
      const next: Record<number, DaySlot> = {};
      for (const d of DAYS) {
        const cur = prev[d.value] || { isAvailable: false, startTime: "09:00", endTime: "17:00" };
        next[d.value] = { ...cur, isAvailable: available };
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const payload = DAYS.map(d => ({ ...slots[d.value], dayOfWeek: d.value }));
      const res = await fetch(api(`doctors/availability/${doctor.id}`), {
        method: "PUT", headers: getAuthHeaders(),
        body: JSON.stringify({ slots: payload }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل الحفظ");
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`${MODAL_CONTENT_CLS} max-w-2xl max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold">مواعيد عمل {doctor.title} {doctor.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">حدد الأيام والساعات التي يعمل فيها الطبيب — ستظهر في الحجز</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><X className="w-5 h-5" /></button>
        </div>

        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

        {loading ? (
          <p className="text-center py-10 text-gray-400 dark:text-gray-500">جاري التحميل...</p>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button onClick={() => toggleAll(true)} className="px-3 py-1.5 text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100">تفعيل كل الأيام</button>
              <button onClick={() => toggleAll(false)} className="px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100">تعطيل كل الأيام</button>
            </div>

            <div className="space-y-2">
              {DAYS.map(d => {
                const s = slots[d.value] || { isAvailable: false, startTime: "09:00", endTime: "17:00" };
                return (
                  <div key={d.value} className="flex items-center gap-3 border dark:border-gray-600 rounded-lg px-3 py-2">
                    <label className="flex items-center gap-2 w-24 shrink-0 cursor-pointer">
                      <input type="checkbox" checked={s.isAvailable} onChange={e => updateDay(d.value, { isAvailable: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                      <span className="text-sm font-medium">{d.label}</span>
                    </label>
                    <div className={`flex items-center gap-2 flex-1 transition-opacity ${s.isAvailable ? "" : "opacity-40 pointer-events-none"}`}>
                      <input type="time" className={`${MODAL_INPUT_CLS} w-32`} dir="ltr" value={s.startTime} onChange={e => updateDay(d.value, { startTime: e.target.value })} />
                      <span className="text-gray-400">—</span>
                      <input type="time" className={`${MODAL_INPUT_CLS} w-32`} dir="ltr" value={s.endTime} onChange={e => updateDay(d.value, { endTime: e.target.value })} />
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${s.isAvailable ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-100 text-gray-500 dark:bg-gray-700"}`}>{s.isAvailable ? "يعمل" : "راحة"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
          <button onClick={handleSave} disabled={loading || saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? "جاري الحفظ..." : "حفظ مواعيد العمل"}</button>
        </div>
      </div>
    </div>
  );
}
