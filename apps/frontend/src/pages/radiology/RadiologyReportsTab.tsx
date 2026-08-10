import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Pencil, Printer, RefreshCw, X as XMarkIcon } from "lucide-react";
import tokenManager from "../../utils/tokenManager";
import {
  api, fetchJson, getCompanyId, RadiologyReport, RadiologyReportStatusMap, RadiologyReportTemplate, RadiologyStudy,
  MODAL_CONTENT_CLS, MODAL_INPUT_CLS,
} from "./shared";

type ActionKind = "review" | "sign" | "deliver";

const ACTION_META: Record<ActionKind, { label: string; cls: string; message: string; toast: string }> = {
  review: {
    label: "مراجعة",
    cls: "border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-300 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50",
    message: "هل تريد تأكيد مراجعة التقرير؟",
    toast: "تمت مراجعة التقرير بنجاح",
  },
  sign: {
    label: "توقيع",
    cls: "border-green-300 text-green-700 bg-green-50 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:bg-green-900/30 dark:hover:bg-green-900/50",
    message: "هل تريد تأكيد توقيع التقرير؟",
    toast: "تم توقيع التقرير بنجاح",
  },
  deliver: {
    label: "تسليم",
    cls: "border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100 dark:border-teal-700 dark:text-teal-300 dark:bg-teal-900/30 dark:hover:bg-teal-900/50",
    message: "هل تريد تأكيد تسليم التقرير؟",
    toast: "تم تسليم التقرير بنجاح",
  },
};

interface ReportRow extends RadiologyStudy {
  report?: RadiologyReport;
}

export function RadiologyReportModal({ studyId, onClose, onSaved }: { studyId: string; onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<RadiologyReport | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [templates, setTemplates] = useState<RadiologyReportTemplate[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetchJson<RadiologyReport>(api(`studies/${studyId}/report`));
        setReport(r);
        setText(r?.reportText || "");
        const tpls = await fetchJson<RadiologyReportTemplate[]>(api("report-templates"));
        setTemplates(tpls || []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "فشل تحميل التقرير");
        onClose();
      } finally {
        setLoading(false);
      }
    })();
  }, [studyId]);

  const applyTemplate = (id: string) => {
    const tpl = templates.find(t => t.id === id);
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
      toast.success("تم حفظ التقرير بنجاح");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل حفظ التقرير");
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
        throw new Error(j?.error || "فشل إنشاء PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل إنشاء PDF");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">إدخال التقرير</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : (
          <>
            {report?.reportStatus ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">حالة التقرير: {RadiologyReportStatusMap[report.reportStatus]?.label ?? report.reportStatus}</p>
            ) : null}
            {templates.length > 0 ? (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">قوالب جاهزة</label>
                <select className={MODAL_INPUT_CLS} value="" onChange={e => applyTemplate(e.target.value)}>
                  <option value="">اختر قالباً لاستخدامه...</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            ) : null}
            <textarea className={`${MODAL_INPUT_CLS} min-h-[240px] resize-y`} value={text} onChange={e => setText(e.target.value)} placeholder="نص التقرير الطبي..." />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={printPdf} disabled={printing} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}طباعة PDF
              </button>
              <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}حفظ التقرير
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function RadiologyReportsTab() {
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; kind: ActionKind } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const url = new URL(api("studies"));
      url.searchParams.set("limit", "200");
      const res = await fetchJson<{ items?: ReportRow[]; total?: number }>(url.toString());
      const items = (res.items || []).filter(s => s.reportStatus || s.report);
      setRows(items);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : "فشل تحميل التقارير");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const reportStatusOf = (s: ReportRow) => s.report?.reportStatus || s.reportStatus || "";

  const nextAction = (s: ReportRow): { kind: ActionKind; cls: string } | null => {
    switch (reportStatusOf(s)) {
      case "PENDING":
      case "DRAFT":
        return { kind: "review", cls: ACTION_META.review.cls };
      case "REVIEWED":
        return { kind: "sign", cls: ACTION_META.sign.cls };
      case "SIGNED":
        return { kind: "deliver", cls: ACTION_META.deliver.cls };
      default:
        return null;
    }
  };

  const runAction = async (studyId: string, kind: ActionKind) => {
    if (busyId === studyId) return;
    setBusyId(studyId);
    try {
      await fetchJson(api(`studies/${studyId}/report/${kind}`), { method: "PUT" });
      toast.success(ACTION_META[kind].toast);
      setConfirmAction(null);
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل تنفيذ العملية");
    } finally {
      setBusyId(null);
    }
  };

  const reportBadge = (value: string) => {
    const meta = RadiologyReportStatusMap[value];
    if (meta) return <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${meta.color}`}>{meta.label}</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs whitespace-nowrap bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{value || "—"}</span>;
  };

  const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("ar-EG") : "—");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">التقارير الطبية</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">كتابة التقارير ومراجعتها وتوقيعها وتسليمها</p>
        </div>
        <button onClick={() => refresh()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
          <RefreshCw className="w-4 h-4" />تحديث
        </button>
      </div>

      {loading && !rows ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : rows === null || rows.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-3" />
          لا توجد تقارير بعد
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
                  {["المريض", "رقم الدراسة", "نوع الفحص", "حالة التقرير", "التاريخ", "إجراءات"].map(h => (
                    <th key={h} className="text-right py-3 px-4 whitespace-nowrap">{h}</th>
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
                      <td className="py-3 px-4 text-gray-400 dark:text-gray-500 whitespace-nowrap">{fmtDate(s.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button onClick={() => setEditId(s.id)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="تعديل التقرير"><Pencil className="w-4 h-4" /></button>
                          {action && (
                            <button
                              onClick={() => setConfirmAction({ id: s.id, kind: action.kind })}
                              disabled={busyId === s.id}
                              className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium ${action.cls}`}
                            >
                              {busyId === s.id ? <Loader2 className="w-3 h-3 inline animate-spin ml-1" /> : null}
                              {ACTION_META[action.kind].label}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editId && (
        <RadiologyReportModal studyId={editId} onClose={() => setEditId(null)} onSaved={() => refresh({ silent: true })} />
      )}

      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setConfirmAction(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">تأكيد العملية</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{ACTION_META[confirmAction.kind].message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
              <button
                onClick={() => runAction(confirmAction.id, confirmAction.kind)}
                disabled={busyId === confirmAction.id}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {busyId === confirmAction.id && <Loader2 className="w-4 h-4 animate-spin" />}تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
