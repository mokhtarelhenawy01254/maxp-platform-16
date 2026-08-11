import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Loader2, X as XMarkIcon, Pencil, Trash2, Search, ArrowRightLeft } from "lucide-react";
import { api, fetchJson, RadiologyExamType, MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "./shared";

interface Appointment {
  id: string; patientName: string; patientPhone?: string;
  patientGender?: string; patientAge?: string;
  examTypeId?: string; examTypeName?: string;
  appointmentDate?: string; appointmentTime?: string;
  branchId?: string; status: string; notes?: string; createdAt: string;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "محجوز", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  CHECKED_IN: { label: "حضر", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  DONE: { label: "تم", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  CANCELLED: { label: "ملغي", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

const STATUS_CHAIN: Record<string, string> = { SCHEDULED: "CHECKED_IN", CHECKED_IN: "DONE", DONE: "", CANCELLED: "" };

interface Form { id?: string; patientName: string; patientPhone: string; patientGender: string; patientAge: string; examTypeId: string; appointmentDate: string; appointmentTime: string; notes: string; }

const emptyForm = (): Form => ({ patientName: "", patientPhone: "", patientGender: "", patientAge: "", examTypeId: "", appointmentDate: "", appointmentTime: "", notes: "" });

export default function ScheduleTab() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [examTypes, setExamTypes] = useState<RadiologyExamType[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const url = new URL(api("appointments"));
      url.searchParams.set("limit", "200");
      if (status) url.searchParams.set("status", status);
      if (search.trim()) url.searchParams.set("patientName", search.trim());
      const res = await fetchJson<{ items?: Appointment[]; total?: number }>(url.toString());
      setItems(res.items || []);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : "فشل تحميل الحجوزات");
    }
  }, [status, search]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const ets = await fetchJson<RadiologyExamType[]>(api("exam-types"));
        setExamTypes(Array.isArray(ets) ? ets : []);
      } catch { setExamTypes([]); }
      await refresh().finally(() => setLoading(false));
    })();
  }, [refresh]);

  const save = async () => {
    if (!modal || saving) return;
    if (!modal.patientName.trim()) { toast.error("اسم المريض مطلوب"); return; }
    setSaving(true);
    try {
      const payload = {
        patientName: modal.patientName.trim(),
        patientPhone: modal.patientPhone.trim() || undefined,
        patientGender: modal.patientGender || undefined,
        patientAge: modal.patientAge.trim() || undefined,
        examTypeId: modal.examTypeId || undefined,
        appointmentDate: modal.appointmentDate || undefined,
        appointmentTime: modal.appointmentTime || undefined,
        notes: modal.notes.trim() || undefined,
      };
      if (modal.id) {
        await fetchJson(api(`appointments/${modal.id}`), { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await fetchJson(api("appointments"), { method: "POST", body: JSON.stringify(payload) });
      }
      toast.success(modal.id ? "تم تحديث الحجز" : "تم إنشاء الحجز");
      setModal(null);
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const advance = async (a: Appointment) => {
    const next = STATUS_CHAIN[a.status];
    if (!next) return;
    try {
      await fetchJson(api(`appointments/${a.id}`), { method: "PUT", body: JSON.stringify({ status: next }) });
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل التحديث");
    }
  };

  const remove = async (a: Appointment) => {
    if (!window.confirm(`حذف حجز "${a.patientName}"؟`)) return;
    try {
      await fetchJson(api(`appointments/${a.id}`), { method: "DELETE" });
      toast.success("تم حذف الحجز");
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحذف");
    }
  };

  const convert = async (a: Appointment) => {
    if (!window.confirm(`تحويل حجز "${a.patientName}" إلى دراسة؟`)) return;
    try {
      const r = await fetchJson<{ study: { id: string } }>(api(`appointments/${a.id}/convert`), { method: "POST" });
      toast.success("تم إنشاء الدراسة — افتحها من تبويب الدراسات");
      await refresh({ silent: true });
      if (r?.study?.id) window.location.href = "/radiology/studies";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل التحويل");
    }
  };

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("ar-EG") : "—");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">الحجوزات</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">حجز مواعيد المرضى للفحوصات</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" />
            <input className={`${MODAL_INPUT_CLS} pr-9 w-44`} placeholder="بحث بالمريض..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className={MODAL_INPUT_CLS} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={() => refresh()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />تحديث
          </button>
          <button onClick={() => setModal(emptyForm())} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4" />حجز جديد
          </button>
        </div>
      </div>

      {loading && !items.length ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <p className="text-center py-16 text-gray-400 dark:text-gray-500">لا توجد حجوزات بعد</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
                  {["المريض", "الفحص", "التاريخ", "الوقت", "الحالة", "ملاحظات", "إجراءات"].map(h => (
                    <th key={h} className="text-right py-3 px-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(a => {
                  const meta = STATUS_META[a.status] || STATUS_META["SCHEDULED"];
                  return (
                    <tr key={a.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                      <td className="py-3 px-4 font-medium">{a.patientName}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{a.examTypeName || "—"}</td>
                      <td className="py-3 px-4">{fmtDate(a.appointmentDate)}</td>
                      <td className="py-3 px-4" dir="ltr">{a.appointmentTime || "—"}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${meta?.color}`}>{meta?.label}</span></td>
                      <td className="py-3 px-4 text-gray-400 dark:text-gray-500 max-w-[160px] truncate">{a.notes || "—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setModal({ ...emptyForm(), id: a.id, patientName: a.patientName, patientPhone: a.patientPhone || "", patientGender: a.patientGender || "", patientAge: a.patientAge || "", examTypeId: a.examTypeId || "", appointmentDate: a.appointmentDate ? a.appointmentDate.slice(0, 10) : "", appointmentTime: a.appointmentTime || "", notes: a.notes || "" })} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="تعديل"><Pencil className="w-4 h-4" /></button>
                          {a.status !== "CANCELLED" ? (
                            <button onClick={() => convert(a)} className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded" title="تحويل لدراسة"><ArrowRightLeft className="w-4 h-4" /></button>
                          ) : null}
                          {STATUS_CHAIN[a.status] ? (
                            <button onClick={() => advance(a)} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded" title="تقدم الحالة"><RefreshCw className="w-4 h-4" /></button>
                          ) : null}
                          <button onClick={() => remove(a)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="حذف"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setModal(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{modal.id ? "تعديل الحجز" : "حجز جديد"}</h3>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">اسم المريض *</label>
                <input className={MODAL_INPUT_CLS} value={modal.patientName} onChange={e => setModal({ ...modal, patientName: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">الهاتف</label>
                <input className={MODAL_INPUT_CLS} dir="ltr" value={modal.patientPhone} onChange={e => setModal({ ...modal, patientPhone: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">نوع الفحص</label>
                <select className={MODAL_INPUT_CLS} value={modal.examTypeId} onChange={e => setModal({ ...modal, examTypeId: e.target.value })}>
                  <option value="">اختر الفحص...</option>
                  {examTypes.filter(t => t.isActive !== false).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">التاريخ</label>
                <input type="date" className={MODAL_INPUT_CLS} value={modal.appointmentDate} onChange={e => setModal({ ...modal, appointmentDate: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">الوقت</label>
                <input type="time" className={MODAL_INPUT_CLS} value={modal.appointmentTime} onChange={e => setModal({ ...modal, appointmentTime: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">ملاحظات</label>
                <input className={MODAL_INPUT_CLS} value={modal.notes} onChange={e => setModal({ ...modal, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
