import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Plus, RefreshCw, Search, FileText, GitMerge, Trash2, Pencil, Check, X as XMarkIcon } from "lucide-react";
import { api, bookingApi, fetchJson, getAuthHeaders, MODAL_INPUT_CLS, MODAL_CONTENT_CLS, RadiologyIdSettings, DEFAULT_ID_SETTINGS, formatSequentialId, fetchIdSettings } from "./shared";
import { BookingPatient } from "../admin/booking/shared";
import PatientModal from "../admin/booking/PatientModal";
import PatientDetailModal from "../admin/booking/PatientDetailModal";

interface RadiologyPatient {
  id: string; patientNo?: number; firstName: string; lastName?: string; phone?: string;
  gender?: string; nationalId?: string; insuranceNumber?: string;
  insuranceCompany?: { id: string; name: string };
  bloodType?: string; visitCount?: number;
  status?: string; isActive: boolean; createdAt: string;
}

interface PatientStudy {
  id: string; studyNumber?: string; examTypeName?: string;
  status?: string; report?: { reportStatus?: string; reportText?: string } | null;
  priceSnapshot?: number; paidAmount?: number; paymentStatus?: string;
  billingType?: string; appointmentId?: string; bookingNo?: number | null;
  createdAt?: string;
}

interface StudyVisit {
  key: string;
  appointmentId?: string;
  bookingNo?: number | null;
  ts: number;
  date: string;
  studies: PatientStudy[];
}

const groupIntoVisits = (rows: PatientStudy[]): StudyVisit[] => {
  const map = new Map<string, StudyVisit>();
  for (const s of rows) {
    const key = s.appointmentId ? `appt:${s.appointmentId}` : `study:${s.id}`;
    const ts = s.createdAt ? new Date(s.createdAt).getTime() || 0 : 0;
    let v = map.get(key);
    if (!v) {
      v = { key, appointmentId: s.appointmentId, bookingNo: s.bookingNo ?? null, ts, date: s.createdAt || "", studies: [] };
      map.set(key, v);
    }
    if (ts > v.ts) { v.ts = ts; v.date = s.createdAt || v.date; }
    v.studies.push(s);
  }
  return [...map.values()].sort((a, b) => b.ts - a.ts);
};

const GENDER_LABEL: Record<string, string> = { male: "radiology.gender.male", female: "radiology.gender.female" };
const STATUS_LABEL: Record<string, string> = { ACTIVE: "radiology.patients.active", INACTIVE: "radiology.patients.inactive", REVIEW: "radiology.patients.underReview" };

const statusColor = (status?: string, isActive?: boolean): string => {
  if (status === "ACTIVE" || isActive) return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  if (status === "INACTIVE" || isActive === false) return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  if (status === "REVIEW") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
  return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
};

export default function RadiologyPatientsTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<RadiologyPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [insuranceCompanyId, setInsuranceCompanyId] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [insuranceCompanies, setInsuranceCompanies] = useState<{ id: string; name: string }[]>([]);
  const [modal, setModal] = useState<Partial<BookingPatient> | null | undefined>(undefined);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [recordVisits, setRecordVisits] = useState<StudyVisit[]>([]);
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordPatient, setRecordPatient] = useState<RadiologyPatient | null>(null);
  const [mergeSource, setMergeSource] = useState<RadiologyPatient | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [merging, setMerging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [idSettings, setIdSettings] = useState<RadiologyIdSettings>(DEFAULT_ID_SETTINGS);

  const pageSize = 25;

  useEffect(() => {
    fetchIdSettings().then(setIdSettings);
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const url = new URL(bookingApi("patients"));
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", String(pageSize));
      if (includeInactive) url.searchParams.set("includeInactive", "true");
      if (search.trim()) url.searchParams.set("search", search.trim());
      if (insuranceCompanyId) url.searchParams.set("insuranceCompanyId", insuranceCompanyId);
      const res = await fetch(url.toString(), { headers: getAuthHeaders() });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || t("radiology.patients.loadingFailed"));
      const rows = Array.isArray(json.data) ? json.data : [];
      setItems(rows);
      setTotal(json.total ?? rows.length);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.patients.loadingFailed"));
    } finally {
      setLoading(false);
    }
  }, [page, search, insuranceCompanyId, includeInactive]);

  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    fetchJson<{ id: string; name: string }[]>(bookingApi("insurance-companies"))
      .then(d => setInsuranceCompanies(Array.isArray(d) ? d : []))
      .catch(() => setInsuranceCompanies([]));
  }, []);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const openNew = () => setModal({});
  const openEdit = (p: RadiologyPatient) => setModal(p);
  const closeModal = () => setModal(undefined);

  const save = async (d: Partial<BookingPatient>) => {
    if (d.id) {
      await fetchJson(bookingApi(`patients/${d.id}`), { method: "PUT", body: JSON.stringify(d) });
      toast.success(t("radiology.patients.patientUpdated"));
    } else {
      await fetchJson(bookingApi("patients"), { method: "POST", body: JSON.stringify(d) });
      toast.success(t("radiology.patients.patientAdded"));
    }
    setModal(undefined);
    await load(true);
  };

  const toggle = async (p: RadiologyPatient) => {
    try {
      await fetchJson(bookingApi(`patients/${p.id}`), { method: "PUT", body: JSON.stringify({ isActive: !p.isActive }) });
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.patients.updateFailed"));
    }
  };

  const remove = async (p: RadiologyPatient) => {
    if (!window.confirm(t("radiology.patients.deleteConfirm", { name: `${p.firstName} ${p.lastName || ""}` }))) return;
    setDeletingId(p.id);
    try {
      await fetchJson(bookingApi(`patients/${p.id}`), { method: "DELETE" });
      toast.success(t("radiology.patients.patientDeleted"));
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.patients.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  const confirmMerge = async () => {
    if (!mergeSource || !mergeTargetId || merging) return;
    setMerging(true);
    try {
      await fetchJson(bookingApi(`patients/${mergeSource.id}/merge`), {
        method: "POST",
        body: JSON.stringify({ targetPatientId: mergeTargetId }),
      });
      toast.success(t("radiology.patients.mergeSuccess"));
      setMergeSource(null);
      setMergeTargetId("");
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.patients.mergeFailed"));
    } finally {
      setMerging(false);
    }
  };

  const mergeCandidates = useMemo(
    () => items.filter(p => p.id !== mergeSource?.id && p.isActive !== false && p.status !== "INACTIVE"),
    [items, mergeSource],
  );

  const viewRecord = async (p: RadiologyPatient) => {
    setRecordPatient(p);
    setRecordVisits([]);
    setRecordLoading(true);
    try {
      const fullName = `${p.firstName}${p.lastName ? " " + p.lastName : ""}`.trim();
      let rows = await fetchJson<{ items?: PatientStudy[] }>(`${api("studies")}&patientId=${p.id}&limit=100`);
      if (!rows.items?.length && fullName) {
        rows = await fetchJson<{ items?: PatientStudy[] }>(`${api("studies")}&patientName=${encodeURIComponent(fullName)}&limit=100`);
      }
      setRecordVisits(groupIntoVisits(rows.items || []));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.patients.fetchStudiesFailed"));
    } finally {
      setRecordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{t("radiology.patients.title")}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={t("radiology.patients.searchPlaceholder")}
              className={`${MODAL_INPUT_CLS} pr-9 max-w-xs`} />
          </div>
          <select className={MODAL_INPUT_CLS} value={insuranceCompanyId} onChange={e => { setInsuranceCompanyId(e.target.value); setPage(1); }}>
            <option value="">{t("radiology.patients.allInsuranceCompanies")}</option>
            {insuranceCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
            <input type="checkbox" checked={includeInactive} onChange={e => { setIncludeInactive(e.target.checked); setPage(1); }} className="rounded" />
            {t("radiology.patients.inactiveOnly")}
          </label>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4" />{t("radiology.patients.newPatient")}
          </button>
          <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm">
            <RefreshCw className="w-4 h-4" />{t("radiology.refresh")}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center py-10 text-gray-400">{t("radiology.loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-center py-10 text-gray-400">{t("radiology.patients.noPatients")}</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="py-3 px-4 text-right font-medium">{t("radiology.patients.patientId")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.patients.name")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.patients.phone")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.patients.gender")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.patients.nationalIdCol")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.patients.insuranceNumberCol")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.patients.visits")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.patients.status")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.patients.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id} className={`border-b dark:border-gray-700/50 last:border-0 ${!p.isActive ? "opacity-60" : ""}`}>
                  <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                    <span className="text-xs font-mono font-medium" dir="ltr">{formatSequentialId(idSettings.patientPrefix, p.patientNo, idSettings.digits, idSettings.enabled) || p.id.slice(0, 8)}</span>
                  </td>
                  <td className="py-3 px-4 font-medium">{p.firstName} {p.lastName || ""}</td>
                  <td className="py-3 px-4" dir="ltr">{p.phone || "—"}</td>
                  <td className="py-3 px-4">{GENDER_LABEL[p.gender || ""] ? t(GENDER_LABEL[p.gender || ""] ?? "") : "—"}</td>
                  <td className="py-3 px-4" dir="ltr">{p.nationalId || "—"}</td>
                  <td className="py-3 px-4">
                    {p.insuranceNumber ? <span dir="ltr">{p.insuranceNumber}</span> : "—"}
                    {p.insuranceCompany?.name ? <div className="text-xs text-gray-400">{p.insuranceCompany.name}</div> : null}
                  </td>
                  <td className="py-3 px-4">{p.visitCount ?? 0}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${statusColor(p.status, p.isActive)}`}>
                      {STATUS_LABEL[p.status || ""] ? t(STATUS_LABEL[p.status || ""] ?? "") : (p.isActive ? t("radiology.patients.active") : t("radiology.patients.inactive"))}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button onClick={() => { setRecordId(p.id); }} className="text-xs px-2 py-1 border rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />{t("radiology.patients.file")}
                      </button>
                      <button onClick={() => viewRecord(p)} className="text-xs px-2 py-1 border rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />{t("radiology.patients.studies")}
                      </button>
                      <button onClick={() => openEdit(p)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title={t("radiology.edit")}><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => { setMergeTargetId(""); setMergeSource(p); }} className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded" title={t("radiology.patients.merge")}><GitMerge className="w-4 h-4" /></button>
                      <button onClick={() => toggle(p)} className={`p-1.5 rounded ${p.isActive ? "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" : "text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30"}`} title={p.isActive ? t("radiology.patients.deactivate") : t("radiology.patients.activate")}><Check className="w-4 h-4" /></button>
                      <button onClick={() => remove(p)} disabled={deletingId === p.id} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title={t("radiology.delete")}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > pageSize && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>{t("radiology.patients.totalPatients", { total })}</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border dark:border-gray-600 rounded-lg disabled:opacity-40">{t("radiology.patients.previous")}</button>
            <span>{page} / {pageCount}</span>
            <button disabled={page >= pageCount} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border dark:border-gray-600 rounded-lg disabled:opacity-40">{t("radiology.patients.next")}</button>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("radiology.patients.subtitle")} <a href="/radiology/schedule" className="text-blue-600 dark:text-blue-400">{t("radiology.patients.scheduleLink")}</a>.
      </p>

      {modal !== undefined && <PatientModal patient={modal || null} onClose={closeModal} onSave={save} />}
      {recordId && <PatientDetailModal patientId={recordId} onClose={() => setRecordId(null)} />}

      {recordPatient && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setRecordPatient(null)}>
          <div className={`${MODAL_CONTENT_CLS} max-h-[85vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{t("radiology.patientTimeline.title")} — {recordPatient.firstName} {recordPatient.lastName || ""}</h3>
              <button onClick={() => setRecordPatient(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            {recordLoading ? (
              <p className="text-center py-10 text-gray-400">{t("radiology.loadingEllipsis")}</p>
            ) : recordVisits.length === 0 ? (
              <p className="text-center py-10 text-gray-400">{t("radiology.patientTimeline.noVisits")}</p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.patientTimeline.visits", { count: recordVisits.length })}</p>
                {recordVisits.map((v, idx) => (
                  <div key={v.key} className="rounded-lg border dark:border-gray-700 overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/70 border-b dark:border-gray-700">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                          {v.appointmentId ? t("radiology.patientTimeline.visitNumber", { n: recordVisits.length - idx }) : t("radiology.patientTimeline.singleVisit")}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 whitespace-nowrap">
                          {t("radiology.patientTimeline.studyCount", { count: v.studies.length })}
                        </span>
                        {v.bookingNo ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 whitespace-nowrap" dir="ltr">
                            {t("radiology.patientTimeline.bookingNo")}: {formatSequentialId(idSettings.bookingPrefix, v.bookingNo, idSettings.digits, idSettings.enabled) || v.bookingNo}
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{v.date ? new Date(v.date).toLocaleDateString("ar-EG") : "—"}</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400">
                          <th className="py-2 px-3 text-right font-medium">{t("radiology.patients.studyNumber")}</th>
                          <th className="py-2 px-3 text-right font-medium">{t("radiology.patients.exam")}</th>
                          <th className="py-2 px-3 text-right font-medium">{t("radiology.patients.status")}</th>
                          <th className="py-2 px-3 text-right font-medium">{t("radiology.patientTimeline.report")}</th>
                          <th className="py-2 px-3 text-right font-medium">{t("radiology.paid")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {v.studies.map(s => (
                          <tr key={s.id} className="border-b dark:border-gray-700/50 last:border-0">
                            <td className="py-2 px-3" dir="ltr">{s.studyNumber || "—"}</td>
                            <td className="py-2 px-3">{s.examTypeName || "—"}</td>
                            <td className="py-2 px-3">{s.status || "—"}</td>
                            <td className="py-2 px-3 max-w-[240px]">
                              {s.report?.reportStatus ? (
                                <div className="truncate" title={s.report?.reportText || s.report?.reportStatus}>
                                  <span className="text-blue-600 dark:text-blue-400">{s.report?.reportStatus}</span>
                                  {s.report?.reportText ? <span className="text-gray-500 dark:text-gray-400"> — {s.report.reportText.slice(0, 60)}{s.report.reportText.length > 60 ? "…" : ""}</span> : null}
                                </div>
                              ) : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              {Number(s.paidAmount || 0) > 0 ? (
                                <span className="text-green-600 dark:text-green-400">{Number(s.paidAmount).toFixed(0)} {t("radiology.currency")}</span>
                              ) : (
                                <span className="text-gray-400">0 {t("radiology.currency")}</span>
                              )}
                              {s.paymentStatus && s.paymentStatus !== "UNPAID" && s.paymentStatus !== "PAID" ? (
                                <span className="text-xs text-amber-600 dark:text-amber-400"> ({s.paymentStatus})</span>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {mergeSource && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setMergeSource(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{t("radiology.patients.mergePatient")}</h3>
              <button onClick={() => setMergeSource(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4" dangerouslySetInnerHTML={{ __html: t("radiology.patients.mergeDescription", { name: `${mergeSource.firstName} ${mergeSource.lastName || ""}` }) }} />
            <label className="block text-sm font-medium mb-1">{t("radiology.patients.targetPatient")}</label>
            <select className={MODAL_INPUT_CLS} value={mergeTargetId} onChange={e => setMergeTargetId(e.target.value)}>
              <option value="">{t("radiology.patients.selectTargetPatient")}</option>
              {mergeCandidates.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName || ""}{c.phone ? ` (${c.phone})` : ""}</option>)}
            </select>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setMergeSource(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg">{t("radiology.cancel")}</button>
              <button onClick={confirmMerge} disabled={!mergeTargetId || merging} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
                {merging ? t("radiology.patients.merging") : t("radiology.patients.confirmMerge")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
