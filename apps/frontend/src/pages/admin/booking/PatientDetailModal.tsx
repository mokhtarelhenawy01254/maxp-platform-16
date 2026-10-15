import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookingPatient,
  BookingAppointment,
  MODAL_CONTENT_CLS,
  api,
  getAuthHeaders,
  tryParseJSON,
} from "./shared";
import MedicalHistoryChecklist, { MedicalHistoryValue } from "./MedicalHistoryChecklist";
import PatientDetailBasicInfoCard from "./PatientDetailBasicInfoCard";
import PatientDetailAppointmentsTable from "./PatientDetailAppointmentsTable";
import PatientDetailInvoicesTable, { PatientInvoice } from "./PatientDetailInvoicesTable";
import {
  X,
  ExternalLink,
  User,
  Calendar,
  HeartPulse,
} from "lucide-react";

interface Props {
  patientId: string;
  onClose: () => void;
}

interface PatientDetail extends BookingPatient {
  appointments: (BookingAppointment & {
    branch?: { id: string; name: string };
    doctor?: { id: string; title: string; name: string };
  })[];
  invoices?: PatientInvoice[];
  financialSummary?: {
    invoiceCount: number;
    totalBilled: number;
    totalPaid: number;
    outstanding: number;
    unpaidInvoices: number;
  };
}

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
  { id: "data", label: "البيانات الأساسية", icon: User },
  { id: "medical", label: "التاريخ الطبي", icon: HeartPulse },
  { id: "appointments", label: "سجل الزيارات", icon: Calendar },
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
        if (!json.success) throw new Error(json.error || "فشل تحميل بيانات المريض");
        if (!cancelled) setPatient(json.data);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "خطأ غير متوقع");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const allergies = renderList(patient?.allergies);
  const diseases = renderList(patient?.chronicDiseases);
  const medications = renderList(patient?.medications);
  const medicalHistory = parseMedicalHistory(patient?.medicalHistory);

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`${MODAL_CONTENT_CLS} max-h-[92vh] overflow-y-auto bg-card border border-border/80 rounded-2xl shadow-2xl text-foreground font-sans max-w-3xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                ملف المريض السريري
              </h3>
              <p className="text-xs text-muted-foreground">
                الملف الطبي، سجل الزيارات، والفواتير المالية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-2">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs">جاري تحميل ملف المريض...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs">
            {error}
          </div>
        ) : patient ? (
          <div className="space-y-5">
            {/* Top Switcher & Name */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-muted/30 border border-border/60 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  {patient.firstName} {patient.lastName || ""}
                </span>
                <span className="text-xs text-muted-foreground font-mono tabular-nums" dir="ltr">
                  ({patient.phone || "بدون هاتف"})
                </span>
              </div>
              <div className="flex gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50">
                {DETAIL_TABS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md font-medium transition-all ${
                        tab === t.id
                          ? "bg-card text-foreground shadow-xs border border-border/60"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab 1: Data */}
            {tab === "data" && (
              <>
                <PatientDetailBasicInfoCard
                  patient={patient}
                  allergies={allergies}
                  diseases={diseases}
                  medications={medications}
                />
                <PatientDetailInvoicesTable
                  invoices={patient.invoices}
                  financialSummary={patient.financialSummary}
                  totalAppointmentsCount={patient.appointments?.length || 0}
                />
              </>
            )}

            {/* Tab 2: Medical History */}
            {tab === "medical" && (
              <div className="space-y-4">
                <MedicalHistoryChecklist value={medicalHistory} onChange={() => {}} readOnly />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                  {diseases && (
                    <div className="bg-muted/20 border border-border/60 rounded-xl p-3">
                      <p className="text-xs font-semibold text-foreground mb-1.5">الأمراض المزمنة الموثقة:</p>
                      <div className="flex flex-wrap gap-1">
                        {diseases.map((d, i) => (
                          <span key={i} className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {allergies && (
                    <div className="bg-muted/20 border border-border/60 rounded-xl p-3">
                      <p className="text-xs font-semibold text-foreground mb-1.5">حساسية المواد الموثقة:</p>
                      <div className="flex flex-wrap gap-1">
                        {allergies.map((a, i) => (
                          <span key={i} className="text-xs bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded-md">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {!medicalHistory && !diseases && !allergies && (
                  <p className="text-center py-8 text-xs text-muted-foreground bg-muted/20 border border-border/60 rounded-xl">
                    لا توجد بيانات أو استبيانات طبية مسجلة لهذا المريض
                  </p>
                )}
              </div>
            )}

            {/* Tab 3: Appointments */}
            {tab === "appointments" && (
              <PatientDetailAppointmentsTable appointments={patient.appointments} />
            )}
          </div>
        ) : null}

        {/* Modal Actions */}
        <div className="flex items-center justify-between gap-2.5 pt-4 mt-4 border-t border-border/60">
          <button
            onClick={() => {
              navigate(`/admin/booking/patients/${patientId}`);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary/20 text-xs sm:text-sm font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>فتح في صفحة مستقلة</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium border border-border/70 rounded-xl bg-card text-foreground hover:bg-muted/60 transition-colors shadow-xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
