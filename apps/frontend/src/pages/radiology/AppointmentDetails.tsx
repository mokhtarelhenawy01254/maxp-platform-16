import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRightLeft, ArrowRight, Loader2, User, CalendarDays, FileText, Stethoscope, Building2, Notes as NotesIcon, History } from "lucide-react";
import { api, fetchJson, RadiologyOrderStatusMap, RADIOLOGY_PATIENT_FLAGS, parsePatientFlags, flagMeta, MODAL_INPUT_CLS } from "./shared";

interface RadiologyAppointmentView {
  id: string; bookingNo?: number; patientId?: string; patientName: string; patientPhone?: string;
  patientGender?: string; patientAge?: string; nationalId?: string; insuranceNumber?: string;
  patientFlags?: string[] | string;
  examTypeId?: string; examTypeName?: string; examTypeIds?: string[] | string;
  deviceId?: string; deviceName?: string; insuranceCompanyId?: string;
  additionIds?: string[] | string; additionAmount?: number;
  referringPhysicianId?: string; referralDoctor?: string;
  emergency?: boolean; appointmentDate?: string; appointmentTime?: string;
  branchId?: string; status: string; notes?: string; studyId?: string; createdAt?: string;
}

interface RadiologyStudyBrief {
  id: string; studyNumber?: string; patientName?: string; examTypeName?: string;
  status?: string; orderStatus?: string; createdAt?: string;
}

interface AppointmentDetailsData {
  appointment: RadiologyAppointmentView;
  studies: RadiologyStudyBrief[];
  orderStatus: string;
}

const APPT_STATUS_META: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "radiology.appointmentStatus.SCHEDULED", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  CHECKED_IN: { label: "radiology.appointmentStatus.CHECKED_IN", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  DONE: { label: "radiology.appointmentStatus.DONE", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  CANCELLED: { label: "radiology.appointmentStatus.CANCELLED", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

const Row = ({ label, children }: { label: string; children?: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 py-1.5">
    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    <span className="text-sm font-medium text-gray-800 dark:text-gray-100 text-left">{children || "—"}</span>
  </div>
);

const Card = ({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
    <h3 className="font-semibold mb-3 flex items-center gap-2">{icon}{title}</h3>
    {children}
  </div>
);

export default function AppointmentDetails({ appointmentId }: { appointmentId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<AppointmentDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchJson<AppointmentDetailsData>(api(`appointments/${appointmentId}/details`));
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("radiology.appointmentDetails.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [appointmentId]);

  const convert = async () => {
    if (!data || converting) return;
    if (!window.confirm(t("radiology.appointmentDetails.convertConfirm", { name: data.appointment.patientName }) as string)) return;
    setConverting(true);
    try {
      await fetchJson(api(`appointments/${appointmentId}/convert`), { method: "POST" });
      toast.success(t("radiology.appointmentDetails.converted"));
      navigate("/radiology/studies");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.appointmentDetails.convertFailed"));
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-24" dir="rtl">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" dir="rtl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 mb-4"><ArrowRight className="w-4 h-4" />{t("radiology.details.back")}</button>
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const a = data.appointment;
  const orderMeta = RadiologyOrderStatusMap[data.orderStatus] || RadiologyOrderStatusMap["PENDING"];
  const apptMeta = APPT_STATUS_META[a.status] || APPT_STATUS_META["SCHEDULED"];
  const flags = parsePatientFlags(a.patientFlags);
  const examNames = (() => {
    try {
      const ids = a.examTypeIds ? JSON.parse(a.examTypeIds as string) : [];
      return Array.isArray(ids) && ids.length ? `${a.examTypeName || ""} +${ids.length - 1}`.trim() : a.examTypeName || "—";
    } catch { return a.examTypeName || "—"; }
  })();
  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("ar-EG") : "—");
  const genderText = (g?: string): string => {
    if (g === "male") return t("radiology.gender.male");
    if (g === "female") return t("radiology.gender.female");
    return t("radiology.gender.unspecified");
  };
  const canConvert = a.status !== "CANCELLED" && a.status !== "DONE";

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full h-full overflow-y-auto" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 px-3 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <ArrowRight className="w-4 h-4" />{t("radiology.details.back")}
          </button>
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {t("radiology.appointmentDetails.title")}
              <span className="text-gray-500 dark:text-gray-400 font-normal text-base" dir="ltr">
                {a.bookingNo ? `#${a.bookingNo}` : `#${a.id.slice(0, 8)}`}
              </span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{fmtDate(a.appointmentDate)}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs ${orderMeta.color}`}>{t(orderMeta.label)}</span>
            <span className={`px-3 py-1 rounded-full text-xs ${apptMeta.color}`}>{t(apptMeta.label)}</span>
          </div>
          {canConvert ? (
            <button onClick={convert} disabled={converting} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm">
              {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
              {t("radiology.appointmentDetails.convert")}
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card title={t("radiology.details.patient")} icon={<User className="w-5 h-5 text-blue-600 dark:text-blue-400" />}>
              <div className="flex flex-wrap gap-2 mb-3">
                {a.emergency ? <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">{t("radiology.schedule.emergency")}</span> : null}
                {flags.map(f => {
                  const meta = flagMeta(f);
                  return meta ? <span key={f} className={`px-2 py-0.5 rounded-full text-xs ${meta.color}`}>{t(meta.label)}</span> : null;
                })}
              </div>
              <Row label={t("radiology.patients.name")}>{a.patientName}</Row>
              <Row label={t("radiology.schedule.phone")}><span dir="ltr">{a.patientPhone || "—"}</span></Row>
              <Row label={t("radiology.schedule.gender")}>{genderText(a.patientGender)}</Row>
              <Row label={t("radiology.schedule.age")}><span dir="ltr">{a.patientAge || "—"}</span></Row>
              <Row label={t("radiology.studies.nationalId")}><span dir="ltr">{a.nationalId || "—"}</span></Row>
              <Row label={t("radiology.studies.insuranceNumber")}><span dir="ltr">{a.insuranceNumber || "—"}</span></Row>
            </Card>

            <Card title={t("radiology.details.exam")} icon={<Stethoscope className="w-5 h-5 text-blue-600 dark:text-blue-400" />}>
              <Row label={t("radiology.appointmentDetails.examType")}>{examNames}</Row>
              <Row label={t("radiology.appointmentDetails.device")}>{a.deviceName || "—"}</Row>
              <Row label={t("radiology.appointmentDetails.appointmentDate")}>{fmtDate(a.appointmentDate)}</Row>
              <Row label={t("radiology.appointmentDetails.appointmentTime")}><span dir="ltr">{a.appointmentTime || "—"}</span></Row>
              <Row label={t("radiology.appointmentDetails.additions")}>{Number(a.additionAmount || 0).toFixed(0)} {t("radiology.currency")}</Row>
              <Row label={t("radiology.appointmentDetails.referringDoctor")}>{a.referralDoctor || "—"}</Row>
              <Row label={t("radiology.appointmentDetails.insuranceCompany")}>{a.insuranceCompanyId ? t("radiology.appointmentDetails.insuranceProvided") : "—"}</Row>
            </Card>

            <Card title={t("radiology.appointmentDetails.studies")} icon={<FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />}>
              {data.studies.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">{t("radiology.appointmentDetails.noStudies")}</p>
              ) : (
                <div className="space-y-2">
                  {data.studies.map(s => (
                    <div key={s.id} className="flex items-center justify-between gap-3 p-3 border dark:border-gray-700 rounded-lg">
                      <div className="min-w-0">
                        <p className="font-medium text-sm" dir="ltr">{s.studyNumber || s.id}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{s.examTypeName || "—"}</p>
                      </div>
                      <button onClick={() => navigate(`/radiology/study/${s.id}`)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        {t("radiology.appointmentDetails.openStudy")}<ArrowRightLeft className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-5">
            <Card title={t("radiology.details.notes")} icon={<NotesIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />}>
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{a.notes || "—"}</p>
            </Card>
            <Card title={t("radiology.appointmentDetails.branch")} icon={<Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />}>
              <p className="text-sm text-gray-600 dark:text-gray-300">{a.branchId || "—"}</p>
            </Card>
            <Card title={t("radiology.appointmentDetails.timeline")} icon={<History className="w-5 h-5 text-blue-600 dark:text-blue-400" />}>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className={`w-3 h-3 rounded-full mt-1 shrink-0 ${orderMeta.color.split(" ")[0] || "bg-gray-300"}`} />
                  <div>
                    <p className="text-sm font-medium">{t("radiology.appointmentDetails.created")}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(a.createdAt)}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
