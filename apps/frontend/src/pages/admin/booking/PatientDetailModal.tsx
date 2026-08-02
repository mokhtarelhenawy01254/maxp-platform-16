import { useEffect, useState } from "react";
;
import { BookingPatient, BookingAppointment, MODAL_CONTENT_CLS, STATUS_MAP, api, getAuthHeaders, tryParseJSON } from "./shared";

import { X } from 'lucide-react'
interface Props {
  patientId: string;
  onClose: () => void;
}

interface PatientDetail extends BookingPatient {
  appointments: (BookingAppointment & {
    branch?: { id: string; name: string };
    doctor?: { id: string; title: string; name: string };
  })[];
}

const GENDER_LABEL: Record<string, string> = { male: "ذكر", female: "أنثى" };

const renderList = (v: unknown): string[] | null => {
  const arr = tryParseJSON<string[]>(v) || (Array.isArray(v) ? v : null);
  return arr && arr.length > 0 ? arr : null;
};

export default function PatientDetailModal({ patientId, onClose }: Props) {
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`${MODAL_CONTENT_CLS} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">ملف المريض</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <p className="text-center py-12 text-gray-400 dark:text-gray-500">جاري التحميل...</p>
        ) : error ? (
          <p className="text-center py-12 text-red-500">{error}</p>
        ) : patient ? (
          <div className="space-y-6">
            {/* Patient info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div><p className="text-sm font-semibold">{patient.firstName} {patient.lastName || ""}</p><p className="text-xs text-gray-500 dark:text-gray-400">{GENDER_LABEL[patient.gender || ""] || ""} {patient.bloodType ? `· فصيلة ${patient.bloodType}` : ""}</p></div>
              <div className="text-sm space-y-1">
                {patient.phone && <p dir="ltr">📞 {patient.phone}</p>}
                {patient.email && <p dir="ltr" className="text-xs text-gray-500 dark:text-gray-400">✉️ {patient.email}</p>}
                {patient.nationalId && <p dir="ltr" className="text-xs text-gray-500 dark:text-gray-400">🪪 الرقم القومي: {patient.nationalId}</p>}
                {patient.address && <p>📍 {patient.address}</p>}
                {patient.birthDate && <p>🎂 {String(patient.birthDate).split("T")[0]}</p>}
                {patient.nationalIdImage && (
                  <div className="pt-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">صورة البطاقة</p>
                    <img src={patient.nationalIdImage} alt="بطاقة الرقم القومي" className="w-32 h-24 object-cover rounded-lg border dark:border-gray-600" />
                  </div>
                )}
              </div>
              {allergies && <div className="md:col-span-2"><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الحساسية</p><div className="flex flex-wrap gap-1">{allergies.map((a, i) => <span key={i} className="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">{a}</span>)}</div></div>}
              {diseases && <div className="md:col-span-2"><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">أمراض مزمنة</p><div className="flex flex-wrap gap-1">{diseases.map((d, i) => <span key={i} className="text-xs bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full">{d}</span>)}</div></div>}
              {medications && <div className="md:col-span-2"><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">أدوية حالية</p><div className="flex flex-wrap gap-1">{medications.map((m, i) => <span key={i} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">{m}</span>)}</div></div>}
              {patient.notes && <div className="md:col-span-2"><p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">ملاحظات</p><p className="text-sm">{patient.notes}</p></div>}
              {patient.customer && <div className="md:col-span-2 text-xs text-gray-500 dark:text-gray-400">عميل مرتبط: {patient.customer.firstName} {patient.customer.lastName || ""}</div>}
            </div>

            {/* Visit history */}
            <div>
              <h4 className="font-bold mb-3">تاريخ الزيارات ({patient.appointments?.length || 0})</h4>
              {(!patient.appointments || patient.appointments.length === 0) ? (
                <p className="text-center py-8 text-gray-400 dark:text-gray-500">لا توجد زيارات مسجلة بعد</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">{["التاريخ", "الوقت", "الفرع", "الطبيب", "الخدمة", "التشخيص", "الحالة"].map(h => <th key={h} className="text-right py-2.5 px-3">{h}</th>)}</tr></thead>
                    <tbody>{patient.appointments.map(a => (
                      <tr key={a.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="py-2.5 px-3 whitespace-nowrap">{String(a.appointmentDate).split("T")[0]}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{a.startTime}</td>
                        <td className="py-2.5 px-3">{a.branch?.name || "—"}</td>
                        <td className="py-2.5 px-3">{(a.doctor ? `${a.doctor.title || ""} ${a.doctor.name || ""}` : a.doctorName || "—").trim()}</td>
                        <td className="py-2.5 px-3">{a.serviceName || "—"}</td>
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
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إغلاق</button>
        </div>
      </div>
    </div>
  );
}
