import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, FileText, FolderOpen, Loader2, Pencil, Printer, RefreshCw, Search, X as XMarkIcon } from "lucide-react";
import tokenManager from "../../utils/tokenManager";
import {
  api, fetchJson, getCompanyId, RadiologyReport, RadiologyReportStatusMap, RadiologyReportTemplate, RadiologyStudy,
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

interface ReportRow extends RadiologyStudy {
  report?: RadiologyReport;
}

export function RadiologyReportModal({ studyId, onClose, onSaved }: { studyId: string; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<RadiologyReport | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [templates, setTemplates] = useState<RadiologyReportTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [viewerStudyId, setViewerStudyId] = useState<string | null>(null);

  const canManage = canManageRadiology();
  const nextStep = report ? nextActionFor(report.reportStatus) : null;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetchJson<RadiologyReport>(api(`studies/${studyId}/report`));
        setReport(r);
        setText(r?.reportText || "");
        const tpls = await fetchJson<RadiologyReportTemplate[]>(api("report-templates"));
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
        <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">{t("radiology.reports.enterReport")}</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <>
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
              <textarea className={`${MODAL_INPUT_CLS} min-h-[240px] resize-y`} value={text} onChange={e => setText(e.target.value)} placeholder={t("radiology.reports.reportTextPlaceholder") as string} />
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
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ search: "", studySearch: "", statusFilter: "", dateFrom: "", dateTo: "" });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; kind: ActionKind } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canManage = canManageRadiology();
  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilters = !!(filters.search.trim() || filters.studySearch.trim() || filters.statusFilter || filters.dateFrom || filters.dateTo);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    setRefreshing(true);
    try {
      const url = new URL(api("studies"));
      url.searchParams.set("limit", String(PAGE_SIZE));
      url.searchParams.set("page", String(page));
      url.searchParams.set("hasReport", "true");
      if (filters.statusFilter) url.searchParams.set("reportStatus", filters.statusFilter);
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
  }, [filters, page]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters(f => ({ ...f, [key]: value }));
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

      <div className="flex flex-wrap items-center gap-3">
        <select className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={filters.statusFilter} onChange={e => updateFilter("statusFilter", e.target.value)}>
          <option value="">{t("radiology.reports.allStatuses")}</option>
          {Object.entries(RadiologyReportStatusMap).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}
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
                    return (
                      <tr key={s.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                        <td className="py-3 px-4 font-medium">{s.patientName}</td>
                        <td className="py-3 px-4 font-medium" dir="ltr">{s.studyNumber || s.id.slice(0, 8)}</td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{s.examTypeName || s.examType?.name || "—"}</td>
                        <td className="py-3 px-4">{reportBadge(reportStatus)}</td>
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
    </div>
  );
}
