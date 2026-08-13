import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Loader2, X as XMarkIcon, Pencil, Trash2, Search, ArrowRightLeft, Zap, List, CalendarDays, CalendarRange, CalendarCheck } from "lucide-react";
import { api, bookingApi, fetchJson, RadiologyExamType, MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "./shared";
import ScheduleCalendar, { ViewMode, dayKey, addDays, egyptWeekStart } from "./ScheduleCalendar";

interface Appointment {
  id: string; patientName: string; patientPhone?: string;
  patientGender?: string; patientAge?: string;
  examTypeId?: string; examTypeName?: string;
  insuranceCompanyId?: string;
  additionIds?: string[] | string;
  additionAmount?: number;
  referralDoctor?: string;
  emergency?: boolean;
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

interface Form {
  id?: string; patientId: string; patientName: string; patientPhone: string;
  nationalId: string; insuranceNumber: string;
  examTypeId: string; insuranceCompanyId: string; additionIds: string[];
  referringPhysicianId: string; referralDoctor: string; emergency: boolean;
  appointmentDate: string; appointmentTime: string; status: string; notes: string;
}

const emptyForm = (): Form => ({
  patientId: "", patientName: "", patientPhone: "", nationalId: "", insuranceNumber: "",
  examTypeId: "", insuranceCompanyId: "", additionIds: [],
  referringPhysicianId: "", referralDoctor: "", emergency: false,
  appointmentDate: new Date().toISOString().slice(0, 10), appointmentTime: "", status: "SCHEDULED", notes: "",
});

const todayKey = () => new Date().toISOString().slice(0, 10);

export default function ScheduleTab() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [examTypes, setExamTypes] = useState<RadiologyExamType[]>([]);
  const [additions, setAdditions] = useState<RadiologyExamAddition[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(todayKey());
  const [dateTo, setDateTo] = useState(todayKey());
  const [view, setView] = useState<ViewMode>("list");
  const [anchorDate, setAnchorDate] = useState(todayKey());
  const [modal, setModal] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<{ id: string; firstName: string; lastName?: string; phone?: string; nationalId?: string; insuranceNumber?: string }[]>([]);
  const [physicianSearch, setPhysicianSearch] = useState("");
  const [physicianResults, setPhysicianResults] = useState<{ id: string; name: string; specialty?: string }[]>([]);

  const loadCatalog = useCallback(async () => {
    try {
      const [ets, adds, ins] = await Promise.all([
        fetchJson<RadiologyExamType[]>(`${api("exam-types")}&limit=500`),
        fetchJson<RadiologyExamType[]>(`${api("exam-types")}&isAddition=true&limit=100`).catch(() => []),
        fetchJson<{ id: string; name: string }[]>(bookingApi("insurance-companies")).catch(() => []),
      ]);
      setExamTypes(Array.isArray(ets) ? ets : []);
      setAdditions(Array.isArray(adds) ? adds : []);
      setInsuranceCompanies(Array.isArray(ins) ? ins : []);
    } catch { /* catalog optional */ }
  }, []);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const url = new URL(api("appointments"));
      url.searchParams.set("limit", "300");
      if (status) url.searchParams.set("status", status);
      if (search.trim()) url.searchParams.set("patientName", search.trim());
      if (view === "list") {
        if (dateFrom) url.searchParams.set("dateFrom", dateFrom);
        if (dateTo) url.searchParams.set("dateTo", dateTo);
      } else {
        const a = new Date(anchorDate + "T12:00:00");
        let from = dayKey(a), to = dayKey(a);
        if (view === "week") { const s = egyptWeekStart(a); from = dayKey(s); to = dayKey(addDays(s, 6)); }
        if (view === "month") { from = dayKey(new Date(a.getFullYear(), a.getMonth(), 1)); to = dayKey(new Date(a.getFullYear(), a.getMonth() + 1, 0)); }
        url.searchParams.set("dateFrom", from);
        url.searchParams.set("dateTo", to);
      }
      const res = await fetchJson<{ items?: Appointment[]; total?: number }>(url.toString());
      setItems(res.items || []);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : "فشل تحميل الحجوزات");
    }
  }, [status, search, dateFrom, dateTo, view, anchorDate]);

  useEffect(() => {
    loadCatalog();
    refresh();
  }, [loadCatalog, refresh]);

  useEffect(() => {
    if (!patientSearch.trim()) { setPatientResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const url = new URL(bookingApi("patients"));
        url.searchParams.set("search", patientSearch.trim());
        url.searchParams.set("limit", "8");
        const rows = await fetchJson<{ id: string; firstName: string; lastName?: string; phone?: string; nationalId?: string; insuranceNumber?: string }[]>(url.toString());
        setPatientResults(Array.isArray(rows) ? rows : []);
      } catch { setPatientResults([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [patientSearch]);

  useEffect(() => {
    if (!physicianSearch.trim()) { setPhysicianResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const url = new URL(api("referring-physicians"));
        url.searchParams.set("search", physicianSearch.trim());
        url.searchParams.set("limit", "20");
        const rows = await fetchJson<{ id: string; name: string; specialty?: string }[]>(url.toString());
        setPhysicianResults(Array.isArray(rows) ? rows : []);
      } catch { setPhysicianResults([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [physicianSearch]);

  const pickPatient = (p: { id: string; firstName: string; lastName?: string; phone?: string; nationalId?: string; insuranceNumber?: string }) => {
    setModal(m => m ? { ...m, patientId: p.id, patientName: `${p.firstName}${p.lastName ? " " + p.lastName : ""}`, patientPhone: p.phone || "", nationalId: p.nationalId || m.nationalId, insuranceNumber: p.insuranceNumber || m.insuranceNumber } : m);
    setPatientSearch("");
    setPatientResults([]);
  };

  const pickPhysician = (p: { id: string; name: string }) => {
    setModal(m => m ? { ...m, referringPhysicianId: p.id, referralDoctor: p.name } : m);
    setPhysicianSearch("");
    setPhysicianResults([]);
  };

  const buildPayload = (f: Form) => ({
    patientId: f.patientId || undefined,
    patientName: f.patientName.trim(),
    patientPhone: f.patientPhone.trim() || undefined,
    nationalId: f.nationalId.trim() || undefined,
    insuranceNumber: f.insuranceNumber.trim() || undefined,
    examTypeId: f.examTypeId || undefined,
    insuranceCompanyId: f.insuranceCompanyId || undefined,
    additionIds: f.additionIds,
    referringPhysicianId: f.referringPhysicianId || undefined,
    referralDoctor: f.referralDoctor.trim() || undefined,
    emergency: f.emergency,
    appointmentDate: f.appointmentDate || undefined,
    appointmentTime: f.appointmentTime || undefined,
    status: f.status || "SCHEDULED",
    notes: f.notes.trim() || undefined,
  });

  const save = async (convertAfter = false) => {
    if (!modal || saving) return;
    if (!modal.patientName.trim()) { toast.error("اسم المريض مطلوب"); return; }
    if (!modal.examTypeId) { toast.error("اختر نوع الفحص"); return; }
    setSaving(true);
    try {
      const payload = buildPayload({ ...modal, status: convertAfter ? "CHECKED_IN" : modal.status });
      let id = modal.id;
      if (modal.id) {
        await fetchJson(api(`appointments/${modal.id}`), { method: "PUT", body: JSON.stringify(payload) });
      } else {
        const created = await fetchJson<{ id: string }>(api("appointments"), { method: "POST", body: JSON.stringify(payload) });
        id = created.id;
      }
      if (convertAfter && id) {
        const r = await fetchJson<{ study: { id: string } }>(api(`appointments/${id}/convert`), { method: "POST" });
        toast.success("تم إنشاء الدراسة — مريض فوري");
        setModal(null);
        window.location.href = "/radiology/studies";
        return;
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
    if (converting === a.id) return;
    if (!window.confirm(`تحويل حجز "${a.patientName}" إلى دراسة؟`)) return;
    setConverting(a.id);
    try {
      const r = await fetchJson<{ study: { id: string } }>(api(`appointments/${a.id}/convert`), { method: "POST" });
      toast.success("تم إنشاء الدراسة — افتحها من تبويب الدراسات");
      await refresh({ silent: true });
      if (r?.study?.id) window.location.href = "/radiology/studies";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل التحويل");
    } finally {
      setConverting(null);
    }
  };

  const openNew = (asWalkIn = false) => {
    setModal({ ...emptyForm(), status: asWalkIn ? "CHECKED_IN" : "SCHEDULED" });
    setPatientSearch("");
    setPhysicianSearch("");
  };

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("ar-EG") : "—");
  const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1";

  const shiftAnchor = (dir: number) => {
    const a = new Date(anchorDate + "T12:00:00");
    if (view === "day") setAnchorDate(dayKey(addDays(a, dir)));
    else if (view === "week") setAnchorDate(dayKey(addDays(a, dir * 7)));
    else { const x = new Date(a.getFullYear(), a.getMonth() + dir, 1); setAnchorDate(dayKey(x)); }
  };
  const gotoToday = () => setAnchorDate(todayKey());
  const selectDay = (key: string) => { setAnchorDate(key); setView("day"); };

  const VIEW_TABS: { id: ViewMode; label: string; icon: typeof List }[] = [
    { id: "list", label: "قائمة", icon: List },
    { id: "day", label: "يوم", icon: CalendarDays },
    { id: "week", label: "أسبوع", icon: CalendarRange },
    { id: "month", label: "شهر", icon: CalendarCheck },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">الحجوزات — شغل اليوم</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">حجز مواعيد المرضى وتحويلها لدراسات</p>
        </div>
        <div className="flex items-center gap-1.5 border dark:border-gray-600 rounded-lg p-1">
          {VIEW_TABS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === v.id ? "bg-blue-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
              <v.icon className="w-4 h-4" />{v.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => { setDateFrom(todayKey()); setDateTo(todayKey()); }} className="px-3 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">اليوم</button>
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" />
            <input className={`${MODAL_INPUT_CLS} pr-9 w-44`} placeholder="بحث بالمريض..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className={MODAL_INPUT_CLS} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={() => refresh()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"><RefreshCw className="w-4 h-4" />تحديث</button>
          <button onClick={() => openNew(true)} className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"><Zap className="w-4 h-4" />مريض فوري</button>
          <button onClick={() => openNew(false)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"><Plus className="w-4 h-4" />حجز جديد</button>
        </div>
      </div>

      {view === "list" && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-600 dark:text-gray-300">من</label>
          <input type="date" className={MODAL_INPUT_CLS} style={{ width: 160 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <label className="text-sm text-gray-600 dark:text-gray-300">إلى</label>
          <input type="date" className={MODAL_INPUT_CLS} style={{ width: 160 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      )}

      {view !== "list" ? (
        <ScheduleCalendar
          view={view as "day" | "week" | "month"}
          anchorDate={anchorDate}
          items={items}
          onShift={shiftAnchor}
          onToday={gotoToday}
          onSelectDay={selectDay}
        />
      ) : loading && !items.length ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <p className="text-center py-16 text-gray-400 dark:text-gray-500">لا توجد حجوزات في هذه الفترة</p>
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
                      <td className="py-3 px-4 font-medium">{a.patientName}{a.emergency ? <span className="mr-2 text-xs text-red-500">طارئ</span> : null}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{a.examTypeName || "—"}{a.additionAmount ? ` (+${Number(a.additionAmount).toFixed(0)}ج)` : ""}</td>
                      <td className="py-3 px-4">{fmtDate(a.appointmentDate)}</td>
                      <td className="py-3 px-4" dir="ltr">{a.appointmentTime || "—"}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${meta?.color}`}>{meta?.label}</span></td>
                      <td className="py-3 px-4 text-gray-400 dark:text-gray-500 max-w-[160px] truncate">{a.notes || "—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setModal({ ...emptyForm(), id: a.id, patientId: (a as { patientId?: string }).patientId || "", patientName: a.patientName, patientPhone: a.patientPhone || "", nationalId: (a as { nationalId?: string }).nationalId || "", insuranceNumber: (a as { insuranceNumber?: string }).insuranceNumber || "", examTypeId: a.examTypeId || "", insuranceCompanyId: a.insuranceCompanyId || "", additionIds: Array.isArray(a.additionIds) ? a.additionIds : (typeof a.additionIds === "string" ? JSON.parse(a.additionIds) : []), referringPhysicianId: (a as { referringPhysicianId?: string }).referringPhysicianId || "", referralDoctor: a.referralDoctor || "", emergency: !!a.emergency, appointmentDate: a.appointmentDate ? a.appointmentDate.slice(0, 10) : "", appointmentTime: a.appointmentTime || "", status: a.status, notes: a.notes || "" })} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="تعديل"><Pencil className="w-4 h-4" /></button>
                          {a.status !== "CANCELLED" && a.status !== "DONE" ? (
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && setModal(null)}>
          <div className={`${MODAL_CONTENT_CLS} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{modal.id ? "تعديل الحجز" : (modal.status === "CHECKED_IN" ? "مريض فوري" : "حجز جديد")}</h3>
              <button onClick={() => !saving && setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 relative">
                <label className={labelCls}>المريض *</label>
                <input className={MODAL_INPUT_CLS} value={patientSearch || modal.patientName} onChange={e => { setPatientSearch(e.target.value); if (!e.target.value) setModal({ ...modal, patientId: "", patientName: "", patientPhone: "" }); }} placeholder="ابحث عن مريض موجود..." />
                {patientSearch.trim() && (
                  <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-xl">
                    {patientResults.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">لا توجد نتائج</div>
                    ) : patientResults.map(p => (
                      <button key={p.id} type="button" onClick={() => pickPatient(p)} className="block w-full text-right px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                        <span className="font-medium">{p.firstName} {p.lastName || ""}</span>
                        {p.phone ? <span className="text-xs text-gray-500 dark:text-gray-400"> — {p.phone}</span> : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>الهاتف</label>
                <input className={MODAL_INPUT_CLS} dir="ltr" value={modal.patientPhone} onChange={e => setModal({ ...modal, patientPhone: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>نوع الفحص *</label>
                <select className={MODAL_INPUT_CLS} value={modal.examTypeId} onChange={e => setModal({ ...modal, examTypeId: e.target.value })}>
                  <option value="">اختر الفحص...</option>
                  {examTypes.filter(t => t.isActive !== false).map(t => <option key={t.id} value={t.id}>{t.name}{t.category ? ` (${t.category})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>جهة التأمين (اختياري)</label>
                <select className={MODAL_INPUT_CLS} value={modal.insuranceCompanyId} onChange={e => setModal({ ...modal, insuranceCompanyId: e.target.value })}>
                  <option value="">دفع مباشر من المريض</option>
                  {insuranceCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>رقم قومي</label>
                <input className={MODAL_INPUT_CLS} dir="ltr" value={modal.nationalId} onChange={e => setModal({ ...modal, nationalId: e.target.value })} placeholder="14 رقم" />
              </div>
              <div>
                <label className={labelCls}>رقم تأمين</label>
                <input className={MODAL_INPUT_CLS} dir="ltr" value={modal.insuranceNumber} onChange={e => setModal({ ...modal, insuranceNumber: e.target.value })} />
              </div>
              <div className="relative">
                <label className={labelCls}>الطبيب المحيل</label>
                <input className={MODAL_INPUT_CLS} value={physicianSearch || modal.referralDoctor} onChange={e => { setPhysicianSearch(e.target.value); if (!e.target.value) setModal({ ...modal, referringPhysicianId: "", referralDoctor: "" }); }} placeholder="ابحث عن طبيب..." />
                {physicianSearch.trim() && (
                  <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-xl">
                    {physicianResults.length === 0 ? <div className="px-3 py-2 text-sm text-gray-500">لا توجد نتائج</div> : physicianResults.map(p => (
                      <button key={p.id} type="button" onClick={() => pickPhysician(p)} className="block w-full text-right px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"><span className="font-medium">{p.name}</span></button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>التاريخ</label>
                <input type="date" className={MODAL_INPUT_CLS} value={modal.appointmentDate} onChange={e => setModal({ ...modal, appointmentDate: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>الوقت</label>
                <input type="time" className={MODAL_INPUT_CLS} value={modal.appointmentTime} onChange={e => setModal({ ...modal, appointmentTime: e.target.value })} />
              </div>
              {additions.length > 0 ? (
                <div className="sm:col-span-2">
                  <label className={labelCls}>إضافات الفحص</label>
                  <div className="flex flex-wrap gap-2">
                    {additions.map(a => (
                      <label key={a.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-600 rounded-lg px-3 py-1.5 cursor-pointer">
                        <input type="checkbox" checked={modal.additionIds.includes(a.id)} onChange={() => setModal({ ...modal, additionIds: modal.additionIds.includes(a.id) ? modal.additionIds.filter(x => x !== a.id) : [...modal.additionIds, a.id] })} className="rounded border-gray-300 dark:border-gray-600" />
                        {a.name} ({Number(a.price).toFixed(0)} ج)
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="sm:col-span-2 flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={modal.emergency} onChange={e => setModal({ ...modal, emergency: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />حالة طارئة
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>ملاحظات</label>
                <input className={MODAL_INPUT_CLS} value={modal.notes} onChange={e => setModal({ ...modal, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg disabled:opacity-50">إلغاء</button>
              {!modal.id && modal.status === "CHECKED_IN" ? (
                <button onClick={() => save(true)} disabled={saving} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}حجز وتحويل لدراسة
                </button>
              ) : (
                <button onClick={() => save(false)} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}حفظ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
