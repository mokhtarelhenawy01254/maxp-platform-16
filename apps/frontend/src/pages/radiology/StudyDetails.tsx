import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowRight, Banknote, Calendar, ChevronDown, CreditCard, Eye,
  FileText, Flag, History, Image as ImageIcon, Loader2, MessageSquare, Pencil,
  Printer, RefreshCw, Save, Shield, Sparkles, Stethoscope, Undo2, User, X as XMarkIcon,
} from "lucide-react";
import {
  api, fetchJson, getAuthHeaders,
  RadiologyStudy, RadiologyStudyImage, RadiologyReport,
  RadiologyOrderStatusMap, RadiologyStatusMap, RadiologyPaymentStatusMap, RadiologyReportStatusMap,
  RADIOLOGY_CRITICAL_META, criticalCategoryText,
  parsePatientFlags, flagMeta, MODAL_CONTENT_CLS, MODAL_INPUT_CLS,
  derivePrimaryStage,
} from "./shared";
import StageBadge from "./StageBadge";
import RadiologyViewerModal from "./RadiologyViewerModal";

const MANAGER_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER", "MANAGER"];

const canManageRadiology = (): boolean => {
  try {
    return MANAGER_ROLES.includes((JSON.parse(localStorage.getItem("user") || "{}") as { role?: string }).role || "");
  } catch {
    return false;
  }
};

interface StudyDetailsAppointment {
  id: string;
  appointmentDate?: string;
  appointmentTime?: string;
  status?: string;
  notes?: string;
  insuranceCompanyId?: string;
  insuranceCompanyName?: string;
  referringPhysicianId?: string;
}

interface StudyDetailsPayment {
  id: string;
  amount: number;
  method?: string;
  note?: string;
  paidBy?: string;
  createdAt: string;
}

interface StudyDetailsShiftPayment {
  id?: string;
  shiftId?: string;
  amount: number;
  method?: string;
  note?: string;
  createdAt: string;
}

interface StudyDetailsHistoryEntry {
  id: string;
  dimension: string;
  status: string;
  oldStatus?: string;
  changedBy?: string;
  userName?: string;
  reason?: string;
  createdAt: string;
}

interface StudyDetailsInsuranceInvoice {
  id: string;
  invoiceNumber?: string;
  insuranceCompanyName?: string;
  total: number;
  paidAmount: number;
  remaining: number;
  paymentStatus?: string;
}

interface StudyDetailsTotals {
  total: number;
  paidAmount: number;
  remaining: number;
  paymentStatus?: string;
  billingType?: string;
}

interface StudyDetailsData {
  study: RadiologyStudy;
  appointment?: StudyDetailsAppointment | null;
  images: RadiologyStudyImage[];
  report?: RadiologyReport | null;
  payments: StudyDetailsPayment[];
  shiftPayments: StudyDetailsShiftPayment[];
  statusHistory: StudyDetailsHistoryEntry[];
  insuranceInvoice?: StudyDetailsInsuranceInvoice | null;
  totals: StudyDetailsTotals;
}

const HISTORY_DIMENSION_META: Record<string, { label: string; color: string }> = {
  ORDER: { label: "radiology.historyDimension.ORDER", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  PREP: { label: "radiology.historyDimension.PREP", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  REPORT: { label: "radiology.historyDimension.REPORT", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
  PAYMENT: { label: "radiology.historyDimension.PAYMENT", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
};

const PAY_METHODS = ["CASH", "CARD", "BANK", "VODAFONE_CASH"] as const;

const Card = ({ title, icon, action, children }: { title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b dark:border-gray-700">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        {icon ? <span className="text-blue-600 dark:text-blue-400">{icon}</span> : null}
        {title}
      </h3>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-start justify-between gap-3 py-2 border-b dark:border-gray-700/50 last:border-0 text-sm">
    <span className="text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
    <span className="font-medium text-gray-900 dark:text-gray-100 text-left">{children}</span>
  </div>
);

export default function StudyDetails({ studyId }: { studyId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canManage = canManageRadiology();
  const [data, setData] = useState<StudyDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [payModal, setPayModal] = useState<"PAY" | "REFUND" | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payNote, setPayNote] = useState("");
  const [savingPay, setSavingPay] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [editingReport, setEditingReport] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [savingReport, setSavingReport] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiDraftInfo, setAiDraftInfo] = useState<string | null>(null);
  const [criticalOpen, setCriticalOpen] = useState(false);
  const [criticalCategory, setCriticalCategory] = useState("NONE");
  const [criticalFindingText, setCriticalFindingText] = useState("");
  const [savingCritical, setSavingCritical] = useState(false);
  const [siblings, setSiblings] = useState<RadiologyStudy[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchJson<StudyDetailsData>(api(`studies/${studyId}/details`));
      setData(d);
      if (d.study.appointmentId) {
        try {
          const list = await fetchJson<{ items?: RadiologyStudy[] }>(api(`studies?appointmentId=${encodeURIComponent(d.study.appointmentId)}&limit=50`));
          setSiblings((list.items || []).filter(s => s.id !== studyId));
        } catch {
          setSiblings([]);
        }
      } else {
        setSiblings([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("radiology.operationFailed"));
    } finally {
      setLoading(false);
    }
  }, [studyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const study = data?.study;
  const appointment = data?.appointment || null;
  const images = data?.images || [];
  const report = data?.report || null;
  const payments = data?.payments || [];
  const shiftPayments = data?.shiftPayments || [];
  const insuranceInvoice = data?.insuranceInvoice || null;
  const totals = data?.totals || { total: 0, paidAmount: 0, remaining: 0 };

  const criticalCat = criticalCategoryText(report);
  const criticalMeta = criticalCat ? RADIOLOGY_CRITICAL_META[criticalCat] ?? null : null;

  useEffect(() => {
    setCriticalCategory(report?.criticalCategory || "NONE");
    setCriticalFindingText(report?.criticalFindingText || "");
  }, [report?.criticalCategory, report?.criticalFindingText]);

  const history = useMemo(
    () => [...(data?.statusHistory || [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [data?.statusHistory],
  );

  const flags = useMemo(() => parsePatientFlags(study?.patientFlags), [study?.patientFlags]);

  const fmtDate = (iso?: string): string => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("ar-EG", { year: "numeric", month: "long", day: "numeric" }).format(d);
  };

  const fmtDateTime = (iso?: string): string => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
  };

  const fmtMoney = (n?: number): string => `${Number(n || 0).toFixed(0)} ${t("radiology.currency")}`;

  const signed = (n: number): string => `${n >= 0 ? "+" : "-"}${Math.abs(Number(n)).toFixed(0)}`;

  const renderBadge = (map: Record<string, { label: string; color: string }>, value?: string) => {
    const meta = value ? map[value] : undefined;
    if (meta) return <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${meta.color}`}>{t(meta.label)}</span>;
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{value || "—"}</span>;
  };

  const statusMetaFor = (dimension: string, status?: string): { label: string; color: string } | undefined => {
    if (!status) return undefined;
    if (dimension === "ORDER") return RadiologyOrderStatusMap[status];
    if (dimension === "REPORT") return RadiologyReportStatusMap[status];
    if (dimension === "PAYMENT") return RadiologyPaymentStatusMap[status];
    return RadiologyStatusMap[status];
  };

  const statusText = (dimension: string, status?: string): string => {
    if (!status) return "—";
    const meta = statusMetaFor(dimension, status);
    return meta ? t(meta.label) : status;
  };

  const transitionText = (h: StudyDetailsHistoryEntry): string =>
    h.oldStatus
      ? `${t("radiology.schedule.from")} ${statusText(h.dimension, h.oldStatus)} ${t("radiology.schedule.to")} ${statusText(h.dimension, h.status)}`
      : `${t("radiology.schedule.to")} ${statusText(h.dimension, h.status)}`;

  const genderText = (g?: string): string => {
    if (g === "male") return t("radiology.gender.male");
    if (g === "female") return t("radiology.gender.female");
    return t("radiology.gender.unspecified");
  };

  const methodText = (method?: string): string => {
    if (!method) return "—";
    const key = `radiology.paymentMethod.${method}`;
    const translated = t(key);
    return translated !== key ? translated : method;
  };

  const billingTypeText = (b?: string): string => {
    if (b === "INSURANCE") return t("radiology.details.billingType.INSURANCE");
    if (b === "PATIENT") return t("radiology.details.billingType.PATIENT");
    return b || "—";
  };

  const recordPayment = async () => {
    if (savingPay) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t("radiology.studies.invalidAmount"));
      return;
    }
    setSavingPay(true);
    try {
      await fetchJson(api(`studies/${studyId}/payment`), {
        method: "POST",
        body: JSON.stringify({ amount, method: payMethod, note: payNote.trim() || undefined }),
      });
      toast.success(t("radiology.studies.paymentRecorded", { amount }));
      setPayModal(null);
      setPayAmount("");
      setPayNote("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.studies.paymentFailed"));
    } finally {
      setSavingPay(false);
    }
  };

  const recordRefund = async () => {
    if (savingPay) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t("radiology.studies.invalidAmount"));
      return;
    }
    setSavingPay(true);
    try {
      await fetchJson(api(`studies/${studyId}/payment/refund`), {
        method: "POST",
        body: JSON.stringify({ amount, note: payNote.trim() || undefined }),
      });
      toast.success(t("radiology.studies.refundRecorded", { amount }));
      setPayModal(null);
      setPayAmount("");
      setPayNote("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.studies.refundFailed"));
    } finally {
      setSavingPay(false);
    }
  };

  const printPdf = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      const res = await fetch(api(`studies/${studyId}/report/pdf`), { headers: getAuthHeaders() });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || t("radiology.reports.pdfFailed"));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.reports.pdfFailed"));
    } finally {
      setPrinting(false);
    }
  };

  const startEditReport = () => {
    setDraftText(report?.reportText || "");
    setAiDraftInfo(null);
    setEditingReport(true);
  };

  const cancelEditReport = () => {
    setEditingReport(false);
    setDraftText("");
    setAiDraftInfo(null);
  };

  const saveReport = async () => {
    if (savingReport) return;
    setSavingReport(true);
    try {
      await fetchJson(api(`studies/${studyId}/report`), {
        method: "PUT",
        body: JSON.stringify({ reportText: draftText.trim() }),
      });
      toast.success(t("radiology.reports.reportSaved"));
      setEditingReport(false);
      setDraftText("");
      setAiDraftInfo(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.reports.reportSaveFailed"));
    } finally {
      setSavingReport(false);
    }
  };

  const generateDraft = async () => {
    if (aiDrafting) return;
    setAiDrafting(true);
    setAiDraftInfo(null);
    try {
      const res = await fetchJson<{ draft: string | null; reason?: string; model?: string }>(api(`studies/${studyId}/report/draft`), {
        method: "POST",
        body: JSON.stringify({ focus: "full" }),
      });
      if (res.draft) {
        setDraftText(res.draft);
        setAiDraftInfo(res.model ? `${t("radiology.aiDraft.disclaimer")} — ${t("radiology.aiDraft.model")}: ${res.model}` : t("radiology.aiDraft.disclaimer"));
        toast.info(t("radiology.aiDraft.filled"));
      } else if (res.reason === "AI_NOT_CONFIGURED") {
        toast.warning(t("radiology.aiDraft.notConfigured"));
      } else {
        toast.error(t("radiology.aiDraft.failed"));
      }
    } catch (e) {
      toast.error(t("radiology.aiDraft.failed"));
    } finally {
      setAiDrafting(false);
    }
  };

  const saveCriticalFlag = async () => {
    if (savingCritical) return;
    setSavingCritical(true);
    try {
      await fetchJson(api(`studies/${studyId}/report/critical`), {
        method: "PUT",
        body: JSON.stringify({ category: criticalCategory, findingText: criticalFindingText.trim() || undefined }),
      });
      await load();
      if (criticalCategory === "NONE") {
        toast.success(t("radiology.critical.clearSuccess"));
      }
    } catch (e) {
      toast.error(t("radiology.critical.saveFailed"));
    } finally {
      setSavingCritical(false);
    }
  };

  const acknowledgeCritical = async () => {
    if (savingCritical) return;
    if (!window.confirm(t("radiology.critical.confirmAcknowledge") as string)) return;
    setSavingCritical(true);
    try {
      await fetchJson(api(`studies/${studyId}/report/critical/acknowledge`), {
        method: "POST",
      });
      toast.success(t("radiology.critical.acknowledgeSuccess"));
      await load();
    } catch (e) {
      toast.error(t("radiology.critical.saveFailed"));
    } finally {
      setSavingCritical(false);
    }
  };

  const turnaroundText = (): string => {
    if (!report || !report.createdAt) return "—";
    const from = new Date(report.createdAt);
    if (Number.isNaN(from.getTime())) return "—";
    const to = report.signedAt ? new Date(report.signedAt) : new Date(report.updatedAt);
    if (Number.isNaN(to.getTime())) return "—";
    const diffMin = Math.round((to.getTime() - from.getTime()) / 60000);
    if (diffMin < 0) return "—";
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return `${h}س ${m}د`;
  };

  if (loading) {
    return (
      <div dir="rtl" className="max-w-7xl mx-auto p-4 md:p-6 w-full min-h-screen">
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
      </div>
    );
  }

  if (error || !study) {
    return (
      <div dir="rtl" className="max-w-7xl mx-auto p-4 md:p-6 w-full min-h-screen">
        <div className="text-center py-24 space-y-4">
          <p className="text-red-500">{error || t("radiology.operationFailed")}</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => void load()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <RefreshCw className="w-4 h-4" />{t("radiology.reports.retry")}
            </button>
            <button onClick={() => navigate("/radiology/studies")} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
              {t("radiology.details.back")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const modality = study.examType?.category || "";
  const billingType = data?.totals?.billingType;

  return (
    <div dir="rtl" className="max-w-7xl mx-auto p-4 md:p-6 w-full min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/radiology/studies")} className="flex items-center gap-2 px-3 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <ArrowRight className="w-4 h-4" />{t("radiology.details.back")}
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              {t("radiology.details.title")}
              <span className="text-blue-600 dark:text-blue-400" dir="ltr">{study.studyNumber || study.id.slice(0, 8)}</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{fmtDate(study.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">{t("radiology.stageLabel")}</span>
            <StageBadge stage={derivePrimaryStage(study)} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">{t("radiology.details.orderStatus")}</span>
            {renderBadge(RadiologyOrderStatusMap, study.orderStatus)}
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">{t("radiology.details.preparationStatus")}</span>
            {renderBadge(RadiologyStatusMap, study.status)}
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">{t("radiology.details.paymentStatus")}</span>
            {renderBadge(RadiologyPaymentStatusMap, totals.paymentStatus || study.paymentStatus)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card
            title={t("radiology.details.patient")}
            icon={<User className="w-5 h-5" />}
            action={
              <div className="flex items-center gap-1.5 flex-wrap">
                {study.emergency ? <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">{t("radiology.studies.emergency")}</span> : null}
                {study.withContrast ? <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">{t("radiology.reception.withContrast")}</span> : null}
              </div>
            }
          >
            <Row label={t("radiology.patients.name")}>{study.patientName || "—"}</Row>
            <Row label={t("radiology.schedule.phone")}><span dir="ltr">{study.patientPhone || "—"}</span></Row>
            <Row label={t("radiology.schedule.gender")}>{genderText(study.patientGender)}</Row>
            <Row label={t("radiology.schedule.age")}>{study.patientAge ? <span dir="ltr">{study.patientAge}</span> : "—"}</Row>
            {study.nationalId ? <Row label={t("radiology.studies.nationalId")}><span dir="ltr">{study.nationalId}</span></Row> : null}
            {study.insuranceNumber ? <Row label={t("radiology.studies.insuranceNumber")}><span dir="ltr">{study.insuranceNumber}</span></Row> : null}
            {flags.length > 0 ? (
              <div className="flex items-start justify-between gap-3 py-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400 shrink-0">{t("radiology.schedule.medicalRiskFlags")}</span>
                <span className="flex flex-wrap gap-1 justify-end">
                  {flags.map(f => {
                    const meta = flagMeta(f);
                    return meta ? <span key={f} className={`px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap ${meta.color}`}>{t(meta.label)}</span> : null;
                  })}
                </span>
              </div>
            ) : null}
          </Card>

          <Card title={t("radiology.details.exam")} icon={<Stethoscope className="w-5 h-5" />}>
            <Row label={t("radiology.studies.examType")}>{study.examTypeName || study.examType?.name || "—"}</Row>
            {modality ? <Row label={t("radiology.settings.modalities")}>{modality}</Row> : null}
            {study.deviceName ? <Row label={t("radiology.schedule.device")}>{study.deviceName}</Row> : null}
            {study.additionAmount ? <Row label={t("radiology.reception.examAdditions")}>{fmtMoney(study.additionAmount)}</Row> : null}
            {study.referralDoctor ? <Row label={t("radiology.reception.referringDoctor")}>{study.referralDoctor}</Row> : null}
            {appointment?.insuranceCompanyName || billingType ? (
              <Row label={t("radiology.schedule.insuranceOptional")}>
                <span className="flex items-center gap-2 flex-wrap justify-end">
                  {appointment?.insuranceCompanyName || ""}
                  {billingType ? (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap ${billingType === "INSURANCE" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}>
                      {billingTypeText(billingType)}
                    </span>
                  ) : null}
                </span>
              </Row>
            ) : null}
          </Card>

          {appointment ? (
            <Card title={t("radiology.details.appointment")} icon={<Calendar className="w-5 h-5" />}>
              <Row label={t("radiology.schedule.date")}>{fmtDate(appointment.appointmentDate)}</Row>
              <Row label={t("radiology.schedule.time")}><span dir="ltr">{appointment.appointmentTime || "—"}</span></Row>
              <Row label={t("radiology.schedule.referringDoctor")}>{appointment.referringPhysicianId || study.referralDoctor || "—"}</Row>
            </Card>
          ) : null}

          {study.appointmentId ? (
            <Card title={t("radiology.order.siblingStudies")} icon={<FileText className="w-5 h-5" />}>
              {siblings === null ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
              ) : siblings.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">{t("radiology.order.noSiblings")}</p>
              ) : (
                <div className="space-y-2">
                  {siblings.map(sib => (
                    <button
                      key={sib.id}
                      onClick={() => navigate(`/radiology/study/${sib.id}`)}
                      className="w-full flex items-center justify-between gap-3 text-sm border dark:border-gray-700 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-right"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-blue-600 dark:text-blue-400 truncate" dir="ltr">{sib.studyNumber || sib.id.slice(0, 8)}</span>
                        <span className="text-gray-500 dark:text-gray-400 truncate">{sib.examTypeName || sib.examType?.name || "—"}</span>
                      </span>
                      {renderBadge(RadiologyStatusMap, sib.status)}
                    </button>
                  ))}
                </div>
              )}
            </Card>
          ) : null}

          <Card title={t("radiology.details.timelineTitle")} icon={<History className="w-5 h-5" />}>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">{t("radiology.details.timelineEmpty")}</p>
            ) : (
              <div>
                {history.map((h, idx) => {
                  const dimMeta = HISTORY_DIMENSION_META[h.dimension];
                  const isLast = idx === history.length - 1;
                  return (
                    <div key={h.id} className="relative flex gap-3 pb-5 last:pb-0">
                      {!isLast ? <span className="absolute right-2 top-4 bottom-0 w-px bg-gray-200 dark:bg-gray-700" /> : null}
                      <span className={`w-4 h-4 rounded-full shrink-0 ring-4 ring-white dark:ring-gray-800 mt-0.5 ${dimMeta?.color || "bg-gray-300"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap ${dimMeta?.color || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}>
                            {dimMeta ? t(dimMeta.label) : h.dimension}
                          </span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{transitionText(h)}</span>
                        </div>
                        {h.reason ? <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{h.reason}</p> : null}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {h.userName || h.changedBy ? `${h.userName || h.changedBy} — ` : ""}{fmtDateTime(h.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card
            title={t("radiology.details.report")}
            icon={<FileText className="w-5 h-5" />}
            action={
              <div className="flex items-center gap-2 flex-wrap">
                {report ? (
                  <button onClick={() => void printPdf()} disabled={printing} className="flex items-center gap-1.5 px-3 py-1.5 border dark:border-gray-600 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                    {printing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}{t("radiology.reports.printPdf")}
                  </button>
                ) : null}
                {editingReport ? (
                  <>
                    <button onClick={() => void saveReport()} disabled={savingReport} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50">
                      {savingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}{t("radiology.save")}
                    </button>
                    <button onClick={cancelEditReport} disabled={savingReport} className="px-3 py-1.5 border dark:border-gray-600 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                      {t("radiology.cancel")}
                    </button>
                  </>
                ) : (
                  <button onClick={startEditReport} className="flex items-center gap-1.5 px-3 py-1.5 border dark:border-gray-600 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-700">
                    <Pencil className="w-3.5 h-3.5" />{report ? t("radiology.details.editReport") : t("radiology.details.draftReport")}
                  </button>
                )}
              </div>
            }
          >
            {criticalCat && criticalMeta ? (
              <div className={`mb-4 rounded-lg px-4 py-3 ${criticalMeta.color}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-bold">{t(criticalMeta.label)}</span>
                </div>
                {report?.criticalFindingText ? <p className="text-sm mt-1.5 whitespace-pre-wrap">{report.criticalFindingText}</p> : null}
                <div className="text-xs mt-2 space-y-0.5 opacity-80">
                  {report?.criticalFlaggedBy ? (
                    <p>{t("radiology.critical.flaggedBy")}: {report.criticalFlaggedBy} — {fmtDateTime(report.criticalFlaggedAt)}</p>
                  ) : null}
                  {report?.criticalAcknowledgedBy ? (
                    <p>{t("radiology.critical.acknowledgedBy")}: {report.criticalAcknowledgedBy} — {fmtDateTime(report.criticalAcknowledgedAt)}</p>
                  ) : (
                    <p>{t("radiology.critical.notAcknowledged")}</p>
                  )}
                </div>
              </div>
            ) : null}
            {report?.reportStatus ? <div className="mb-3">{renderBadge(RadiologyReportStatusMap, report.reportStatus)}</div> : null}
            {editingReport ? (
              <div className="space-y-3">
                <button onClick={() => void generateDraft()} disabled={aiDrafting} className="flex items-center gap-1.5 px-3 py-1.5 border border-purple-300 dark:border-purple-800 text-purple-600 dark:text-purple-400 rounded-lg text-xs hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50">
                  {aiDrafting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {t(draftText.trim() ? "radiology.aiDraft.regenerate" : "radiology.aiDraft.generate")}
                </button>
                <textarea
                  className={`${MODAL_INPUT_CLS} min-h-[160px]`}
                  autoFocus
                  value={draftText}
                  onChange={e => setDraftText(e.target.value)}
                  placeholder={t("radiology.reports.reportTextPlaceholder") as string}
                />
                {aiDraftInfo ? <p className="text-xs text-amber-600 dark:text-amber-400">{aiDraftInfo}</p> : null}
              </div>
            ) : (
              <>
                <p className="text-sm leading-6 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{report?.reportText || t("radiology.details.emptyReport")}</p>
                {report?.typedBy || report?.reviewedBy || report?.signedBy ? (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {report.typedBy ? <div><span className="text-gray-500 dark:text-gray-400">{t("radiology.reports.typedBy")}: </span><span className="font-medium text-gray-800 dark:text-gray-200">{report.typedBy}</span></div> : null}
                    {report.reviewedBy ? <div><span className="text-gray-500 dark:text-gray-400">{t("radiology.reports.reviewedBy")}: </span><span className="font-medium text-gray-800 dark:text-gray-200">{report.reviewedBy}</span></div> : null}
                    {report.signedBy ? <div><span className="text-gray-500 dark:text-gray-400">{t("radiology.reports.signedBy")}: </span><span className="font-medium text-gray-800 dark:text-gray-200">{report.signedBy}</span></div> : null}
                  </div>
                ) : null}
              </>
            )}
            {report ? (
              <div className="mt-4 pt-3 border-t dark:border-gray-700/50 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-400">
                <div>{t("radiology.details.reportCreatedAt")}: <span className="font-medium text-gray-700 dark:text-gray-300">{fmtDateTime(report.createdAt)}</span></div>
                <div>{t("radiology.details.reportSignedAt")}: <span className="font-medium text-gray-700 dark:text-gray-300">{fmtDateTime(report.signedAt)}</span></div>
                <div>{t("radiology.details.turnaround")}: <span className="font-medium text-gray-700 dark:text-gray-300">{turnaroundText()}</span></div>
              </div>
            ) : null}
            <div className="mt-4 border dark:border-gray-700 rounded-lg">
              <button
                type="button"
                onClick={() => setCriticalOpen(o => !o)}
                className="w-full px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />{t("radiology.critical.title")}
                <ChevronDown className={`w-3.5 h-3.5 ms-auto transition-transform ${criticalOpen ? "rotate-180" : ""}`} />
              </button>
              {criticalOpen ? (
                <div className="px-3 pb-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.critical.label")}</label>
                    <select className={MODAL_INPUT_CLS} value={criticalCategory} onChange={e => setCriticalCategory(e.target.value)}>
                      {Object.entries(RADIOLOGY_CRITICAL_META).map(([k, meta]) => (
                        <option key={k} value={k}>{t(meta.label)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.critical.findingText")}</label>
                    <input
                      className={MODAL_INPUT_CLS}
                      value={criticalFindingText}
                      onChange={e => setCriticalFindingText(e.target.value)}
                      placeholder={t("radiology.critical.findingPlaceholder") as string}
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => void saveCriticalFlag()} disabled={savingCritical} className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 disabled:opacity-50">
                      {savingCritical ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}{t(criticalCategory === "NONE" ? "radiology.critical.clear" : "radiology.critical.flag")}
                    </button>
                    {criticalCat && !report?.criticalAcknowledgedBy && canManage ? (
                      <button onClick={() => void acknowledgeCritical()} disabled={savingCritical} className="px-3 py-2 border dark:border-gray-600 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                        {t("radiology.critical.acknowledge")}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </Card>

          <Card
            title={`${t("radiology.details.images")} (${images.length})`}
            icon={<ImageIcon className="w-5 h-5" />}
            action={
              images.length > 0 ? (
                <button onClick={() => setViewerOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs">
                  <Eye className="w-3.5 h-3.5" />{t("radiology.reports.viewImages")}
                </button>
              ) : undefined
            }
          >
            {images.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">{t("radiology.details.noImages")}</p>
            ) : (
              <div className="space-y-2">
                {images.map(img => (
                  <div key={img.id} className="flex items-center justify-between gap-3 text-sm border dark:border-gray-700 rounded-lg px-3 py-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{img.fileName}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                      {img.seriesDescription ? `${img.seriesDescription} ` : ""}
                      {img.fileSize ? `— ${(Number(img.fileSize) / 1024).toFixed(0)} KB` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {insuranceInvoice ? (
            <Card
              title={t("radiology.details.insurance")}
              icon={<Shield className="w-5 h-5" />}
              action={renderBadge(RadiologyPaymentStatusMap, insuranceInvoice.paymentStatus)}
            >
              <Row label={t("radiology.insuranceInvoices.invoiceNumber")}><span dir="ltr">{insuranceInvoice.invoiceNumber || insuranceInvoice.id}</span></Row>
              <Row label={t("radiology.insuranceInvoices.entity")}>{insuranceInvoice.insuranceCompanyName || "—"}</Row>
              <Row label={t("radiology.details.total")}>{fmtMoney(insuranceInvoice.total)}</Row>
              <Row label={t("radiology.details.paid")}>{fmtMoney(insuranceInvoice.paidAmount)}</Row>
              <Row label={t("radiology.details.remaining")}>{fmtMoney(insuranceInvoice.remaining)}</Row>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6 lg:col-span-1">
          <Card
            title={t("radiology.details.payment")}
            icon={<CreditCard className="w-5 h-5" />}
            action={renderBadge(RadiologyPaymentStatusMap, totals.paymentStatus || study.paymentStatus)}
          >
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2.5 text-center">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{t("radiology.details.total")}</p>
                <p className="text-base font-bold text-gray-900 dark:text-gray-100">{fmtMoney(totals.total)}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2.5 text-center">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{t("radiology.details.paid")}</p>
                <p className="text-base font-bold text-green-600 dark:text-green-400">{fmtMoney(totals.paidAmount)}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-2.5 text-center">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{t("radiology.details.remaining")}</p>
                <p className="text-base font-bold text-red-600 dark:text-red-400">{fmtMoney(totals.remaining)}</p>
              </div>
            </div>
            {billingType ? (
              <div className="mb-4">
                <span className={`px-2 py-0.5 rounded-full text-xs ${billingType === "INSURANCE" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}>
                  {billingTypeText(billingType)}
                </span>
              </div>
            ) : null}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setPayModal("PAY")} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                <Banknote className="w-4 h-4" />{t("radiology.details.recordPayment")}
              </button>
              <button onClick={() => setPayModal("REFUND")} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm">
                <Undo2 className="w-4 h-4" />{t("radiology.details.refund")}
              </button>
            </div>
            {payments.length === 0 && shiftPayments.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-2">{t("radiology.details.noPayments")}</p>
            ) : (
              <>
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-2 py-2 border-b dark:border-gray-700/50 last:border-0 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{methodText(p.method)}{p.paidBy ? ` — ${p.paidBy}` : ""}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.note ? `${p.note} — ` : ""}{fmtDateTime(p.createdAt)}</p>
                    </div>
                    <span className="font-bold text-green-600 dark:text-green-400 shrink-0">{signed(p.amount)}</span>
                  </div>
                ))}
                {shiftPayments.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t("radiology.cashierShifts.title")}</p>
                    {shiftPayments.map((sp, i) => (
                      <div key={sp.id || `${sp.shiftId || "shift"}-${i}`} className="flex items-center justify-between gap-2 py-1.5 border-b dark:border-gray-700/50 last:border-0 text-sm">
                        <span className="text-gray-600 dark:text-gray-300 truncate">{methodText(sp.method)}{sp.note ? ` — ${sp.note}` : ""}</span>
                        <span className="font-bold text-green-600 dark:text-green-400 shrink-0">{signed(sp.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </Card>

          <Card title={t("radiology.details.notes")} icon={<MessageSquare className="w-5 h-5" />}>
            {!study.notes && !appointment?.notes ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">{t("radiology.notAvailable")}</p>
            ) : (
              <div className="space-y-3 text-sm">
                {study.notes ? <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{study.notes}</p> : null}
                {appointment?.notes ? (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t("radiology.details.appointment")}</p>
                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{appointment.notes}</p>
                  </div>
                ) : null}
              </div>
            )}
          </Card>
        </div>
      </div>

      {payModal ? (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !savingPay && setPayModal(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{payModal === "PAY" ? t("radiology.details.recordPayment") : t("radiology.details.refund")}</h3>
              <button onClick={() => setPayModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.insuranceInvoices.amountRequired")}</label>
                <input type="number" min={0} className={MODAL_INPUT_CLS} dir="ltr" placeholder={t("radiology.studies.amountPlaceholder") as string} value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              </div>
              {payModal === "PAY" ? (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.insuranceInvoices.paymentMethod")}</label>
                  <select className={MODAL_INPUT_CLS} value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                    {PAY_METHODS.map(m => <option key={m} value={m}>{t(`radiology.paymentMethod.${m}`)}</option>)}
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              ) : null}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.insuranceInvoices.note")}</label>
                <input className={MODAL_INPUT_CLS} value={payNote} onChange={e => setPayNote(e.target.value)} placeholder={t("radiology.insuranceInvoices.notesOptionalPlaceholder") as string} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setPayModal(null)} disabled={savingPay} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg disabled:opacity-50">{t("radiology.cancel")}</button>
              <button onClick={payModal === "PAY" ? () => void recordPayment() : () => void recordRefund()} disabled={savingPay} className={`px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 ${payModal === "PAY" ? "bg-green-600" : "bg-red-600"}`}>
                {savingPay ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {payModal === "PAY" ? t("radiology.details.recordPayment") : t("radiology.details.refund")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {viewerOpen ? <RadiologyViewerModal studyId={studyId} onClose={() => setViewerOpen(false)} /> : null}
    </div>
  );
}
