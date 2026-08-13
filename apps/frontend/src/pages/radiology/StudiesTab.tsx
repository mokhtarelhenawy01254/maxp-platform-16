import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ArrowUpCircle, Banknote, Copy, ExternalLink, FileText, FolderOpen, Loader2, Plus, Printer, RefreshCw, Save, Search, Upload, X as XMarkIcon } from "lucide-react";
import tokenManager from "../../utils/tokenManager";
import {
  api, fetchJson, getCompanyId, RadiologyStudy, RadiologyStudyPayment, RadiologyStatusMap, RadiologySubmissionStatusMap,
  parsePatientFlags, flagMeta, STUDY_STATUS, MODAL_CONTENT_CLS, MODAL_INPUT_CLS,
} from "./shared";
import RadiologyViewerModal from "./RadiologyViewerModal";
import { RadiologyReportModal } from "./RadiologyReportsTab";

interface RologyDraft {
  submissionStatus: string;
  rologyStudyLink: string;
  rologyReportLink: string;
  rologyRadiologist: string;
}

const emptyRologyDraft = (): RologyDraft => ({
  submissionStatus: "NOT_SUBMITTED",
  rologyStudyLink: "",
  rologyReportLink: "",
  rologyRadiologist: "",
});

interface RadiologyRadiologist {
  id: string;
  name: string;
  location: string;
}

type StudyWithRadiologist = RadiologyStudy & {
  assignedRadiologistId?: string;
  assignedRadiologistName?: string;
  radiologistLocation?: string;
};

const filterCls = "border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100";

export default function StudiesTab() {
  const { t } = useTranslation();
  const [studies, setStudies] = useState<StudyWithRadiologist[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [nationalSearch, setNationalSearch] = useState("");
  const [insuranceSearch, setInsuranceSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [viewerStudyId, setViewerStudyId] = useState<string | null>(null);
  const [reportStudyId, setReportStudyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, RologyDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [radiologists, setRadiologists] = useState<RadiologyRadiologist[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [payModal, setPayModal] = useState<{ studyId: string; total: number; paidAmount: number; remaining: number; billingType: string; payments: RadiologyStudyPayment[] } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [savingPay, setSavingPay] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const uploadImages = async (id: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (uploadingId === id) return;
    setUploadingId(id);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append("files", f));
      const headers = tokenManager.createAuthHeaders({});
      const cid = getCompanyId();
      if (cid) headers["X-Company-Id"] = cid;
      const res = await fetch(api(`studies/${id}/images`), { method: "POST", headers, body: fd });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || t("radiology.studies.uploadFailed"));
      toast.success(t("radiology.studies.uploadSuccess", { count: files.length }));
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.studies.uploadFailed"));
    } finally {
      setUploadingId(null);
    }
  };

  const printLabel = async (id: string) => {
    try {
      const headers = tokenManager.createAuthHeaders({});
      const cid = getCompanyId();
      if (cid) headers["X-Company-Id"] = cid;
      const res = await fetch(api(`studies/${id}/label`), { headers });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || t("radiology.studies.labelFailed"));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.studies.labelFailed"));
    }
  };

  const openPayment = async (id: string) => {
    try {
      const data = await fetchJson<{ total: number; paidAmount: number; remaining: number; paymentStatus: string; billingType: string; payments: RadiologyStudyPayment[] }>(api(`studies/${id}/payment`));
      setPayModal({ studyId: id, total: data.total, paidAmount: data.paidAmount, remaining: data.remaining, billingType: data.billingType || "PATIENT", payments: data.payments || [] });
      setPayAmount("");
      setPayMethod("CASH");
      setRefundAmount("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.studies.paymentDataFailed"));
    }
  };

  const savePayment = async () => {
    if (!payModal || savingPay) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error(t("radiology.studies.invalidAmount")); return; }
    setSavingPay(true);
    try {
      const data = await fetchJson<{ payment: RadiologyStudyPayment; total: number; remaining: number; paymentStatus: string }>(api(`studies/${payModal.studyId}/payment`), {
        method: "POST",
        body: JSON.stringify({ amount, method: payMethod }),
      });
      toast.success(t("radiology.studies.paymentRecorded", { amount }));
      setPayModal({ ...payModal, paidAmount: data.total - data.remaining, remaining: data.remaining, payments: [...payModal.payments, data.payment] });
      setPayAmount("");
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.studies.paymentFailed"));
    } finally {
      setSavingPay(false);
    }
  };

  const saveRefund = async () => {
    if (!payModal || savingPay) return;
    const amount = Number(refundAmount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error(t("radiology.studies.invalidAmount")); return; }
    setSavingPay(true);
    try {
      const data = await fetchJson<{ total: number; remaining: number; paymentStatus: string }>(api(`studies/${payModal.studyId}/payment/refund`), {
        method: "POST",
        body: JSON.stringify({ amount }),
      });
      toast.success(t("radiology.studies.refundRecorded", { amount }));
      setPayModal({ ...payModal, paidAmount: data.total - data.remaining, remaining: data.remaining });
      setRefundAmount("");
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.studies.refundFailed"));
    } finally {
      setSavingPay(false);
    }
  };

  const duplicateStudy = async (s: StudyWithRadiologist) => {
    if (!window.confirm(t("radiology.studies.duplicateConfirm", { name: s.patientName }))) return;
    try {
      await fetchJson(api(`studies/${s.id}/duplicate`), { method: "POST" });
      toast.success(t("radiology.studies.duplicateCreated"));
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.studies.duplicateFailed"));
    }
  };

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const url = new URL(api("studies"));
      url.searchParams.set("limit", "200");
      if (status) url.searchParams.set("status", status);
      if (search.trim()) url.searchParams.set("patientName", search.trim());
      if (nationalSearch.trim()) url.searchParams.set("nationalId", nationalSearch.trim());
      if (insuranceSearch.trim()) url.searchParams.set("insuranceNumber", insuranceSearch.trim());
      if (dateFrom) url.searchParams.set("dateFrom", dateFrom);
      if (dateTo) url.searchParams.set("dateTo", dateTo);
      const res = await fetchJson<{ items?: StudyWithRadiologist[]; total?: number }>(url.toString());
      setStudies(res.items || []);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : t("radiology.studies.loadFailed"));
    }
  }, [status, search, nationalSearch, insuranceSearch, dateFrom, dateTo]);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      refresh().finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [refresh]);

  useEffect(() => {
    fetchJson<RadiologyRadiologist[]>(api("radiologists"))
      .then(d => setRadiologists(d || []))
      .catch(() => setRadiologists([]));
  }, []);

  const statusBadge = (value?: string) => {
    const meta = value ? RadiologyStatusMap[value] : undefined;
    if (meta) return <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${meta.color}`}>{t(meta.label)}</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs whitespace-nowrap bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{value || "—"}</span>;
  };

  const submissionBadge = (value?: string) => {
    const meta = value ? RadiologySubmissionStatusMap[value] : undefined;
    if (meta) return <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${meta.color}`}>{t(meta.label)}</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs whitespace-nowrap bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{value || "—"}</span>;
  };

  const toggleExpand = (s: RadiologyStudy) => {
    if (!expanded.has(s.id)) {
      setDrafts(d => ({ ...d, [s.id]: {
        submissionStatus: s.submissionStatus || "NOT_SUBMITTED",
        rologyStudyLink: s.rologyStudyLink || "",
        rologyReportLink: s.rologyReportLink || "",
        rologyRadiologist: s.rologyRadiologist || "",
      } }));
    }
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
      return next;
    });
  };

  const saveRology = async (id: string) => {
    if (savingId === id) return;
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    try {
      await fetchJson(api(`studies/${id}`), {
        method: "PUT",
        body: JSON.stringify({
          submissionStatus: draft.submissionStatus,
          rologyStudyLink: draft.rologyStudyLink.trim() || undefined,
          rologyReportLink: draft.rologyReportLink.trim() || undefined,
          rologyRadiologist: draft.rologyRadiologist.trim() || undefined,
        }),
      });
      toast.success(t("radiology.studies.rologySaved"));
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.studies.saveFailed"));
    } finally {
      setSavingId(null);
    }
  };

  const advanceStatus = async (s: RadiologyStudy) => {
    if (advancingId === s.id) return;
    const next = STUDY_STATUS[s.status];
    if (!next) { toast.error(t("radiology.studies.noNextStatus")); return; }
    setAdvancingId(s.id);
    try {
      await fetchJson(api(`studies/${s.id}`), { method: "PUT", body: JSON.stringify({ status: next }) });
      toast.success(t("radiology.studies.statusUpdated", { status: RadiologyStatusMap[next] ? t(RadiologyStatusMap[next]?.label ?? "") : next }));
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.studies.statusUpdateFailed"));
    } finally {
      setAdvancingId(null);
    }
  };

  const assignRadiologist = async (s: StudyWithRadiologist, radiologistId: string) => {
    if (assigningId === s.id) return;
    setAssigningId(s.id);
    try {
      const updated = await fetchJson<StudyWithRadiologist>(api(`studies/${s.id}/radiologist`), {
        method: "PUT",
        body: JSON.stringify({ radiologistId: radiologistId || null }),
      });
      setStudies(prev => (prev ? prev.map(x => (x.id === s.id ? updated : x)) : prev));
      const name = radiologists.find(r => r.id === radiologistId)?.name;
      toast.success(radiologistId ? t("radiology.studies.radiologistAssigned", { name: name || t("radiology.studies.radiologist") }) : t("radiology.studies.radiologistUnassigned"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.studies.radiologistAssignFailed"));
      await refresh({ silent: true });
    } finally {
      setAssigningId(null);
    }
  };

  const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("ar-EG") : "—");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("radiology.studies.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.studies.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/radiology/schedule" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4" />{t("radiology.studies.newStudy")}
          </a>
          <button onClick={() => refresh()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("radiology.refresh")}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select className={filterCls} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">{t("radiology.studies.allStatuses")}</option>
          {Object.entries(RadiologyStatusMap).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}
        </select>
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" />
          <input className={`${filterCls} pr-9 w-48`} placeholder={t("radiology.studies.searchByName")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input className={filterCls} dir="ltr" placeholder={t("radiology.studies.nationalId")} value={nationalSearch} onChange={e => setNationalSearch(e.target.value)} />
        <input className={filterCls} dir="ltr" placeholder={t("radiology.studies.insuranceNumber")} value={insuranceSearch} onChange={e => setInsuranceSearch(e.target.value)} />
        <input type="date" className={filterCls} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" className={filterCls} value={dateTo} onChange={e => setDateTo(e.target.value)} />
      </div>

      {loading && !studies ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : studies === null || studies.length === 0 ? (
        <p className="text-center py-16 text-gray-400 dark:text-gray-500">{t("radiology.studies.noStudies")}</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
                  {[t("radiology.studies.studyNumber"), t("radiology.studies.patient"), t("radiology.studies.examType"), t("radiology.studies.radiologist"), t("radiology.status"), t("radiology.studies.submission"), t("radiology.date"), t("radiology.actions")].map(h => (
                    <th key={h} className="text-right py-3 px-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {studies.map(s => (
                  <Fragment key={s.id}>
                    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                      <td className="py-3 px-4 font-medium" dir="ltr">{s.studyNumber || s.id.slice(0, 8)}</td>
                      <td className="py-3 px-4 font-medium">
                        {s.patientName}
                        {s.emergency ? <span className="mr-2 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">{t("radiology.studies.emergency")}</span> : null}
                        {parsePatientFlags(s.patientFlags).map(f => {
                          const meta = flagMeta(f);
                          return meta ? <span key={f} className={`mr-1.5 px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap inline-block align-middle ${meta.color}`}>{t(meta.label)}</span> : null;
                        })}
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{s.examTypeName || s.examType?.name || "—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 min-w-[150px]">
                          <select
                            className={`${MODAL_INPUT_CLS} text-xs py-1.5`}
                            value={s.assignedRadiologistId || ""}
                            onChange={e => assignRadiologist(s, e.target.value)}
                            disabled={assigningId === s.id}
                          >
                            <option value="">{t("radiology.studies.unassigned")}</option>
                            {radiologists.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                          {s.assignedRadiologistName ? (
                            <span className="px-2 py-0.5 rounded-full text-xs whitespace-nowrap bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">{s.assignedRadiologistName}</span>
                          ) : null}
                          {s.radiologistLocation ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${s.radiologistLocation === "ON_SITE" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"}`}>
                              {s.radiologistLocation === "ON_SITE" ? t("radiology.studies.onSite") : t("radiology.studies.offSite")}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 px-4">{statusBadge(s.status)}</td>
                      <td className="py-3 px-4">{submissionBadge(s.submissionStatus)}</td>
                      <td className="py-3 px-4 text-gray-400 dark:text-gray-500 whitespace-nowrap">{fmtDate(s.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <input
                            ref={el => { fileInputs.current[s.id] = el; }}
                            type="file"
                            accept=".dcm,.DCM,application/dicom,application/octet-stream"
                            multiple
                            className="hidden"
                            onChange={e => { uploadImages(s.id, e.target.files); e.target.value = ""; }}
                          />
                          <button onClick={() => fileInputs.current[s.id]?.click()} disabled={uploadingId === s.id} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded disabled:opacity-40" title={t("radiology.studies.uploadImages")}>{uploadingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}</button>
                          <button onClick={() => setViewerStudyId(s.id)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title={t("radiology.studies.viewImages")}><FolderOpen className="w-4 h-4" /></button>
                          <button onClick={() => setReportStudyId(s.id)} className="p-1.5 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded" title={t("radiology.studies.enterReport")}><FileText className="w-4 h-4" /></button>
                          <button onClick={() => printLabel(s.id)} className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/30 rounded" title={t("radiology.studies.printLabel")}><Printer className="w-4 h-4" /></button>
                          <button onClick={() => openPayment(s.id)} className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded" title={t("radiology.studies.payment")}><Banknote className="w-4 h-4" /></button>
                          <button onClick={() => duplicateStudy(s)} className="p-1.5 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded" title={t("radiology.studies.duplicate")}><Copy className="w-4 h-4" /></button>
                          {s.rologyStudyLink ? (
                            <a href={s.rologyStudyLink} target="_blank" rel="noreferrer" className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded" title={t("radiology.studies.openInRology")}><ExternalLink className="w-4 h-4" /></a>
                          ) : null}
                          <button onClick={() => toggleExpand(s)} className={`px-2 py-1 text-xs rounded border font-medium ${expanded.has(s.id) ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`} title={t("radiology.studies.trackRology")}>Rology</button>
                          <button onClick={() => advanceStatus(s)} disabled={advancingId === s.id || !STUDY_STATUS[s.status]} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded disabled:opacity-40" title={t("radiology.studies.advanceStatus")}>{advancingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}</button>
                        </div>
                      </td>
                    </tr>
                    {expanded.has(s.id) && (
                      <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
                        <td colSpan={8} className="py-4 px-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.studies.rologySubmissionStatus")}</label>
                              <select className={MODAL_INPUT_CLS} value={drafts[s.id]?.submissionStatus ?? ""} onChange={e => setDrafts(d => ({ ...d, [s.id]: { ...(d[s.id] ?? emptyRologyDraft()), submissionStatus: e.target.value } }))}>
                                {Object.entries(RadiologySubmissionStatusMap).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.studies.rologyStudyLink")}</label>
                              <input className={MODAL_INPUT_CLS} dir="ltr" value={drafts[s.id]?.rologyStudyLink ?? ""} onChange={e => setDrafts(d => ({ ...d, [s.id]: { ...(d[s.id] ?? emptyRologyDraft()), rologyStudyLink: e.target.value } }))} placeholder="https://..." />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.studies.rologyReportLink")}</label>
                              <input className={MODAL_INPUT_CLS} dir="ltr" value={drafts[s.id]?.rologyReportLink ?? ""} onChange={e => setDrafts(d => ({ ...d, [s.id]: { ...(d[s.id] ?? emptyRologyDraft()), rologyReportLink: e.target.value } }))} placeholder="https://..." />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.studies.rologistName")}</label>
                              <input className={MODAL_INPUT_CLS} value={drafts[s.id]?.rologyRadiologist ?? ""} onChange={e => setDrafts(d => ({ ...d, [s.id]: { ...(d[s.id] ?? emptyRologyDraft()), rologyRadiologist: e.target.value } }))} placeholder={t("radiology.studies.rologistPlaceholder")} />
                            </div>
                          </div>
                          <div className="flex justify-end mt-4">
                            <button onClick={() => saveRology(s.id)} disabled={savingId === s.id} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                              {savingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{t("radiology.save")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewerStudyId && <RadiologyViewerModal studyId={viewerStudyId} onClose={() => setViewerStudyId(null)} />}
      {reportStudyId && <RadiologyReportModal studyId={reportStudyId} onClose={() => setReportStudyId(null)} onSaved={() => refresh({ silent: true })} />}

      {payModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setPayModal(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{t("radiology.studies.paymentModalTitle")}</h3>
              <button onClick={() => setPayModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2 py-0.5 rounded-full text-xs ${payModal.billingType === "INSURANCE" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}>
                {payModal.billingType === "INSURANCE" ? t("radiology.studies.billingToEntity") : t("radiology.studies.directPatientPayment")}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t("radiology.total")}</p>
                <p className="text-lg font-bold">{payModal.total.toFixed(0)} {t("radiology.currency")}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t("radiology.paid")}</p>
                <p className="text-lg font-bold text-green-600">{payModal.paidAmount.toFixed(0)} {t("radiology.currency")}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t("radiology.remaining")}</p>
                <p className="text-lg font-bold text-red-600">{payModal.remaining.toFixed(0)} {t("radiology.currency")}</p>
              </div>
            </div>
            {payModal.payments.length > 0 ? (
              <div className="mb-4 max-h-32 overflow-y-auto">
                {payModal.payments.map(p => (
                  <div key={p.id} className="flex justify-between text-sm border-b dark:border-gray-700/50 py-1.5">
                    <span>{p.method || "CASH"} {p.note ? `— ${p.note}` : ""}</span>
                    <b className="text-green-600">{p.amount.toFixed(0)} {t("radiology.currency")}</b>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex gap-3">
              <input type="number" min={0} className={MODAL_INPUT_CLS} dir="ltr" placeholder={t("radiology.studies.amountPlaceholder")} value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              <select className={MODAL_INPUT_CLS} value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                <option value="CASH">{t("radiology.paymentMethod.CASH")}</option>
                <option value="CARD">{t("radiology.paymentMethod.CARD")}</option>
                <option value="VODAFONE_CASH">{t("radiology.paymentMethod.VODAFONE_CASH")}</option>
                <option value="BANK">{t("radiology.paymentMethod.BANK")}</option>
              </select>
            </div>
            <div className="flex gap-3 mt-3">
              <input type="number" min={0} className={MODAL_INPUT_CLS} dir="ltr" placeholder={t("radiology.studies.refundPlaceholder")} value={refundAmount} onChange={e => setRefundAmount(e.target.value)} />
              <button onClick={saveRefund} disabled={savingPay || !refundAmount} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 text-sm">
                {t("radiology.studies.refund")}
              </button>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setPayModal(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">{t("radiology.close")}</button>
              <button onClick={savePayment} disabled={savingPay} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                {savingPay && <Loader2 className="w-4 h-4 animate-spin" />}{t("radiology.studies.recordPayment")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
