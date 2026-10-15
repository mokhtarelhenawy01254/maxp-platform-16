import { useEffect, useState } from "react";
import { X, Clock, CalendarDays, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { BookingDoctor, DoctorAvailability, api, getAuthHeaders } from "./shared";

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
        setError(e instanceof Error ? e.message : "خطأ أثناء جلب المواعيد");
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
      setError(e instanceof Error ? e.message : "خطأ أثناء حفظ التعديلات");
    } finally {
      setSaving(false);
    }
  };

  const timeInputCls = "w-28 bg-background border border-border/70 rounded-xl px-2.5 py-1.5 text-xs text-foreground font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-card-foreground animate-in fade-in-0 zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                مواعيد عمل {doctor.title} {doctor.name}
              </h3>
              <p className="text-xs text-muted-foreground">جدول الحضور الأسبوعي وساعات استقبال المرضى</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-sm">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-xs text-muted-foreground flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>جارٍ تحميل جدول المواعيد...</span>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">التحكم السريع في أيام الأسبوع</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAll(true)}
                    className="px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors"
                  >
                    تفعيل كل الأيام
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAll(false)}
                    className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted border border-border/70 rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    تعطيل كل الأيام
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 divide-y divide-border/40">
                {DAYS.map(d => {
                  const s = slots[d.value] || { isAvailable: false, startTime: "09:00", endTime: "17:00" };
                  return (
                    <div key={d.value} className="flex items-center justify-between gap-3 pt-2.5 first:pt-0">
                      <label className="flex items-center gap-2.5 w-28 shrink-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={s.isAvailable}
                          onChange={e => updateDay(d.value, { isAvailable: e.target.checked })}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                        />
                        <span className="text-xs font-semibold text-foreground">{d.label}</span>
                      </label>

                      <div className={`flex items-center gap-2 flex-1 justify-center transition-opacity ${s.isAvailable ? "" : "opacity-30 pointer-events-none"}`}>
                        <input
                          type="time"
                          className={timeInputCls}
                          dir="ltr"
                          value={s.startTime}
                          onChange={e => updateDay(d.value, { startTime: e.target.value })}
                        />
                        <span className="text-muted-foreground text-xs">—</span>
                        <input
                          type="time"
                          className={timeInputCls}
                          dir="ltr"
                          value={s.endTime}
                          onChange={e => updateDay(d.value, { endTime: e.target.value })}
                        />
                      </div>

                      <span
                        className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full shrink-0 ${
                          s.isAvailable
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground border border-border/60"
                        }`}
                      >
                        {s.isAvailable ? "متاح للعمل" : "إجازة"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-border/60 bg-muted/20 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-foreground border border-border/70 rounded-xl hover:bg-muted/50 transition-colors">
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 shadow-xs transition-colors disabled:opacity-50"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ مواعيد العمل"}
          </button>
        </div>
      </div>
    </div>
  );
}
