import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X as XMarkIcon, Search, ChevronRight, ChevronLeft, Home, CheckCircle2 } from "lucide-react";
import { api, getAuthHeaders, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, CULTURE_STATUS, LabHomeVisit } from "./shared";

interface VisitForm {
  id?: string;
  patientName: string;
  phone: string;
  address: string;
  visitDate: string;
  status: string;
  notes: string;
}

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  DONE: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const pad = (n: number) => String(n).padStart(2, "0");

const toDatetimeLocal = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDate = (iso?: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
};

export default function HomeVisitsTab() {
  const [visits, setVisits] = useState<LabHomeVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const [modal, setModal] = useState<VisitForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const requestRef = useRef(0);

  const loadVisits = useCallback(async (quiet = false) => {
    const reqId = ++requestRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const res = await fetch(`${api("home-visits")}&${params.toString()}`, { headers: getAuthHeaders() });
      const json = (await res.json()) as { success?: boolean; error?: string; message?: string; data?: LabHomeVisit[]; total?: number; page?: number };
      if (!json.success) throw new Error(json.error || json.message || "فشل العملية");
      if (requestRef.current !== reqId) return;
      setVisits(json.data || []);
      setTotal(json.total ?? 0);
      if (json.page) setPage(json.page);
    } catch (e: unknown) {
      if (requestRef.current !== reqId) return;
      if (!quiet) setError(e instanceof Error ? e.message : "حدث خطأ في جلب الزيارات المنزلية");
    } finally {
      if (requestRef.current === reqId) setLoading(false);
    }
  }, [page, limit, search, status]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  const mutate = async (path: string, method: string, body?: Record<string, unknown>) => {
    const res = await fetch(api(path), {
      method,
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || data.message || "فشلت العملية");
    return data.data;
  };

  const openCreate = () => {
    setError(null);
    setModal({ patientName: "", phone: "", address: "", visitDate: "", status: "SCHEDULED", notes: "" });
  };

  const openEdit = (visit: LabHomeVisit) => {
    setError(null);
    setModal({
      id: visit.id,
      patientName: visit.patientName,
      phone: visit.phone || "",
      address: visit.address || "",
      visitDate: toDatetimeLocal(visit.visitDate),
      status: visit.status || "SCHEDULED",
      notes: visit.notes || "",
    });
  };

  const save = async () => {
    if (!modal) return;
    if (saving) return;
    setError(null);
    if (!modal.patientName.trim()) { setError("اسم المريض مطلوب"); return; }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        patientName: modal.patientName.trim(),
        phone: modal.phone.trim() || undefined,
        address: modal.address.trim() || undefined,
        visitDate: modal.visitDate || undefined,
        status: modal.status,
        notes: modal.notes.trim() || undefined,
      };
      if (modal.id) {
        await mutate(`home-visits/${modal.id}`, "PUT", payload);
      } else {
        await mutate("home-visits", "POST", payload);
      }
      setModal(null);
      await loadVisits(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (visit: LabHomeVisit) => {
    if (removingId) return;
    if (!window.confirm(`تأكيد حذف الزيارة للمريض "${visit.patientName}"؟`)) return;
    setRemovingId(visit.id);
    try {
      await mutate(`home-visits/${visit.id}`, "DELETE");
      await loadVisits(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ في حذف الزيارة");
    } finally {
      setRemovingId(null);
    }
  };

  const markDone = async (visit: LabHomeVisit) => {
    if (doneId) return;
    setDoneId(visit.id);
    try {
      await mutate(`home-visits/${visit.id}`, "PUT", { status: "DONE" });
      await loadVisits(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ في تحديث الزيارة");
    } finally {
      setDoneId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">الزيارات المنزلية</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">جدولة ومتابعة سحب العينات من منزل المريض</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />إضافة زيارة
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"><XMarkIcon className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
          <input
            className={`${MODAL_INPUT_CLS} pr-9`}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="بحث باسم المريض أو الهاتف..."
          />
        </div>
        <select className={`${MODAL_INPUT_CLS} w-auto`} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">كل الحالات</option>
          <option value="SCHEDULED">{CULTURE_STATUS["SCHEDULED"]}</option>
          <option value="DONE">{CULTURE_STATUS["DONE"]}</option>
          <option value="CANCELLED">{CULTURE_STATUS["CANCELLED"]}</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">جارٍ التحميل...</div>
      ) : visits.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
          <Home className="w-10 h-10 mx-auto mb-3" />
          {search || status ? "لا توجد نتائج مطابقة" : "لا توجد زيارات منزلية بعد — أضف أول زيارة"}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                  <th className="text-right py-3 px-4">مريض</th>
                  <th className="text-right py-3 px-4">هاتف</th>
                  <th className="text-right py-3 px-4">عنوان</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">موعد</th>
                  <th className="text-right py-3 px-4">حالة</th>
                  <th className="text-right py-3 px-4">مراجعة</th>
                  <th className="text-right py-3 px-4">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {visits.map(v => (
                  <tr key={v.id} className="border-b dark:border-gray-700 last:border-b-0">
                    <td className="py-3 px-4 font-medium">{v.patientName}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{v.phone || "—"}</td>
                    <td className="py-3 px-4">{v.address || "—"}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{formatDate(v.visitDate)}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[v.status] || STATUS_STYLES["SCHEDULED"]}`}>
                        {CULTURE_STATUS[v.status as keyof typeof CULTURE_STATUS] || v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {v.reviewed ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">تمت المراجعة</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">لم تُراجع</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        {v.status !== "DONE" && (
                          <button onClick={() => markDone(v)} disabled={doneId !== null} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg disabled:opacity-40" title="تمت">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => openEdit(v)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="تعديل">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(v)} disabled={removingId !== null} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-40" title="حذف">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
            <span>عرض {visits.length} من {total} زيارة</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600"
              >
                <ChevronRight className="w-4 h-4" />السابق
              </button>
              <span className="px-2">صفحة {page} من {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600"
              >
                التالي<ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && setModal(null)}>
          <div className={`${MODAL_CONTENT_CLS} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{modal.id ? "تعديل زيارة" : "زيارة جديدة"}</h3>
              <button onClick={() => !saving && setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المريض *</label>
                <input className={MODAL_INPUT_CLS} value={modal.patientName} onChange={e => setModal({ ...modal, patientName: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الهاتف</label>
                  <input className={MODAL_INPUT_CLS} value={modal.phone} onChange={e => setModal({ ...modal, phone: e.target.value })} placeholder="مثال: 01001234567" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">موعد الزيارة</label>
                  <input type="datetime-local" className={MODAL_INPUT_CLS} value={modal.visitDate} onChange={e => setModal({ ...modal, visitDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان</label>
                <input className={MODAL_INPUT_CLS} value={modal.address} onChange={e => setModal({ ...modal, address: e.target.value })} placeholder="عنوان المنزل" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحالة</label>
                  <select className={MODAL_INPUT_CLS} value={modal.status} onChange={e => setModal({ ...modal, status: e.target.value })}>
                    <option value="SCHEDULED">{CULTURE_STATUS["SCHEDULED"]}</option>
                    <option value="DONE">{CULTURE_STATUS["DONE"]}</option>
                    <option value="CANCELLED">{CULTURE_STATUS["CANCELLED"]}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
                <textarea className={`${MODAL_INPUT_CLS} min-h-[80px]`} value={modal.notes} onChange={e => setModal({ ...modal, notes: e.target.value })} placeholder="ملاحظات حول الزيارة..." />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">إلغاء</button>
              <button onClick={save} disabled={saving || !modal.patientName.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
