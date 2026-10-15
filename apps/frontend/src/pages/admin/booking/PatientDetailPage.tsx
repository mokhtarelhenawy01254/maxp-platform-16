import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Phone, Mail, CreditCard, MapPin, Calendar,
  User, Edit, AlertCircle, RefreshCw, Activity,
} from "lucide-react";
import {
  BookingPatient, BookingAppointment, STATUS_MAP, INVOICE_STATUS_MAP,
  PAYMENT_METHOD_LABEL, api, getAuthHeaders, tryParseJSON, fetchJson,
} from "./shared";
import MedicalHistoryChecklist, { MedicalHistoryValue } from "./MedicalHistoryChecklist";
import PatientModal from "./PatientModal";
import PatientDocumentsTab from "./PatientDocumentsTab";
import { computeAge } from "./patientAge";

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
  { id: "data", label: "البيانات الأساسية والفواتير" },
  { id: "medical", label: "التاريخ الطبي والحساسية" },
  { id: "appointments", label: "سجل الزيارات والكشوفات" },
  { id: "documents", label: "المستندات والملفات" },
] as const;

type PageTab = typeof PAGE_TABS[number]["id"];

const statusLabel = (s: string): string => {
  const labels: Record<string, string> = { ACTIVE: "نشط", INACTIVE: "غير نشط", REVIEW: "قيد المراجعة" };
  return labels[s] || s;
};

const maritalLabel = (s: string): string => {
  const labels: Record<string, string> = { SINGLE: "أعزب/عزباء", MARRIED: "متزوج/متزوجة", DIVORCED: "مطلق/مطلقة", WIDOW: "أرمل/أرملة" };
  return labels[s] || s;
};

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
        if (!cancelled) setError(e instanceof Error ? e.message : "خطأ أثناء جلب الملف");
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
    <div className="p-4 md:p-6 lg:p-8 w-full h-full overflow-y-auto space-y-6" dir="rtl">
      {/* Top Header Surface */}
      <div className="bg-card border border-border/70 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/booking/patients")}
            className="p-2 border border-border/70 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="رجوع لقائمة المرضى"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {patient ? `${patient.firstName} ${patient.lastName || ""}` : "ملف المريض"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              الملف الطبي الشامل، الفواتير، الزيارات السابقة، والمستندات المرفقة
            </p>
          </div>
        </div>

        {patient && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Edit className="w-3.5 h-3.5" />
            تعديل الملف
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-xs text-muted-foreground">جاري تحميل بيانات المريض...</div>
      ) : error ? (
        <div className="bg-card border border-border/70 rounded-xl p-8 text-center max-w-md mx-auto space-y-3">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-xs text-destructive">{error}</p>
          <button
            onClick={() => navigate("/admin/booking/patients")}
            className="px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg"
          >
            العودة لقائمة المرضى
          </button>
        </div>
      ) : patient ? (
        <div className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 pb-2">
            {PAGE_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  tab === t.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Data & Invoices */}
          {tab === "data" && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-card border border-border/70 rounded-xl p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-foreground">{patient.firstName} {patient.lastName || ""}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {GENDER_LABEL[patient.gender || ""] || ""} {patient.bloodType ? `· فصيلة ${patient.bloodType}` : ""}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium border bg-muted border-border/70 text-foreground">
                    {statusLabel(patient.status || "")}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  {patient.phone && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> الهاتف</span>
                      <p className="font-mono text-foreground" dir="ltr">{patient.phone}</p>
                    </div>
                  )}
                  {patient.email && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> البريد الإلكتروني</span>
                      <p className="font-mono text-foreground" dir="ltr">{patient.email}</p>
                    </div>
                  )}
                  {patient.nationalId && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground flex items-center gap-1"><CreditCard className="w-3 h-3" /> الرقم القومي</span>
                      <p className="font-mono text-foreground" dir="ltr">{patient.nationalId}</p>
                    </div>
                  )}
                  {patient.birthDate && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> تاريخ الميلاد</span>
                      <p className="font-mono text-foreground">
                        {String(patient.birthDate).split("T")[0]}
                        {computeAge(String(patient.birthDate)) && <span className="text-muted-foreground"> ({computeAge(String(patient.birthDate))})</span>}
                      </p>
                    </div>
                  )}
                  {patient.address && (
                    <div className="space-y-0.5 sm:col-span-2">
                      <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> العنوان</span>
                      <p className="text-foreground">{patient.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Telemetry Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-5 rounded-xl border border-border/70 bg-card overflow-hidden divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 shadow-sm">
                <div className="p-3.5 space-y-1">
                  <span className="text-xs text-muted-foreground">الزيارات</span>
                  <div className="text-lg font-bold font-mono tabular-nums text-foreground">{patient.appointments?.length || 0}</div>
                </div>
                <div className="p-3.5 space-y-1">
                  <span className="text-xs text-muted-foreground">الفواتير</span>
                  <div className="text-lg font-bold font-mono tabular-nums text-foreground">{patient.financialSummary?.invoiceCount ?? patient.invoices?.length ?? 0}</div>
                </div>
                <div className="p-3.5 space-y-1">
                  <span className="text-xs text-muted-foreground">إجمالي المطالب</span>
                  <div className="text-lg font-bold font-mono tabular-nums text-foreground">{fmtMoney(patient.financialSummary?.totalBilled)}</div>
                </div>
                <div className="p-3.5 space-y-1">
                  <span className="text-xs text-muted-foreground">المسدد</span>
                  <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{fmtMoney(patient.financialSummary?.totalPaid)}</div>
                </div>
                <div className="p-3.5 space-y-1">
                  <span className="text-xs text-muted-foreground">المتبقي</span>
                  <div className="text-lg font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">{fmtMoney(patient.financialSummary?.outstanding)}</div>
                </div>
              </div>

              {/* Invoices Surface */}
              <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border/60 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">سجل الفواتير ({patient.invoices?.length || 0})</h3>
                </div>
                {(!patient.invoices || patient.invoices.length === 0) ? (
                  <p className="text-center py-8 text-xs text-muted-foreground">لا توجد فواتير مسجلة لهذا المريض</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground uppercase font-medium">
                          {["رقم الفاتورة", "التاريخ", "الإجمالي", "الخصم", "المسدد", "المتبقي", "الحالة", "الدفعات"].map(h => (
                            <th key={h} className="py-2.5 px-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {patient.invoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-medium text-foreground">{inv.invoiceNumber}</td>
                            <td className="py-2.5 px-3 font-mono text-muted-foreground">{String(inv.createdAt).split("T")[0]}</td>
                            <td className="py-2.5 px-3 font-mono font-semibold">{fmtMoney(inv.total)}</td>
                            <td className="py-2.5 px-3 font-mono text-muted-foreground">{fmtMoney(inv.discount)}</td>
                            <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{fmtMoney(inv.amountPaid)}</td>
                            <td className="py-2.5 px-3 font-mono text-rose-600 dark:text-rose-400 font-semibold">{fmtMoney(inv.remaining)}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${INVOICE_STATUS_MAP[inv.status]?.color || "bg-muted text-muted-foreground border-border/60"}`}>
                                {INVOICE_STATUS_MAP[inv.status]?.label || inv.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                              {inv.payments?.length ? inv.payments.map((p, i) => <div key={i} dir="ltr">{fmtMoney(p.amount)} · {PAYMENT_METHOD_LABEL[p.method] || p.method}</div>) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Medical History */}
          {tab === "medical" && (
            <div className="bg-card border border-border/70 rounded-xl p-5 space-y-4 shadow-sm">
              <MedicalHistoryChecklist value={medicalHistory} onChange={() => {}} readOnly />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border/60">
                {diseases && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">الأمراض المزمنة</p>
                    <div className="flex flex-wrap gap-1.5">{diseases.map((d, i) => <span key={i} className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-md">{d}</span>)}</div>
                  </div>
                )}
                {allergies && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">الحساسية والموانع</p>
                    <div className="flex flex-wrap gap-1.5">{allergies.map((a, i) => <span key={i} className="text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2.5 py-0.5 rounded-md">{a}</span>)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Appointments */}
          {tab === "appointments" && (
            <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border/60 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">تاريخ وسجل الكشوفات ({patient.appointments?.length || 0})</h3>
              </div>
              {(!patient.appointments || patient.appointments.length === 0) ? (
                <p className="text-center py-8 text-xs text-muted-foreground">لا توجد زيارات مسجلة للمريض حتى الآن</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground uppercase font-medium">
                        {["التاريخ", "الوقت", "الفرع", "الطبيب", "الخدمة", "العلامات الحيوية", "التشخيص", "الحالة"].map(h => (
                          <th key={h} className="py-2.5 px-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {patient.appointments.map(a => (
                        <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-medium">{String(a.appointmentDate).split("T")[0]}</td>
                          <td className="py-2.5 px-3 font-mono text-muted-foreground">{a.startTime}</td>
                          <td className="py-2.5 px-3 text-foreground">{a.branch?.name || "—"}</td>
                          <td className="py-2.5 px-3 text-foreground">{(a.doctor ? `${a.doctor.title || ""} ${a.doctor.name || ""}` : a.doctorName || "—").trim()}</td>
                          <td className="py-2.5 px-3 text-foreground">{a.serviceName || "—"}</td>
                          <td className="py-2.5 px-3 font-mono text-muted-foreground">{renderVitals(a.vitals) || "—"}</td>
                          <td className="py-2.5 px-3 max-w-[200px] truncate text-foreground" title={a.diagnosis || ""}>{a.diagnosis || "—"}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${STATUS_MAP[a.status]?.color || "bg-muted text-muted-foreground border-border/60"}`}>
                              {STATUS_MAP[a.status]?.label || a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Documents */}
          {tab === "documents" && <PatientDocumentsTab patientId={patient.id} />}
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
            if (json.success) setPatient(json.data);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
