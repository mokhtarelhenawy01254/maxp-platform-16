import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { BookingPatient, BookingAppointment, STATUS_MAP, INVOICE_STATUS_MAP, PAYMENT_METHOD_LABEL, api, getAuthHeaders, tryParseJSON, fetchJson } from "./shared";
import MedicalHistoryChecklist, { MedicalHistoryValue } from "./MedicalHistoryChecklist";
import PatientModal from "./PatientModal";

interface PatientInvoice {
  id: string; invoiceNumber: string; appointmentId?: string;
  total: number; discount: number; amountPaid: number; net: number; remaining: number;
  status: string; createdAt: string;
  payments?: { id: string; amount: number; method: string; paidAt: string }[];
}

interface PatientDetail extends BookingPatient {
  appointments: (BookingAppointment & {
    branch?: { id: string; name: string };
    doctor?: { id: string; title: string; name: string };
  })[];
  invoices?: PatientInvoice[];
  financialSummary?: {
    invoiceCount: number; totalBilled: number; totalPaid: number;
    outstanding: number; unpaidInvoices: number;
  };
}

const GENDER_LABEL: Record<string, string> = { male: "ذكر", female: "أنثى" };
const fmtMoney = (n?: number) => (n != null ? `${Number(n).toFixed(2)} ج.م` : "—");

const renderVitals = (v: unknown): string => {
  const parsed = tryParseJSON<Record<string, unknown>>(v);
  if (!parsed || Object.keys(parsed).length === 0) return "";
  return Object.entries(parsed).map(([k, val]) => {
    const labels: Record<string, string> = { pressure: "الضغط", weight: "الوزن", temp: "الحرارة", pulse: "النبض", sugar: "السكر" };
    return `${labels[k] || k}: ${String(val)}`;
  }).join(" · ");
};

const renderList = (v: unknown): string[] | null => {
  const arr = tryParseJSON<string[]>(v) || (Array.isArray(v) ? v : null);
  return arr && arr.length > 0 ? arr : null;
};

const parseMedicalHistory = (v: unknown): MedicalHistoryValue | null => {
  const parsed = tryParseJSON<MedicalHistoryValue>(v);
  if (parsed && parsed.conditions && Array.isArray(parsed.conditions)) return parsed;
  return null;
};

const PAGE_TABS = [
  { id: "data", label: "بيانات" },
  { id: "medical", label: "التاريخ الطبي" },
  { id: "appointments", label: "المواعيد" },
] as const;

type PageTab = typeof PAGE_TABS[number]["id"];

export default function PatientDetailPage({ patientId }: { patientId?: string }) {
  const id = patientId;
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<PageTab>("data");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(api(`patients/${id}`), { headers: getAuthHeaders() });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "فشل التحميل");
        if (!cancelled) setPatient(json.data);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "خطأ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const allergies = renderList(patient?.allergies);
  const diseases = renderList(patient?.chronicDiseases);
  const medications = renderList(patient?.medications);
  const medicalHistory = parseMedicalHistory(patient?.medicalHistory);

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full h-full overflow-y-auto" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/booking/patients")} className="p-2 border dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" title="رجوع"><ArrowRightIcon className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ملف المريض</h1>
            {patient && <p className="text-sm text-gray-500 dark:text-gray-400">{patient.firstName} {patient.lastName || ""}</p>}
          </div>
        </div>
        {patient && (
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">تعديل</button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-center py-16 text-gray-400 dark:text-gray-500">جاري التحميل...</p>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => navigate("/admin/booking/patients")} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">العودة للمرضى</button>
        </div>
      ) : patient ? (
        <div className="space-y-6 max-w-5xl">
          <div className="flex gap-2">
            {PAGE_TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-sm rounded-lg font-semibold ${tab === t.id ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>{t.label}</button>
            ))}
          </div>

          {tab === "data" && (<>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
              <div>
                <p className="text-lg font-bold">{patient.firstName} {patient.lastName || ""}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{GENDER_LABEL[patient.gender || ""] || ""} {patient.bloodType ? `· فصيلة ${patient.bloodType}` : ""}</p>
              </div>
              <div className="text-sm space-y-1.5">
                {patient.phone && <p dir="ltr">📞 {patient.phone}</p>}
                {patient.email && <p dir="ltr" className="text-xs text-gray-500 dark:text-gray-400">✉️ {patient.email}</p>}
                {patient.nationalId && <p dir="ltr" className="text-xs text-gray-500 dark:text-gray-400">🪪 الرقم القومي: {patient.nationalId}</p>}
                {patient.address && <p>📍 {patient.address}</p>}
                {patient.birthDate && <p>🎂 {String(patient.birthDate).split("T")[0]}</p>}
                {patient.nationalIdImage && (
                  <div className="pt-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">صورة البطاقة</p>
                    <img src={patient.nationalIdImage} alt="بطاقة الرقم القومي" className="w-40 h-28 object-cover rounded-lg border dark:border-gray-600" />
                  </div>
                )}
              </div>
              <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                {patient.status && <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">الحالة</p><p className="font-medium">{statusLabel(patient.status)}</p></div>}
                {patient.source && <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">المصدر</p><p className="font-medium">{patient.source}</p></div>}
                {patient.maritalStatus && <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">الحالة الاجتماعية</p><p className="font-medium">{maritalLabel(patient.maritalStatus)}</p></div>}
                {patient.city && <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">المدينة</p><p className="font-medium">{patient.city}</p></div>}
                {patient.occupation && <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">المهنة</p><p className="font-medium">{patient.occupation}</p></div>}
                {patient.referringPhysician && <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">الطبيب المحوّل</p><p className="font-medium">{patient.referringPhysician.name}</p></div>}
                {patient.priceList && <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">قائمة الأسعار</p><p className="font-medium">{patient.priceList.name}</p></div>}
              </div>
              {allergies && <div className="md:col-span-2"><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الحساسية</p><div className="flex flex-wrap gap-1">{allergies.map((a, i) => <span key={i} className="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">{a}</span>)}</div></div>}
              {diseases && <div className="md:col-span-2"><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">أمراض مزمنة</p><div className="flex flex-wrap gap-1">{diseases.map((d, i) => <span key={i} className="text-xs bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full">{d}</span>)}</div></div>}
              {medications && <div className="md:col-span-2"><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">أدوية حالية</p><div className="flex flex-wrap gap-1">{medications.map((m, i) => <span key={i} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">{m}</span>)}</div></div>}
              {patient.notes && <div className="md:col-span-2"><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">ملاحظات</p><p className="text-sm">{patient.notes}</p></div>}
              {patient.customer && <div className="md:col-span-2 text-xs text-gray-500 dark:text-gray-400">عميل مرتبط: {patient.customer.firstName} {patient.customer.lastName || ""}</div>}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">الزيارات</p>
                <p className="text-xl font-bold">{patient.appointments?.length || 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">الفواتير</p>
                <p className="text-xl font-bold">{patient.financialSummary?.invoiceCount ?? patient.invoices?.length ?? 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">إجمالي المطالب</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{fmtMoney(patient.financialSummary?.totalBilled)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">المسدد</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{fmtMoney(patient.financialSummary?.totalPaid)}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">المتبقي</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">{fmtMoney(patient.financialSummary?.outstanding)}</p>
              </div>
            </div>

            {/* Invoices */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
              <h4 className="font-bold mb-3">الفواتير ({patient.invoices?.length || 0})</h4>
              {(!patient.invoices || patient.invoices.length === 0) ? (
                <p className="text-center py-8 text-gray-400 dark:text-gray-500">لا توجد فواتير</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">{["رقم الفاتورة", "التاريخ", "الإجمالي", "الخصم", "المسدد", "المتبقي", "الحالة", "الدفعات"].map(h => <th key={h} className="text-right py-2.5 px-3">{h}</th>)}</tr></thead>
                    <tbody>{patient.invoices.map(inv => (
                      <tr key={inv.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="py-2.5 px-3 font-medium">{inv.invoiceNumber}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{String(inv.createdAt).split("T")[0]}</td>
                        <td className="py-2.5 px-3">{fmtMoney(inv.total)}</td>
                        <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">{fmtMoney(inv.discount)}</td>
                        <td className="py-2.5 px-3 text-green-600 dark:text-green-400">{fmtMoney(inv.amountPaid)}</td>
                        <td className="py-2.5 px-3 text-red-600 dark:text-red-400">{fmtMoney(inv.remaining)}</td>
                        <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs ${INVOICE_STATUS_MAP[inv.status]?.color || ""}`}>{INVOICE_STATUS_MAP[inv.status]?.label || inv.status}</span></td>
                        <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-gray-400">
                          {inv.payments?.length ? inv.payments.map((p, i) => <div key={i} dir="ltr">{fmtMoney(p.amount)} · {PAYMENT_METHOD_LABEL[p.method] || p.method}</div>) : "—"}
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </>)}

          {tab === "medical" && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5 space-y-4">
              <MedicalHistoryChecklist value={medicalHistory} onChange={() => { /* read-only */ }} readOnly />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {diseases && <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">أمراض مزمنة</p><div className="flex flex-wrap gap-1">{diseases.map((d, i) => <span key={i} className="text-xs bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full">{d}</span>)}</div></div>}
                {allergies && <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الحساسية</p><div className="flex flex-wrap gap-1">{allergies.map((a, i) => <span key={i} className="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">{a}</span>)}</div></div>}
              </div>
              {!medicalHistory && !diseases && !allergies && <p className="text-center py-8 text-gray-400 dark:text-gray-500">لا توجد بيانات طبية مسجلة</p>}
            </div>
          )}

          {tab === "appointments" && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
              <h4 className="font-bold mb-3">تاريخ الزيارات ({patient.appointments?.length || 0})</h4>
              {(!patient.appointments || patient.appointments.length === 0) ? (
                <p className="text-center py-8 text-gray-400 dark:text-gray-500">لا توجد زيارات مسجلة بعد</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">{["التاريخ", "الوقت", "الفرع", "الطبيب", "الخدمة", "الحيوية", "التشخيص", "الحالة", "الدفع"].map(h => <th key={h} className="text-right py-2.5 px-3">{h}</th>)}</tr></thead>
                    <tbody>{patient.appointments.map(a => (
                      <tr key={a.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="py-2.5 px-3 whitespace-nowrap">{String(a.appointmentDate).split("T")[0]}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{a.startTime}</td>
                        <td className="py-2.5 px-3">{a.branch?.name || "—"}</td>
                        <td className="py-2.5 px-3">{(a.doctor ? `${a.doctor.title || ""} ${a.doctor.name || ""}` : a.doctorName || "—").trim()}</td>
                        <td className="py-2.5 px-3">{a.serviceName || "—"}</td>
                        <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-gray-400">{renderVitals(a.vitals) || "—"}</td>
                        <td className="py-2.5 px-3 max-w-[220px]">
                          {a.diagnosis ? (
                            <div>
                              <p className="truncate" title={a.diagnosis}>{a.diagnosis}</p>
                              {(a.treatmentPlan || a.prescription) && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate" title={`${a.treatmentPlan || ""} ${a.prescription || ""}`}>
                                  {a.treatmentPlan ? `خطة: ${a.treatmentPlan}` : ""}{a.treatmentPlan && a.prescription ? " · " : ""}{a.prescription ? `وصفة: ${a.prescription}` : ""}
                                </p>
                              )}
                            </div>
                          ) : "—"}
                        </td>
                        <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_MAP[a.status]?.color || ""}`}>{STATUS_MAP[a.status]?.label || a.status}</span></td>
                        <td className="py-2.5 px-3 text-xs">
                          {a.paymentRequired || a.paymentStatus ? (
                            <span className={`px-2 py-0.5 rounded-full ${a.paymentStatus === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : a.paymentStatus === "partial" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                              {a.paymentStatus === "paid" ? "مدفوع" : a.paymentStatus === "partial" ? "جزئي" : "غير مدفوع"}
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
      {editing && patient && (
        <PatientModal
          patient={patient}
          onClose={() => setEditing(false)}
          onSave={async (d) => {
            await fetchJson(api(`patients/${id}`), { method: "PUT", body: JSON.stringify(d) });
            const res = await fetch(api(`patients/${id}`), { headers: getAuthHeaders() });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "فشل التحميل");
            setPatient(json.data);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

const statusLabel = (s: string): string => {
  const labels: Record<string, string> = { ACTIVE: "نشط", INACTIVE: "غير نشط", REVIEW: "قيد المراجعة" };
  return labels[s] || s;
};

const maritalLabel = (s: string): string => {
  const labels: Record<string, string> = { SINGLE: "أعزب/عزباء", MARRIED: "متزوج/متزوجة", DIVORCED: "مطلق/مطلقة", WIDOW: "أرمل/أرملة" };
  return labels[s] || s;
};
