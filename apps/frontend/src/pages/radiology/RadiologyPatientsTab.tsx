import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Search, FileText, X as XMarkIcon } from "lucide-react";
import { api, bookingApi, fetchJson, MODAL_INPUT_CLS, MODAL_CONTENT_CLS } from "./shared";

interface RadiologyPatient {
  id: string; firstName: string; lastName?: string; phone?: string;
  gender?: string; status?: string; isActive: boolean; createdAt: string;
}

interface PatientStudy {
  id: string; studyNumber?: string; examTypeName?: string;
  status?: string; report?: { reportStatus?: string }; priceSnapshot?: number;
  billingType?: string; createdAt?: string;
}

const STATUS_LABEL: Record<string, string> = { ACTIVE: "نشط", INACTIVE: "غير نشط", REVIEW: "قيد المراجعة" };

export default function RadiologyPatientsTab() {
  const [items, setItems] = useState<RadiologyPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Partial<RadiologyPatient> | null>(null);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [record, setRecord] = useState<RadiologyPatient | null>(null);
  const [recordStudies, setRecordStudies] = useState<PatientStudy[]>([]);
  const [recordLoading, setRecordLoading] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const url = new URL(bookingApi("patients"));
      url.searchParams.set("limit", "200");
      const data = await fetchJson<RadiologyPatient[]>(url.toString());
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل تحميل المرضى");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(p =>
    !search || (p.firstName || "").includes(search) || (p.phone || "").includes(search)
  );

  const openNew = () => { setFirstName(""); setPhone(""); setModal({}); };

  const save = async () => {
    if (saving) return;
    if (!firstName.trim()) { toast.error("اسم المريض مطلوب"); return; }
    setSaving(true);
    try {
      const body = { firstName: firstName.trim(), phone: phone.trim() || undefined };
      await fetchJson(bookingApi("patients"), { method: "POST", body: JSON.stringify(body) });
      toast.success("تم إضافة المريض");
      setModal(null);
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (p: RadiologyPatient) => {
    try {
      await fetchJson(bookingApi(`patients/${p.id}`), { method: "PUT", body: JSON.stringify({ isActive: !p.isActive }) });
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل التحديث");
    }
  };

  const viewRecord = async (p: RadiologyPatient) => {
    setRecord(p);
    setRecordStudies([]);
    setRecordLoading(true);
    try {
      const fullName = `${p.firstName}${p.lastName ? " " + p.lastName : ""}`.trim();
      let rows = await fetchJson<{ items?: PatientStudy[] }>(`${api("studies")}&patientId=${p.id}&limit=100`);
      if (!rows.items?.length && fullName) {
        rows = await fetchJson<{ items?: PatientStudy[] }>(`${api("studies")}&patientName=${encodeURIComponent(fullName)}&limit=100`);
      }
      setRecordStudies(rows.items || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل جلب دراسات المريض");
    } finally {
      setRecordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">المرضى</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف"
              className={`${MODAL_INPUT_CLS} pr-9 max-w-xs`} />
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4" />مريض جديد
          </button>
          <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm">
            <RefreshCw className="w-4 h-4" />تحديث
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center py-10 text-gray-400">جاري التحميل...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center py-10 text-gray-400">لا يوجد مرضى</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="py-3 px-4 text-right font-medium">الاسم</th>
                <th className="py-3 px-4 text-right font-medium">الهاتف</th>
                <th className="py-3 px-4 text-right font-medium">الجنس</th>
                <th className="py-3 px-4 text-right font-medium">الحالة</th>
                <th className="py-3 px-4 text-right font-medium">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b dark:border-gray-700/50 last:border-0">
                  <td className="py-3 px-4 font-medium">{p.firstName} {p.lastName || ""}</td>
                  <td className="py-3 px-4" dir="ltr">{p.phone || "—"}</td>
                  <td className="py-3 px-4">{p.gender || "—"}</td>
                  <td className="py-3 px-4">{STATUS_LABEL[p.status || ""] || (p.isActive ? "نشط" : "غير نشط")}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => viewRecord(p)} className="text-xs px-2 py-1 border rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />الدراسات
                      </button>
                      <button onClick={() => toggle(p)} className="text-xs px-2 py-1 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                        {p.isActive ? "تعطيل" : "تفعيل"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-gray-500 dark:text-gray-400">
        لإنشاء دراسة جديدة لمريض موجود، استخدم تبويب <a href="/radiology/reception" className="text-blue-600 dark:text-blue-400">الاستقبال</a>.
      </p>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setModal(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">مريض جديد</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">اسم المريض *</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} className={MODAL_INPUT_CLS} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الهاتف</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className={MODAL_INPUT_CLS} dir="ltr" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg">إلغاء</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {record && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setRecord(null)}>
          <div className={`${MODAL_CONTENT_CLS} max-h-[85vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">دراسات المريض — {record.firstName} {record.lastName || ""}</h3>
              <button onClick={() => setRecord(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            {recordLoading ? (
              <p className="text-center py-10 text-gray-400">جارٍ التحميل...</p>
            ) : recordStudies.length === 0 ? (
              <p className="text-center py-10 text-gray-400">لا توجد دراسات لهذا المريض</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400">
                    <th className="py-2 px-3 text-right font-medium">رقم الدراسة</th>
                    <th className="py-2 px-3 text-right font-medium">الفحص</th>
                    <th className="py-2 px-3 text-right font-medium">الحالة</th>
                    <th className="py-2 px-3 text-right font-medium">التقرير</th>
                    <th className="py-2 px-3 text-right font-medium">السعر</th>
                    <th className="py-2 px-3 text-right font-medium">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {recordStudies.map(s => (
                    <tr key={s.id} className="border-b dark:border-gray-700/50 last:border-0">
                      <td className="py-2 px-3" dir="ltr">{s.studyNumber || "—"}</td>
                      <td className="py-2 px-3">{s.examTypeName || "—"}</td>
                      <td className="py-2 px-3">{s.status || "—"}</td>
                      <td className="py-2 px-3">{s.report?.reportStatus || "—"}</td>
                      <td className="py-2 px-3">{Number(s.priceSnapshot || 0).toFixed(0)} ج</td>
                      <td className="py-2 px-3">{s.createdAt ? new Date(s.createdAt).toLocaleDateString("ar-EG") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
