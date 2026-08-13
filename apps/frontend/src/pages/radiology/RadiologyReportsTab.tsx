import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertTriangle, CalendarCheck, CheckCircle2, ChevronDown, ChevronUp, Clock, Eye, FileCheck, FileText,
  FolderOpen, Loader2, Pencil, Printer, RefreshCw, Search, ShieldAlert, Sparkles,
  X as XMarkIcon,
} from "lucide-react";
import tokenManager from "../../utils/tokenManager";
import {
  api, fetchJson, getCompanyId,
  RadiologyReport, RadiologyReportStatusMap, RadiologyReportTemplate, RadiologyStudy,
  RADIOLOGY_CRITICAL_META, criticalCategoryText, parsePatientFlags, flagMeta,
  MODAL_CONTENT_CLS, MODAL_INPUT_CLS,
} from "./shared";
import RadiologyViewerModal from "./RadiologyViewerModal";

type ActionKind = "review" | "sign" | "deliver";

const MANAGER_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER", "MANAGER"];

const canManageRadiology = (): boolean => {
  try {
    return MANAGER_ROLES.includes((JSON.parse(localStorage.getItem("user") || "{}") as { role?: string }).role || "");
  } catch {
    return false;
  }
};

const ACTION_META: Record<ActionKind, { labelKey: string; messageKey: string; toastKey: string; cls: string }> = {
  review: {
    labelKey: "radiology.reports.review",
    messageKey: "radiology.reports.reviewConfirm",
    toastKey: "radiology.reports.reviewedToast",
    cls: "border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-300 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50",
  },
  sign: {
    labelKey: "radiology.reports.sign",
    messageKey: "radiology.reports.signConfirm",
    toastKey: "radiology.reports.signedToast",
    cls: "border-green-300 text-green-700 bg-green-50 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:bg-green-900/30 dark:hover:bg-green-900/50",
  },
  deliver: {
    labelKey: "radiology.reports.deliver",
    messageKey: "radiology.reports.deliverConfirm",
    toastKey: "radiology.reports.deliveredToast",
    cls: "border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100 dark:border-teal-700 dark:text-teal-300 dark:bg-teal-900/30 dark:hover:bg-teal-900/50",
  },
};

const nextActionFor = (status: string): ActionKind | null => {
  switch (status) {
    case "DRAFT":
      return "review";
    case "REVIEWED":
      return "sign";
    case "SIGNED":
      return "deliver";
    default:
      return null;
  }
};

const CLINICAL_PHRASES = [
  "الحالة ذات جودة فنية مناسبة.",
  "لا يوجد دليل على كسور حادة.",
  "المناطق الظليلة ضمن الحدود الطبيعية.",
];

const IMPRESSION_PHRASES = [
  "تقرير ضمن الحدود الطبيعية.",
  "ينصح بمتابعة سريرية.",
  "ينصح بفحص إشعاعي إضافي للتوضيح.",
];

interface ReportRow extends RadiologyStudy {
  report?: RadiologyReport;
}

interface ReportStudy extends RadiologyStudy {
  billingType?: string;
}

interface Counters {
  total: number;
  awaitingReview: number;
  awaitingSign: number;
  deliveredToday: number;
  critical: number;
}

type CounterKey = keyof Counters;

const KPI_CARDS: Array<{ key: CounterKey; labelKey: string; icon: typeof FileText; iconCls: string }> = [
  { key: "total", labelKey: "radiology.reports.total", icon: FileText, iconCls: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" },
  { key: "awaitingReview", labelKey: "radiology.reports.awaitingReview", icon: Clock, iconCls: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" },
  { key: "awaitingSign", labelKey: "radiology.reports.awaitingSign", icon: FileCheck, iconCls: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400" },
  { key: "deliveredToday", labelKey: "radiology.reports.deliveredToday", icon: CalendarCheck, iconCls: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400" },
  { key: "critical", labelKey: "radiology.reports.critical", icon: ShieldAlert, iconCls: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400" },
];

export function RadiologyReportModal({ studyId, onClose, onSaved }: { studyId: string; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<RadiologyReport | null>(null);
  const [study, setStudy] = useState<ReportStudy | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [templates, setTemplates] = useState<RadiologyReportTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [viewerStudyId, setViewerStudyId] = useState<string | null>(null);
  const [critCategory, setCritCategory] = useState("NONE");
  const [critFindingText, setCritFindingText] = useState("");
  const [savingCritical, setSavingCritical] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [aiFocus, setAiFocus] = useState("full");
  const [generating, setGenerating] = useState(false);
  const [aiMeta, setAiMeta] = useState<{ model?: string; provider?: string } | null>(null);
  const [showPhrases, setShowPhrases] = useState(false);

  const canManage = canManageRadiology();
  const nextStep = report ? nextActionFor(report.reportStatus) : null;
  const criticalCat = report ? criticalCategoryText(report) : null;
  const criticalMeta = criticalCat ? RADIOLOGY_CRITICAL_META[criticalCat] : undefined;

  const fmtDateTime = (iso?: string): string => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [r, tpls, detail] = await Promise.all([
          fetchJson<RadiologyReport>(api(`studies/${studyId}/report`)),
          fetchJson<RadiologyReportTemplate[]>(api("report-templates")),
          fetchJson<{ study?: ReportStudy }>(api(`studies/${studyId}/details`)).catch(() => null),
        ]);
        setReport(r);
        setText(r?.reportText || "");
        setStudy(detail?.study || null);
        setCritCategory(r?.criticalCategory || "NONE");
        setCritFindingText(r?.criticalFindingText || "");
        setTemplates(tpls || []);
        if ((!r || !(r.reportText || "").trim()) && tpls && tpls.length > 0) {
          const first = tpls[0]!;
          setTemplateId(first.id);
          setText(first.body);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("radiology.reports.reportLoadFailed"));
        onClose();
      } finally {
        setLoading(false);
      }
    })();
  }, [studyId]);

  const applyTemplate = (id: string) => {
    const tpl = templates.find(x => x.id === id);
    setTemplateId(id);
    if (tpl) setText(tpl.body);
  };

  const appendText = (suffix: string) => {
    setText(prev => (prev ? `${prev}\n${suffix}` : suffix));
  };

  const appendSection = (labelKey: string) => {
    const label = t(`radiology.reports.${labelKey}`);
    setText(prev => (prev ? `${prev}\n\n${label}:\n` : `${label}:\n`));
  };

  const generateDraft = async () => {
    if (generating) return;
    setGenerating(true);
    setAiMeta(null);
    try {
      const res = await fetchJson<{ draft: string | null; reason?: "AI_NOT_CONFIGURED" | "AI_ERROR"; model?: string; provider?: string }>(
        api(`studies/${studyId}/report/draft`),
        { method: "POST", body: JSON.stringify({ focus: aiFocus }) },
      );
      if (res.draft) {
        setText(res.draft);
        setAiMeta({ model: res.model, provider: res.provider });
        toast.info(t("radiology.aiDraft.filled"));
      } else if (res.reason === "AI_NOT_CONFIGURED") {
        toast.warning(t("radiology.aiDraft.notConfigured"));
      } else {
        toast.error(t("radiology.aiDraft.failed"));
      }
    } catch {
      toast.error(t("radiology.aiDraft.failed"));
    } finally {
      setGenerating(false);
    }
  };

  const critChanged = report
    ? (critCategory || "NONE") !== (report.criticalCategory || "NONE") || critFindingText.trim() !== (report.criticalFindingText || "").trim()
    : true;

  const saveCritical = async () => {
    if (savingCritical || !critChanged) return;
    setSavingCritical(true);
    try {
      const updated = await fetchJson<RadiologyReport>(api(`studies/${studyId}/report/critical`), {
        method: "PUT",
        body: JSON.stringify({ category: critCategory, findingText: critFindingText.trim() || undefined }),
      });
      setReport(updated);
      setCritCategory(updated.criticalCategory || "NONE");
      setCritFindingText(updated.criticalFindingText || "");
    } catch {
      toast.error(t("radiology.critical.saveFailed"));
    } finally {
      setSavingCritical(false);
    }
  };

  const acknowledgeCritical = async () => {
    if (acknowledging) return;
    setAcknowledging(true);
    try {
      const updated = await fetchJson<RadiologyReport>(api(`studies/${studyId}/report/critical/acknowledge`), { method: "POST" });
      setReport(updated);
      toast.success(t("radiology.critical.acknowledgeSuccess"));
    } catch {
      toast.error(t("radiology.critical.saveFailed"));
    } finally {
      setAcknowledging(false);
    }
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await fetchJson(api(`studies/${studyId}/report`), {
        method: "PUT",
        body: JSON.stringify({ reportText: text.trim() }),
      });
      toast.success(t("radiology.reports.reportSaved"));
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.reports.reportSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const saveAndAdvance = async (kind: ActionKind) => {
    if (saving) return;
    setSaving(true);
    try {
      await fetchJson(api(`studies/${studyId}/report`), {
        method: "PUT",
        body: JSON.stringify({ reportText: text.trim() }),
      });
      await fetchJson(api(`studies/${studyId}/report/${kind}`), { method: "PUT" });
      toast.success(t(ACTION_META[kind].toastKey));
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.reports.actionFailed"));
    } finally {
      setSaving(false);
    }
  };

  const printPdf = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      const headers = tokenManager.createAuthHeaders({});
      const cid = getCompanyId();
      if (cid) headers["X-Company-Id"] = cid;
      const res = await fetch(api(`studies/${studyId}/report/pdf`), { headers });
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

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("radiology.reports.enterReport") as string}
          className={`${MODAL_CONTENT_CLS} !max-w-2xl max-h-[90vh] overflow-y-auto`}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">{t("radiology.reports.enterReport")}</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <>
              {study ? (
                <div className="mb-4 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-sm">{study.patientName || "—"}</p>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono" dir="ltr">{study.studyNumber || study.id.slice(0, 8)}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{study.examTypeName || study.examType?.name || "—"}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {parsePatientFlags(study.patientFlags).map(f => {
                      const meta = flagMeta(f);
                      return meta ? <span key={f} className={`px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap ${meta.color}`}>{t(meta.label)}</span> : null;
                    })}
                    {study.emergency ? <span className="px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">{t("radiology.studies.emergency")}</span> : null}
                    {study.withContrast ? <span className="px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">{t("radiology.reception.withContrast")}</span> : null}
                    {study.billingType ? (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap ${study.billingType === "INSURANCE" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}>
                        {study.billingType === "INSURANCE" ? t("radiology.details.billingType.INSURANCE") : t("radiology.details.billingType.PATIENT")}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {report?.reportStatus ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t("radiology.reports.reportStatusLabel")} {t(RadiologyReportStatusMap[report.reportStatus]?.label ?? report.reportStatus)}</p>
              ) : null}
              {templates.length > 0 ? (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.reports.templates")}</label>
                  <select className={MODAL_INPUT_CLS} value={templateId} onChange={e => applyTemplate(e.target.value)}>
                    <option value="">{t("radiology.reports.noTemplate")}</option>
                    {templates.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                  {templateId ? (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{t("radiology.reports.templateLoaded")}</p>
                  ) : null}
                </div>
              ) : null}
              <textarea autoFocus className={`${MODAL_INPUT_CLS} min-h-[240px] resize-y`} value={text} onChange={e => setText(e.target.value)} placeholder={t("radiology.reports.reportTextPlaceholder") as string} />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {text.length} {t("radiology.reports.characterCount")} · {text.trim().split(/\s+/).filter(Boolean).length} {t("radiology.reports.wordCount")}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => appendSection("findingsLabel")} className="px-3 py-1.5 text-xs border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">{t("radiology.reports.findingsLabel")}</button>
                <button type="button" onClick={() => appendSection("impressionLabel")} className="px-3 py-1.5 text-xs border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">{t("radiology.reports.impressionLabel")}</button>
              </div>

              <div className="mt-2 border dark:border-gray-700 rounded-lg">
                <button type="button" onClick={() => setShowPhrases(v => !v)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
                  <span>{t("radiology.reports.quickPhrases")}</span>
                  {showPhrases ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showPhrases ? (
                  <div className="px-3 pb-3 space-y-2">
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">{t("radiology.reports.phrasesClinical")}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CLINICAL_PHRASES.map(p => (
                          <button key={p} type="button" onClick={() => appendText(p)} className="px-2.5 py-1 text-xs border dark:border-gray-600 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300">{p}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">{t("radiology.reports.phrasesImpression")}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {IMPRESSION_PHRASES.map(p => (
                          <button key={p} type="button" onClick={() => appendText(p)} className="px-2.5 py-1 text-xs border dark:border-gray-600 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300">{p}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{t("radiology.aiDraft.focus")}</span>
                  <select className="border dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs dark:bg-gray-800 dark:text-gray-100" value={aiFocus} onChange={e => setAiFocus(e.target.value)}>
                    <option value="full">{t("radiology.aiDraft.full")}</option>
                    <option value="findings">{t("radiology.aiDraft.findings")}</option>
                    <option value="impression">{t("radiology.aiDraft.impression")}</option>
                  </select>
                  <button type="button" onClick={() => void generateDraft()} disabled={generating} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50">
                    {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {generating ? t("radiology.aiDraft.generating") : text.trim() ? t("radiology.aiDraft.regenerate") : t("radiology.aiDraft.generate")}
                  </button>
                </div>
                {aiMeta ? (
                  <p className="mt-1.5 text-xs text-violet-600 dark:text-violet-400">
                    {t("radiology.aiDraft.disclaimer")}{aiMeta.model ? ` — ${t("radiology.aiDraft.model")}: ${aiMeta.model}` : ""}{aiMeta.provider ? ` (${aiMeta.provider})` : ""}
                  </p>
                ) : null}
              </div>

              <div className="mt-3 border dark:border-gray-700 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">{t("radiology.critical.title")}</p>
                <div className="space-y-2">
                  <select className={MODAL_INPUT_CLS} value={critCategory} onChange={e => setCritCategory(e.target.value)}>
                    <option value="NONE">{t("radiology.critical.none")}</option>
                    <option value="CAT1">{t("radiology.critical.CAT1")}</option>
                    <option value="CAT2">{t("radiology.critical.CAT2")}</option>
                    <option value="CAT3">{t("radiology.critical.CAT3")}</option>
                  </select>
                  <input className={MODAL_INPUT_CLS} value={critFindingText} onChange={e => setCritFindingText(e.target.value)} placeholder={t("radiology.critical.findingPlaceholder") as string} />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button type="button" onClick={() => void saveCritical()} disabled={savingCritical || !critChanged} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border font-medium border-red-300 text-red-700 bg-red-50 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:bg-red-900/30 dark:hover:bg-red-900/50 disabled:opacity-50">
                      {savingCritical ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                      {critCategory === "NONE" ? t("radiology.critical.clear") : t("radiology.critical.flag")}
                    </button>
                    {criticalMeta ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${criticalMeta.color}`}>{t(criticalMeta.label)}</span>
                    ) : null}
                  </div>
                  {criticalCat ? (
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 pt-1">
                      {report?.criticalFlaggedBy ? <p>{t("radiology.critical.flaggedBy")}: <b className="text-gray-700 dark:text-gray-200">{report.criticalFlaggedBy}</b>{report.criticalFlaggedAt ? ` — ${fmtDateTime(report.criticalFlaggedAt)}` : ""}</p> : null}
                      {report?.criticalAcknowledgedBy ? (
                        <p>{t("radiology.critical.acknowledgedBy")}: <b className="text-gray-700 dark:text-gray-200">{report.criticalAcknowledgedBy}</b>{report.criticalAcknowledgedAt ? ` — ${fmtDateTime(report.criticalAcknowledgedAt)}` : ""}</p>
                      ) : (
                        <p>{t("radiology.critical.notAcknowledged")}</p>
                      )}
                      {canManage && !report?.criticalAcknowledgedBy ? (
                        <button type="button" onClick={() => void acknowledgeCritical()} disabled={acknowledging} className="mt-1 flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border font-medium border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 disabled:opacity-50">
                          {acknowledging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          {t("radiology.critical.acknowledge")}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setViewerStudyId(studyId)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />{t("radiology.reports.viewImages")}
                </button>
                <button onClick={printPdf} disabled={printing} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                  {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}{t("radiology.reports.printPdf")}
                </button>
                <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">{t("radiology.cancel")}</button>
                {canManage && nextStep ? (
                  <button onClick={() => saveAndAdvance(nextStep)} disabled={saving} className={`px-4 py-2 rounded-lg border font-medium flex items-center gap-2 ${ACTION_META[nextStep].cls}`}>
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t("radiology.reports.saveAnd")}{t(ACTION_META[nextStep].labelKey)}
                  </button>
                ) : null}
                <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t("radiology.reports.saveReport")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {viewerStudyId && <RadiologyViewerModal studyId={viewerStudyId} onClose={() => setViewerStudyId(null)} />}
    </>
  );
}

export default function RadiologyReportsTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ search: "", studySearch: "", statusFilter: "", criticalFilter: "", dateFrom: "", dateTo: "" });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [counters, setCounters] = useState<Counters | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; kind: ActionKind } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<ActionKind | null>(null);

  const canManage = canManageRadiology();
  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilters = !!(filters.search.trim() || filters.studySearch.trim() || filters.statusFilter || filters.criticalFilter || filters.dateFrom || filters.dateTo);

  const loadCounters = useCallback(async () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const specs: Array<[CounterKey, Array<[string, string]>]> = [
      ["total", []],
      ["awaitingReview", [["reportStatus", "DRAFT"]]],
      ["awaitingSign", [["reportStatus", "REVIEWED"]]],
      ["deliveredToday", [["reportStatus", "DELIVERED"], ["dateFrom", todayStr], ["dateTo", todayStr]]],
      ["critical", [["criticalCategory", "CRITICAL"]]],
    ];
    const results = await Promise.all(
      specs.map(async ([key, pairs]) => {
        try {
          const u = new URL(api("studies"));
          u.searchParams.set("hasReport", "true");
          u.searchParams.set("limit", "1");
          pairs.forEach(([k, v]) => u.searchParams.set(k, v));
          const res = await fetchJson<{ items?: unknown[]; total?: number }>(u.toString());
          return [key, res.total || 0] as [CounterKey, number];
        } catch {
          return [key, 0] as [CounterKey, number];
        }
      }),
    );
    const next: Counters = { total: 0, awaitingReview: 0, awaitingSign: 0, deliveredToday: 0, critical: 0 };
    results.forEach(([k, v]) => {
      next[k] = v;
    });
    setCounters(next);
  }, []);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    setRefreshing(true);
    try {
      const url = new URL(api("studies"));
      url.searchParams.set("limit", String(PAGE_SIZE));
      url.searchParams.set("page", String(page));
      url.searchParams.set("hasReport", "true");
      if (filters.statusFilter) url.searchParams.set("reportStatus", filters.statusFilter);
      if (filters.criticalFilter) url.searchParams.set("criticalCategory", filters.criticalFilter);
      if (filters.search.trim()) url.searchParams.set("patientName", filters.search.trim());
      if (filters.studySearch.trim()) url.searchParams.set("studyNumber", filters.studySearch.trim());
      if (filters.dateFrom) url.searchParams.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) url.searchParams.set("dateTo", filters.dateTo);
      const res = await fetchJson<{ items?: ReportRow[]; total?: number }>(url.toString());
      setRows(res.items || []);
      setTotal(res.total || 0);
      setLoadError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : t("radiology.reports.loadFailed");
      setLoadError(message);
      if (!opts?.silent) toast.error(message);
    } finally {
      setRefreshing(false);
    }
    void loadCounters();
  }, [filters, page, loadCounters]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  };

  const isCounterActive = (key: CounterKey): boolean => {
    switch (key) {
      case "awaitingReview":
        return filters.statusFilter === "DRAFT";
      case "awaitingSign":
        return filters.statusFilter === "REVIEWED";
      case "deliveredToday":
        return !!(filters.statusFilter === "DELIVERED" && filters.dateFrom && filters.dateTo);
      case "critical":
        return filters.criticalFilter === "CRITICAL";
      default:
        return false;
    }
  };

  const toggleCounter = (key: CounterKey) => {
    setFilters(f => {
      const next = { ...f };
      if (key === "awaitingReview") {
        next.statusFilter = f.statusFilter === "DRAFT" ? "" : "DRAFT";
      } else if (key === "awaitingSign") {
        next.statusFilter = f.statusFilter === "REVIEWED" ? "" : "REVIEWED";
      } else if (key === "deliveredToday") {
        if (f.statusFilter === "DELIVERED" && f.dateFrom && f.dateTo) {
          next.statusFilter = "";
          next.dateFrom = "";
          next.dateTo = "";
        } else {
          const now = new Date();
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
          next.statusFilter = "DELIVERED";
          next.dateFrom = todayStr;
          next.dateTo = todayStr;
        }
      } else if (key === "critical") {
        next.criticalFilter = f.criticalFilter === "CRITICAL" ? "" : "CRITICAL";
      }
      return next;
    });
    setPage(1);
  };

  const reportStatusOf = (s: ReportRow) => s.report?.reportStatus || "";

  const nextAction = (s: ReportRow): { kind: ActionKind; cls: string } | null => {
    const kind = nextActionFor(reportStatusOf(s));
    return kind ? { kind, cls: ACTION_META[kind].cls } : null;
  };

  const runAction = async (studyId: string, kind: ActionKind) => {
    if (busyId === studyId) return;
    setBusyId(studyId);
    try {
      await fetchJson(api(`studies/${studyId}/report/${kind}`), { method: "PUT" });
      toast.success(t(ACTION_META[kind].toastKey));
      setConfirmAction(null);
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.reports.actionFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const reportBadge = (value: string) => {
    const meta = RadiologyReportStatusMap[value];
    if (meta) return <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${meta.color}`}>{t(meta.label)}</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs whitespace-nowrap bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{value || "—"}</span>;
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = (rows?.length || 0) > 0 && (rows || []).every(r => selected.has(r.id));

  const toggleSelectAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      (rows || []).forEach(r => {
        if (allVisibleSelected) next.delete(r.id); else next.add(r.id);
      });
      return next;
    });
  };

  const runBulkAction = async (action: ActionKind) => {
    if (bulkBusy || selected.size === 0) return;
    setBulkBusy(action);
    try {
      const ids = Array.from(selected);
      const result = await fetchJson<{ successCount?: number; failed?: Array<{ id: string; error: string }> }>(
        api("bulk/reports/advance"),
        { method: "POST", body: JSON.stringify({ ids, action }) },
      );
      const successCount = result.successCount ?? 0;
      const failedCount = result.failed?.length ?? 0;
      if (failedCount > 0) {
        toast.warning(t("radiology.bulk.result", { successCount, failedCount }));
      } else {
        toast.success(t("radiology.bulk.result", { successCount, failedCount }));
      }
      setSelected(new Set());
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.reports.actionFailed"));
    } finally {
      setBulkBusy(null);
    }
  };

  const ROLES = [
    { key: "typed", labelKey: "radiology.reports.typedBy", field: "typedBy" },
    { key: "reviewed", labelKey: "radiology.reports.reviewedBy", field: "reviewedBy" },
    { key: "signed", labelKey: "radiology.reports.signedBy", field: "signedBy" },
  ] as const;

  const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("ar-EG") : "—");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("radiology.reports.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.reports.subtitle")}</p>
        </div>
        <button onClick={() => refresh()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}{t("radiology.refresh")}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {KPI_CARDS.map(card => {
          const value = counters ? counters[card.key] : undefined;
          const active = isCounterActive(card.key);
          const clickable = card.key !== "total";
          return (
            <button
              key={card.key}
              type="button"
              disabled={!clickable}
              onClick={() => toggleCounter(card.key)}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-3 sm:p-4 flex items-start gap-3 text-right transition-colors ${active ? "border-blue-400 ring-1 ring-blue-400 dark:border-blue-500" : "border-gray-200 dark:border-gray-700"} ${clickable ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/60" : "cursor-default"}`}
            >
              <span className={`p-2 rounded-lg shrink-0 ${card.iconCls}`}>
                <card.icon className="w-5 h-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{t(card.labelKey)}</span>
                {value === undefined ? (
                  <span className="block mt-1.5 h-6 w-10 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                ) : (
                  <span className="block mt-0.5 text-xl font-bold text-gray-900 dark:text-gray-100">{value}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={filters.statusFilter} onChange={e => updateFilter("statusFilter", e.target.value)}>
          <option value="">{t("radiology.reports.allStatuses")}</option>
          {Object.entries(RadiologyReportStatusMap).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}
        </select>
        <select className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={filters.criticalFilter} onChange={e => updateFilter("criticalFilter", e.target.value)}>
          <option value="">{t("radiology.reports.allReports")}</option>
          <option value="CRITICAL">{t("radiology.critical.criticalList")}</option>
          <option value="NONE">{t("radiology.critical.none")}</option>
        </select>
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" />
          <input className="border dark:border-gray-600 rounded-lg pr-9 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 w-52" placeholder={t("radiology.reports.searchByPatient") as string} value={filters.search} onChange={e => updateFilter("search", e.target.value)} />
        </div>
        <input className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" dir="ltr" placeholder={t("radiology.reports.studyNumber") as string} value={filters.studySearch} onChange={e => updateFilter("studySearch", e.target.value)} />
        <input type="date" className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={filters.dateFrom} onChange={e => updateFilter("dateFrom", e.target.value)} />
        <input type="date" className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={filters.dateTo} onChange={e => updateFilter("dateTo", e.target.value)} />
        {refreshing ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : null}
      </div>

      {loading && !rows ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : rows === null && loadError ? (
        <div className="text-center py-16">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-400" />
          <p className="text-sm text-red-500 mb-4">{loadError}</p>
          <button onClick={() => refresh()} className="px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">{t("radiology.reports.retry")}</button>
        </div>
      ) : rows === null || rows.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-3" />
          {hasActiveFilters ? t("radiology.reports.noReportsMatch") : t("radiology.reports.noReportsYet")}
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
                    <th className="py-3 px-4 whitespace-nowrap">
                      {canManage ? (
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-blue-600"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                          title={t("radiology.bulk.selectAll") as string}
                          aria-label={t("radiology.bulk.selectAll") as string}
                        />
                      ) : null}
                    </th>
                    {[
                      { key: "patient", label: t("radiology.reports.patient") },
                      { key: "studyNumber", label: t("radiology.reports.studyNumber") },
                      { key: "examType", label: t("radiology.reports.examType") },
                      { key: "reportStatus", label: t("radiology.reports.reportStatus") },
                      { key: "roles", label: t("radiology.reports.roles") },
                      { key: "lastUpdated", label: t("radiology.reports.lastUpdated") },
                      { key: "actions", label: t("radiology.reports.actions") },
                    ].map(col => (
                      <th key={col.key} className="text-right py-3 px-4 whitespace-nowrap">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(s => {
                    const action = nextAction(s);
                    const reportStatus = reportStatusOf(s);
                    const criticalCat = criticalCategoryText(s.report);
                    const criticalMeta = criticalCat ? RADIOLOGY_CRITICAL_META[criticalCat] : undefined;
                    return (
                      <tr key={s.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                        <td className="py-3 px-4">
                          {canManage ? (
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-blue-600"
                              checked={selected.has(s.id)}
                              onChange={() => toggleSelect(s.id)}
                              aria-label={t("radiology.bulk.selectAll") as string}
                            />
                          ) : null}
                        </td>
                        <td className="py-3 px-4 font-medium">{s.patientName}</td>
                        <td className="py-3 px-4 font-medium" dir="ltr">{s.studyNumber || s.id.slice(0, 8)}</td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{s.examTypeName || s.examType?.name || "—"}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {reportBadge(reportStatus)}
                            {criticalMeta ? (
                              <span title={s.report?.criticalFindingText} className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap flex items-center gap-1 ${criticalMeta.color}`}>
                                <ShieldAlert className="w-3 h-3" />{t(criticalMeta.label)}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 min-w-[140px]">
                            {ROLES.map(r => {
                              const name = s.report?.[r.field];
                              return (
                                <span key={r.key} className="text-xs text-right px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                                  {t(r.labelKey)}: <b>{name || "—"}</b>
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-400 dark:text-gray-500 whitespace-nowrap">{fmtDate(s.report?.updatedAt || s.report?.signedAt || s.report?.typedAt || s.createdAt)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button onClick={() => navigate(`/radiology/study/${s.id}`)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title={t("radiology.reports.details") as string}><Eye className="w-4 h-4" /></button>
                            <button onClick={() => setEditId(s.id)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title={t("radiology.reports.editReport") as string}><Pencil className="w-4 h-4" /></button>
                            {canManage && action ? (
                              <button
                                onClick={() => setConfirmAction({ id: s.id, kind: action.kind })}
                                disabled={busyId === s.id}
                                className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium ${action.cls}`}
                              >
                                {busyId === s.id ? <Loader2 className="w-3 h-3 inline animate-spin ml-1" /> : null}
                                {t(ACTION_META[action.kind].labelKey)}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("radiology.reports.showingRange", { shown: rows.length, total, page, pages: totalPages })}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || refreshing} className="px-3 py-1.5 border dark:border-gray-600 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">{t("radiology.reports.previous")}</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages || refreshing} className="px-3 py-1.5 border dark:border-gray-600 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">{t("radiology.reports.next")}</button>
            </div>
          </div>
        </>
      )}

      {editId && (
        <RadiologyReportModal studyId={editId} onClose={() => setEditId(null)} onSaved={() => refresh({ silent: true })} />
      )}

      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setConfirmAction(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{t("radiology.reports.confirmAction")}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{t(ACTION_META[confirmAction.kind].messageKey)}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">{t("radiology.cancel")}</button>
              <button
                onClick={() => runAction(confirmAction.id, confirmAction.kind)}
                disabled={busyId === confirmAction.id}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {busyId === confirmAction.id && <Loader2 className="w-4 h-4 animate-spin" />}{t("radiology.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {canManage && selected.size > 0 ? (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center pointer-events-none">
          <div className="pointer-events-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 px-4 py-3 flex flex-wrap items-center justify-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t("radiology.bulk.selected", { count: selected.size })}</span>
            <button
              onClick={() => void runBulkAction("review")}
              disabled={bulkBusy !== null}
              className={`px-3 py-1.5 text-sm rounded-lg border font-medium flex items-center gap-1.5 disabled:opacity-50 ${ACTION_META.review.cls}`}
            >
              {bulkBusy === "review" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {t("radiology.bulk.review")}
            </button>
            <button
              onClick={() => void runBulkAction("sign")}
              disabled={bulkBusy !== null}
              className={`px-3 py-1.5 text-sm rounded-lg border font-medium flex items-center gap-1.5 disabled:opacity-50 ${ACTION_META.sign.cls}`}
            >
              {bulkBusy === "sign" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {t("radiology.bulk.sign")}
            </button>
            <button
              onClick={() => void runBulkAction("deliver")}
              disabled={bulkBusy !== null}
              className={`px-3 py-1.5 text-sm rounded-lg border font-medium flex items-center gap-1.5 disabled:opacity-50 ${ACTION_META.deliver.cls}`}
            >
              {bulkBusy === "deliver" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {t("radiology.bulk.deliver")}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              disabled={bulkBusy !== null}
              className="px-3 py-1.5 text-sm rounded-lg border dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {t("radiology.bulk.done")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
