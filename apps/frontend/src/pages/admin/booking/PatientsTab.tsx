import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BookingPatient, PATIENT_STATUS_MAP, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, api, fetchJson } from "./shared";
import { Check, Eye, Pencil, Plus, Search, Trash2, ExternalLink, GitMerge, X } from 'lucide-react'
import PatientModal from "./PatientModal";

interface Props {
  patients: BookingPatient[];
  search: string;
  onSearchChange: (v: string) => void;
  onView: (id: string) => void;
  onEdit: (p: Partial<BookingPatient>) => void;
  onToggleActive: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  modalPatient: Partial<BookingPatient> | null | undefined;
  onModalClose: () => void;
  onSave: (d: Partial<BookingPatient>) => Promise<void>;
}

const GENDER_LABEL: Record<string, string> = { male: "╪░┘â╪▒", female: "╪ú┘å╪½┘ë" };

const statusMeta = (status?: string) => PATIENT_STATUS_MAP[status || "ACTIVE"] ?? { label: status || "ACTIVE", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" };

export default function PatientsTab({
  patients, search, onSearchChange,
  onView, onEdit, onToggleActive, onDelete,
  modalPatient, onModalClose, onSave
}: Props) {
  const navigate = useNavigate();
  const [sourceFilter, setSourceFilter] = useState("");
  const [insuranceFilter, setInsuranceFilter] = useState("");
  const [mergeSource, setMergeSource] = useState<BookingPatient | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [merging, setMerging] = useState(false);
  const [localPatients, setLocalPatients] = useState<BookingPatient[] | null>(null);

  useEffect(() => { setLocalPatients(null); }, [patients]);

  const list = localPatients ?? patients;

  const sources = useMemo(() => {
    const set = new Set<string>();
    list.forEach(p => { if (p.source) set.add(p.source); });
    return Array.from(set);
  }, [list]);

  const insuranceCompanies = useMemo(() => {
    const set = new Set<string>();
    list.forEach(p => { if (p.insuranceCompany?.name) set.add(p.insuranceCompany.name); });
    return Array.from(set);
  }, [list]);

  const filtered = useMemo(() => list.filter(p => {
    if (sourceFilter && p.source !== sourceFilter) return false;
    if (insuranceFilter && p.insuranceCompany?.name !== insuranceFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.firstName || "").toLowerCase().includes(q)
      || (p.lastName || "").toLowerCase().includes(q)
      || (p.phone || "").toLowerCase().includes(q)
      || (p.insuranceNumber || "").toLowerCase().includes(q);
  }), [list, search, sourceFilter, insuranceFilter]);

  const refresh = async () => {
    try { setLocalPatients(await fetchJson<BookingPatient[]>(api("patients?includeInactive=true"))); } catch { /* keep current list */ }
  };

  const candidates = list.filter(p => p.id !== mergeSource?.id && p.isActive !== false && p.status !== "INACTIVE");

  const confirmMerge = async () => {
    if (!mergeSource || !mergeTargetId || merging) return;
    setMerging(true);
    try {
      await fetchJson(api(`patients/${mergeSource.id}/merge`), {
        method: "POST",
        body: JSON.stringify({ targetPatientId: mergeTargetId }),
      });
      toast.success("╪¬┘à ╪»┘à╪¼ ╪º┘ä┘à╪▒┘è╪╢ ╪¿┘å╪¼╪º╪¡");
      setMergeSource(null);
      setMergeTargetId("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "┘ü╪┤┘ä ╪»┘à╪¼ ╪º┘ä┘à╪▒╪╢┘ë");
    } finally {
      setMerging(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä┘à╪▒╪╢┘ë</h2>
        <div className="flex gap-3">
          <div className="relative"><Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" /><input className="border dark:border-gray-600 rounded-lg pr-9 pl-3 py-2 text-sm w-48 dark:bg-gray-800 dark:text-gray-100" placeholder="╪¿╪¡╪½..." value={search} onChange={e => onSearchChange(e.target.value)} /></div>
          {sources.length > 0 && (
            <select className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
              <option value="">┘â┘ä ╪º┘ä┘à╪╡╪º╪»╪▒</option>
              {sources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {insuranceCompanies.length > 0 && (
            <select className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={insuranceFilter} onChange={e => setInsuranceFilter(e.target.value)}>
              <option value="">┘â┘ä ╪┤╪▒┘â╪º╪¬ ╪º┘ä╪¬╪ú┘à┘è┘å</option>
              {insuranceCompanies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <button onClick={() => onEdit({})} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" />╪Ñ╪╢╪º┘ü╪⌐ ┘à╪▒┘è╪╢</button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-center py-12 text-gray-400 dark:text-gray-500">┘ä╪º ┘è┘ê╪¼╪» ┘à╪▒╪╢┘ë</p>
      ) : (<>
        {/* Mobile cards */}
        <div className="block md:hidden space-y-3">
          {filtered.map(p => (
            <div key={p.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 ${!p.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div><h3 className="font-bold text-sm">{p.firstName} {p.lastName || ""}</h3><p className="text-xs text-gray-500 dark:text-gray-400">{GENDER_LABEL[p.gender || ""] || ""} {p.bloodType ? `┬╖ ┘ü╪╡┘è┘ä╪⌐ ${p.bloodType}` : ""}</p></div>
                <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${statusMeta(p.status).color}`}>{statusMeta(p.status).label}</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{p.phone ? <span dir="ltr">{p.phone}</span> : "ΓÇö"}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{p.insuranceNumber ? <span dir="ltr">╪▒┘é┘à ╪º┘ä╪¬╪ú┘à┘è┘å: {p.insuranceNumber}</span> : ""}{p.insuranceCompany?.name ? ` ┬╖ ${p.insuranceCompany.name}` : ""}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">╪º┘ä╪▓┘è╪º╪▒╪º╪¬: {p.visitCount ?? 0}</p>
              <div className="flex gap-2">
                <button onClick={() => onView(p.id)} className="text-xs px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"><Eye className="w-3.5 h-3.5 inline ml-1" />╪╣╪▒╪╢</button>
                <button onClick={() => navigate(`/admin/booking/patients/${p.id}`)} className="text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50"><ExternalLink className="w-3.5 h-3.5 inline ml-1" />╪╡┘ü╪¡╪⌐</button>
                <button onClick={() => onEdit(p)} className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"><Pencil className="w-3.5 h-3.5 inline ml-1" />╪¬╪╣╪»┘è┘ä</button>
                <button onClick={() => onToggleActive(p.id, p.isActive)} className={`text-xs px-3 py-1.5 rounded-lg ${p.isActive ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50" : "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50"}`}>{p.isActive ? "╪¬╪╣╪╖┘è┘ä" : "╪¬┘ü╪╣┘è┘ä"}</button>
                <button onClick={() => { setMergeTargetId(""); setMergeSource(p); }} className="text-xs px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50"><GitMerge className="w-3.5 h-3.5 inline ml-1" />╪»┘à╪¼</button>
                <button onClick={() => onDelete(p.id)} className="text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50"><Trash2 className="w-3.5 h-3.5 inline ml-1" />╪¡╪░┘ü</button>
              </div>
            </div>
          ))}
        </div>
        {/* Desktop table */}
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">{["╪º┘ä╪º╪│┘à", "╪º┘ä┘ç╪º╪¬┘ü", "╪º┘ä╪¼┘å╪│", "┘ü╪╡┘è┘ä╪⌐ ╪º┘ä╪»┘à", "╪▒┘é┘à ╪º┘ä╪¬╪ú┘à┘è┘å", "╪º┘ä╪▓┘è╪º╪▒╪º╪¬", "╪º┘ä╪¡╪º┘ä╪⌐", "╪º┘ä┘à╪╡╪»╪▒", ""].map(h => <th key={h} className="text-right py-3 px-4">{h}</th>)}</tr></thead>
            <tbody>{filtered.map(p => (
              <tr key={p.id} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm ${!p.isActive ? "opacity-60" : ""}`}>
                <td className="py-3 px-4 font-medium">{p.firstName} {p.lastName || ""}</td>
                <td className="py-3 px-4" dir="ltr">{p.phone || "ΓÇö"}</td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{GENDER_LABEL[p.gender || ""] || "ΓÇö"}</td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{p.bloodType || "ΓÇö"}</td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                  <span dir="ltr">{p.insuranceNumber || "ΓÇö"}</span>
                  {p.insuranceCompany?.name ? <div className="text-xs">{p.insuranceCompany.name}</div> : null}
                </td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{p.visitCount ?? 0}</td>
                <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${statusMeta(p.status).color}`}>{statusMeta(p.status).label}</span></td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{p.source || "ΓÇö"}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">
                    <button onClick={() => onView(p.id)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="╪╣╪▒╪╢ ╪º┘ä┘à┘ä┘ü"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => navigate(`/admin/booking/patients/${p.id}`)} className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded" title="┘ü╪¬╪¡ ╪╡┘ü╪¡╪⌐ ┘à╪│╪¬┘é┘ä╪⌐"><ExternalLink className="w-4 h-4" /></button>
                    <button onClick={() => onEdit(p)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="╪¬╪╣╪»┘è┘ä"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => { setMergeTargetId(""); setMergeSource(p); }} className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded" title="╪»┘à╪¼"><GitMerge className="w-4 h-4" /></button>
                    <button onClick={() => onToggleActive(p.id, p.isActive)} className={`p-1.5 rounded ${p.isActive ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" : "text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30"}`} title={p.isActive ? "╪¬╪╣╪╖┘è┘ä" : "╪¬┘ü╪╣┘è┘ä"}><Check className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="╪¡╪░┘ü"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </>)}
      {modalPatient !== undefined && <PatientModal patient={modalPatient} onClose={onModalClose} onSave={onSave} />}
      {mergeSource && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setMergeSource(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">╪»┘à╪¼ ┘à╪▒┘è╪╢</h3>
              <button onClick={() => setMergeSource(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">╪│┘è╪¬┘à ┘å┘é┘ä ┘à┘ê╪º╪╣┘è╪» ┘ê┘ü┘ê╪º╪¬┘è╪▒ <b>{mergeSource.firstName} {mergeSource.lastName || ""}</b> ╪Ñ┘ä┘ë ╪º┘ä┘à╪▒┘è╪╢ ╪º┘ä┘ç╪»┘ü ╪½┘à ╪¬╪╣╪╖┘è┘ä┘ç.</p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä┘à╪▒┘è╪╢ ╪º┘ä┘ç╪»┘ü *</label>
            <select className={MODAL_INPUT_CLS} value={mergeTargetId} onChange={e => setMergeTargetId(e.target.value)}>
              <option value="">╪º╪«╪¬╪▒ ╪º┘ä┘à╪▒┘è╪╢ ╪º┘ä┘ç╪»┘ü...</option>
              {candidates.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName || ""}{c.phone ? ` (${c.phone})` : ""}</option>)}
            </select>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setMergeSource(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">╪Ñ┘ä╪║╪º╪í</button>
              <button onClick={confirmMerge} disabled={!mergeTargetId || merging} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">╪¬╪ú┘â┘è╪» ╪º┘ä╪»┘à╪¼</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
