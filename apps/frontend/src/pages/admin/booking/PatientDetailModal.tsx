import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookingPatient, BookingAppointment, MODAL_CONTENT_CLS, STATUS_MAP, INVOICE_STATUS_MAP, api, getAuthHeaders, tryParseJSON } from "./shared";
import MedicalHistoryChecklist, { MedicalHistoryValue } from "./MedicalHistoryChecklist";
import { computeAge } from "./patientAge";

import { X, ExternalLink } from 'lucide-react'
interface Props {
  patientId: string;
  onClose: () => void;
}

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

const DETAIL_TABS = [
  { id: "data", label: "بيانات" },
  { id: "medical", label: "التاريخ الطبي" },
  { id: "appointments", label: "المواعيد" },
] as const;

type DetailTab = typeof DETAIL_TABS[number]["id"];

export default function PatientDetailModal({ patientId, onClose }: Props) {
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>("data");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(api(`patients/${patientId}`), { headers: getAuthHeaders() });
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
  }, [patientId]);

  const allergies = renderList(patient?.allergies);
  const diseases = renderList(patient?.chronicDiseases);
  const medications = renderList(patient?.medications);
  const medicalHistory = parseMedicalHistory(patient?.medicalHistory);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`${MODAL_CONTENT_CLS} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">ملف المريض</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <p className="text-center py-12 text-gray-400 dark:text-gray-500">جاري التحميل...</p>
        ) : error ? (
          <p className="text-center py-12 text-red-500">{error}</p>
        ) : patient ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{patient.firstName} {patient.lastName || ""}</p>
              <div className="flex gap-2">
                {DETAIL_TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 text-sm rounded-lg ${tab === t.id ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>{t.label}</button>
                ))}
              </div>
            </div>

            {tab === "data" && (<>
              {/* Patient info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <div><p className="text-sm font-semibold">{patient.firstName} {patient.lastName || ""}</p><p className="text-xs text-gray-500 dark:text-gray-400">{GENDER_LABEL[patient.gender || ""] || ""} {patient.bloodType ? `· فصيلة ${patient.bloodType}` : ""}</p></div>
                <div className="text-sm space-y-1">
                  {patient.phone && <p dir="ltr">📞 {patient.phone}</p>}
                  {patient.email && <p dir="ltr" className="text-xs text-gray-500 dark:text-gray-400">✉️ {patient.email}</p>}
                  {patient.nationalId && <p dir="ltr" className="text-xs text-gray-500 dark:text-gray-400">🪪 الرقم القومي: {patient.nationalId}</p>}
                  {patient.address && <p>📍 {patient.address}</p>}
                  {patient.birthDate && (
                    <p>🎂 {String(patient.birthDate).split("T")[0]}{computeAge(String(patient.birthDate)) && <span className="text-xs text-gray-500 dark:text-gray-400"> · العمر: {computeAge(String(patient.birthDate))}</span>}</p>
                  )}
                  {patient.nationalIdImage && (
                    <div className="pt-1">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">صورة البطاقة</p>
                      <img src={patient.nationalIdImage} alt="بطاقة الرقم القومي" className="w-32 h-24 object-cover rounded-lg border dark:border-gray-600" />
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {patient.status && <div><p className="text-gray-500 dark:text-gray-400 mb-0.5">الحالة</p><p className="font-medium">{statusLabel(patient.status)}</p></div>}
                  {patient.source && <div><p className="text-gray-500 dark:text-gray-400 mb-0.5">المصدر</p><p className="font-medium">{patient.source}</p></div>}
                  {patient.maritalStatus && <div><p className="text-gray-500 dark:text-gray-400 mb-0.5">الحالة الاجتماعية</p><p className="font-medium">{maritalLabel(patient.maritalStatus)}</p></div>}
                  {patient.city && <div><p className="text-gray-500 dark:text-gray-400 mb-0.5">المدينة</p><p className="font-medium">{patient.city}</p></div>}
                  {patient.occupation && <div><p className="text-gray-500 dark:text-gray-400 mb-0.5">المهنة</p><p className="font-medium">{patient.occupation}</p></div>}
                  {patient.referringPhysician && <div><p className="text-gray-500 dark:text-gray-400 mb-0.5">الطبيب المحوّل</p><p className="font-medium">{patient.referringPhysician.name}</p></div>}
                  {patient.priceList && <div><p className="text-gray-500 dark:text-gray-400 mb-0.5">قائمة الأسعار</p><p className="font-medium">{patient.priceList.name}</p></div>}
                </div>
                {allergies && <div className="md:col-span-2"><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الحساسية</p><div className="flex flex-wrap gap-1">{allergies.map((a, i) => <span key={i} className="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">{a}</span>)}</div></div>}
                {diseases && <div className="md:col-span-2"><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">أمراض مزمنة</p><div className="flex flex-wrap gap-1">{diseases.map((d, i) => <span key={i} className="text-xs bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full">{d}</span>)}</div></div>}
                {medications && <div className="md:col-span-2"><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">أدوية حالية</p><div className="flex flex-wrap gap-1">{medications.map((m, i) => <span key={i} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">{m}</span>)}</div></div>}
                {patient.notes && <div className="md:col-span-2"><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">ملاحظات</p><p className="text-sm">{patient.notes}</p></div>}
                {patient.customer && <div className="md:col-span-2 text-xs text-gray-500 dark:text-gray-400">عميل مرتبط: {patient.customer.firstName} {patient.customer.lastName || ""}</div>}
              </div>

              {/* Summary strip */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                  <p className="text-lg font-bold">{patient.appointments?.length || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">زيارات</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{fmtMoney(patient.financialSummary?.totalPaid)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">مسدد</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">{fmtMoney(patient.financialSummary?.outstanding)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">متبقي</p>
                </div>
              </div>

              {/* Invoices */}
              <div>
                <h4 className="font-bold mb-3">الفواتير ({patient.invoices?.length || 0})</h4>
                {(!patient.invoices || patient.invoices.length === 0) ? (
                  <p className="text-center py-6 text-gray-400 dark:text-gray-500">لا توجد فواتير</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">{["رقم الفاتورة", "التاريخ", "الإجمالي", "المسدد", "المتبقي", "الحالة"].map(h => <th key={h} className="text-right py-2.5 px-3">{h}</th>)}</tr></thead>
                      <tbody>{patient.invoices.map(inv => (
                        <tr key={inv.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="py-2.5 px-3 font-medium">{inv.invoiceNumber}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{String(inv.createdAt).split("T")[0]}</td>
                          <td className="py-2.5 px-3">{fmtMoney(inv.total)}</td>
                          <td className="py-2.5 px-3 text-green-600 dark:text-green-400">{fmtMoney(inv.amountPaid)}</td>
                          <td className="py-2.5 px-3 text-red-600 dark:text-red-400">{fmtMoney(inv.remaining)}</td>
                          <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs ${INVOICE_STATUS_MAP[inv.status]?.color || ""}`}>{INVOICE_STATUS_MAP[inv.status]?.label || inv.status}</span></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>
            </>)}

            {tab === "medical" && (
              <div className="space-y-4">
                <MedicalHistoryChecklist value={medicalHistory} onChange={() => { /* read-only */ }} readOnly />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {diseases && <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">أمراض مزمنة</p><div className="flex flex-wrap gap-1">{diseases.map((d, i) => <span key={i} className="text-xs bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full">{d}</span>)}</div></div>}
                  {allergies && <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الحساسية</p><div className="flex flex-wrap gap-1">{allergies.map((a, i) => <span key={i} className="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">{a}</span>)}</div></div>}
                </div>
                {!medicalHistory && !diseases && !allergies && <p className="text-center py-8 text-gray-400 dark:text-gray-500">لا توجد بيانات طبية مسجلة</p>}
              </div>
            )}

            {tab === "appointments" && (
              <div>
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

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => { navigate(`/admin/booking/patients/${patientId}`); }} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><ExternalLink className="w-4 h-4" />فتح في صفحة مستقلة</button>
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إغلاق</button>
        </div>
      </div>
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
