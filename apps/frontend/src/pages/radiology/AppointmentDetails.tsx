import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRightLeft, ArrowRight, Loader2, User, CalendarDays, FileText, Stethoscope, Building2, ClipboardList, History } from "lucide-react";
import { api, fetchJson, RadiologyOrderStatusMap, parsePatientFlags, flagMeta, useRadiologyRiskFlags, MODAL_CONTENT_CLS } from "./shared";

interface RadiologyAppointmentView {
  id: string; bookingNo?: number; patientId?: string; patientName: string; patientPhone?: string;
  patientGender?: string; patientAge?: string; nationalId?: string; insuranceNumber?: string;
  patientFlags?: string[] | string;
  examTypeId?: string; examTypeName?: string; examTypeIds?: string[] | string;
  deviceId?: string; deviceName?: string; insuranceCompanyId?: string; insuranceCompanyName?: string;
  payerType?: string; referralSourceId?: string; referralSourceName?: string;
  externalPartnerId?: string; externalPartnerName?: string; paymentDestination?: string; isExternalReferral?: boolean;
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
    <span className="text-sm font-medium text-gray-800 dark:text-gray-100 text-left">{children || "ΓÇö"}</span>
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
  useRadiologyRiskFlags();
  const [data, setData] = useState<AppointmentDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);

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
    setShowConvertConfirm(false);
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
      <div className="p-6 flex flex-col items-center gap-2 py-24" dir="rtl">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.loading")}</span>
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
  const orderMeta = (RadiologyOrderStatusMap[data.orderStatus] || RadiologyOrderStatusMap["PENDING"])!;
  const apptMeta = (APPT_STATUS_META[a.status] || APPT_STATUS_META["SCHEDULED"])!;
  const flags = parsePatientFlags(a.patientFlags);
  const examNames = (() => {
    try {
      const ids = a.examTypeIds ? JSON.parse(a.examTypeIds as string) : [];
      return Array.isArray(ids) && ids.length ? `${a.examTypeName || ""} +${ids.length - 1}`.trim() : a.examTypeName || "ΓÇö";
    } catch { return a.examTypeName || "ΓÇö"; }
  })();
  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("ar-EG") : "ΓÇö");
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
          <button onClick={() => navigate("/radiology/schedule")} className="flex items-center gap-1.5 px-3 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <CalendarDays className="w-4 h-4" />{t("radiology.schedule.title")}
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
            <button onClick={() => setShowConvertConfirm(true)} disabled={converting} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm">
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
                  return meta ? <span key={f} className={`px-2 py-0.5 rounded-full text-xs ${meta.color}`}>{meta.label}</span> : null;
                })}
              </div>
              <Row label={t("radiology.patients.name")}>{a.patientName}</Row>
              <Row label={t("radiology.schedule.phone")}><span dir="ltr">{a.patientPhone || "ΓÇö"}</span></Row>
              <Row label={t("radiology.schedule.gender")}>{genderText(a.patientGender)}</Row>
              <Row label={t("radiology.schedule.age")}><span dir="ltr">{a.patientAge || "ΓÇö"}</span></Row>
              <Row label={t("radiology.studies.nationalId")}><span dir="ltr">{a.nationalId || "ΓÇö"}</span></Row>
              <Row label={t("radiology.studies.insuranceNumber")}><span dir="ltr">{a.insuranceNumber || "ΓÇö"}</span></Row>
            </Card>

            <Card title={t("radiology.details.exam")} icon={<Stethoscope className="w-5 h-5 text-blue-600 dark:text-blue-400" />}>
              <Row label={t("radiology.appointmentDetails.examType")}>{examNames}</Row>
              <Row label={t("radiology.appointmentDetails.device")}>{a.deviceName || "ΓÇö"}</Row>
              <Row label={t("radiology.appointmentDetails.appointmentDate")}>{fmtDate(a.appointmentDate)}</Row>
              <Row label={t("radiology.appointmentDetails.appointmentTime")}><span dir="ltr">{a.appointmentTime || "ΓÇö"}</span></Row>
              <Row label={t("radiology.appointmentDetails.additions")}>{Number(a.additionAmount || 0).toFixed(0)} {t("radiology.currency")}</Row>
              <Row label={t("radiology.appointmentDetails.referringDoctor")}>{a.referralDoctor || "ΓÇö"}</Row>
              <Row label={t("radiology.appointmentDetails.insuranceCompany")}>{a.insuranceCompanyId ? t("radiology.appointmentDetails.insuranceProvided") : "ΓÇö"}</Row>
              {(() => {
                const pt = a.payerType || (a.insuranceCompanyId ? "INSURANCE" : a.referralSourceId ? "REFERRAL" : a.isExternalReferral ? "PARTNER" : "CUSTOMER");
                let txt = t("radiology.schedule.payerCustomer");
                if (pt === "INSURANCE") txt = `${t("radiology.schedule.payerInsurance")}${a.insuranceCompanyName ? " ΓÇö " + a.insuranceCompanyName : ""}`;
                else if (pt === "REFERRAL") txt = `${t("radiology.schedule.payerReferral")}${a.referralSourceName ? " ΓÇö " + a.referralSourceName : ""}`;
                else if (pt === "PARTNER") txt = `${t("radiology.schedule.payerPartner")}${a.externalPartnerName ? " ΓÇö " + a.externalPartnerName : ""}`;
                return (
                  <Row label={t("radiology.schedule.payer")}>
                    <span className="flex flex-col items-end gap-0.5">
                      <span>{txt}</span>
                      {pt === "PARTNER" ? <span className="text-xs text-gray-400">{a.paymentDestination === "PARTNER" ? t("radiology.schedule.destPartner") : t("radiology.schedule.destMe")}</span> : null}
                    </span>
                  </Row>
                );
              })()}
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
                        <p className="text-xs text-gray-500 dark:text-gray-400">{s.examTypeName || "ΓÇö"}</p>
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
            <Card title={t("radiology.details.notes")} icon={<ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />}>
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{a.notes || "ΓÇö"}</p>
            </Card>
            <Card title={t("radiology.appointmentDetails.branch")} icon={<Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />}>
              <p className="text-sm text-gray-600 dark:text-gray-300">{a.branchId || "ΓÇö"}</p>
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

      {showConvertConfirm && data ? (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={t("radiology.appointmentDetails.convert") as string}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{t("radiology.appointmentDetails.convert")}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{t("radiology.appointmentDetails.convertConfirm", { name: data.appointment.patientName })}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConvertConfirm(false)} disabled={converting} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">{t("radiology.cancel")}</button>
              <button onClick={convert} disabled={converting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {converting && <Loader2 className="w-4 h-4 animate-spin" />}{t("radiology.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
