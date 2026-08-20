import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X as XMarkIcon, Search, ChevronRight, ChevronLeft, Home, CheckCircle2 } from "lucide-react";
import { api, getAuthHeaders, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, CULTURE_STATUS, LabHomeVisit } from "./shared";

interface VisitForm {
  id?: string;
  patientName: string;
  phone: string;
  address: string;
  visitDate: string;
  status: string;
  notes: string;
}

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  DONE: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const pad = (n: number) => String(n).padStart(2, "0");

const toDatetimeLocal = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDate = (iso?: string): string => {
  if (!iso) return "ΓÇö";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "ΓÇö";
  return d.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
};

export default function HomeVisitsTab() {
  const [visits, setVisits] = useState<LabHomeVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const [modal, setModal] = useState<VisitForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const requestRef = useRef(0);

  const loadVisits = useCallback(async (quiet = false) => {
    const reqId = ++requestRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const res = await fetch(`${api("home-visits")}&${params.toString()}`, { headers: getAuthHeaders() });
      const json = (await res.json()) as { success?: boolean; error?: string; message?: string; data?: LabHomeVisit[]; total?: number; page?: number };
      if (!json.success) throw new Error(json.error || json.message || "┘ü╪┤┘ä ╪º┘ä╪╣┘à┘ä┘è╪⌐");
      if (requestRef.current !== reqId) return;
      setVisits(json.data || []);
      setTotal(json.total ?? 0);
      if (json.page) setPage(json.page);
    } catch (e: unknown) {
      if (requestRef.current !== reqId) return;
      if (!quiet) setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä╪▓┘è╪º╪▒╪º╪¬ ╪º┘ä┘à┘å╪▓┘ä┘è╪⌐");
    } finally {
      if (requestRef.current === reqId) setLoading(false);
    }
  }, [page, limit, search, status]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  const mutate = async (path: string, method: string, body?: Record<string, unknown>) => {
    const res = await fetch(api(path), {
      method,
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || data.message || "┘ü╪┤┘ä╪¬ ╪º┘ä╪╣┘à┘ä┘è╪⌐");
    return data.data;
  };

  const openCreate = () => {
    setError(null);
    setModal({ patientName: "", phone: "", address: "", visitDate: "", status: "SCHEDULED", notes: "" });
  };

  const openEdit = (visit: LabHomeVisit) => {
    setError(null);
    setModal({
      id: visit.id,
      patientName: visit.patientName,
      phone: visit.phone || "",
      address: visit.address || "",
      visitDate: toDatetimeLocal(visit.visitDate),
      status: visit.status || "SCHEDULED",
      notes: visit.notes || "",
    });
  };

  const save = async () => {
    if (!modal) return;
    if (saving) return;
    setError(null);
    if (!modal.patientName.trim()) { setError("╪º╪│┘à ╪º┘ä┘à╪▒┘è╪╢ ┘à╪╖┘ä┘ê╪¿"); return; }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        patientName: modal.patientName.trim(),
        phone: modal.phone.trim() || undefined,
        address: modal.address.trim() || undefined,
        visitDate: modal.visitDate || undefined,
        status: modal.status,
        notes: modal.notes.trim() || undefined,
      };
      if (modal.id) {
        await mutate(`home-visits/${modal.id}`, "PUT", payload);
      } else {
        await mutate("home-visits", "POST", payload);
      }
      setModal(null);
      await loadVisits(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪º┘ä╪¡┘ü╪╕");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (visit: LabHomeVisit) => {
    if (removingId) return;
    if (!window.confirm(`╪¬╪ú┘â┘è╪» ╪¡╪░┘ü ╪º┘ä╪▓┘è╪º╪▒╪⌐ ┘ä┘ä┘à╪▒┘è╪╢ "${visit.patientName}"╪ƒ`)) return;
    setRemovingId(visit.id);
    try {
      await mutate(`home-visits/${visit.id}`, "DELETE");
      await loadVisits(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪░┘ü ╪º┘ä╪▓┘è╪º╪▒╪⌐");
    } finally {
      setRemovingId(null);
    }
  };

  const markDone = async (visit: LabHomeVisit) => {
    if (doneId) return;
    setDoneId(visit.id);
    try {
      await mutate(`home-visits/${visit.id}`, "PUT", { status: "DONE" });
      await loadVisits(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬╪¡╪»┘è╪½ ╪º┘ä╪▓┘è╪º╪▒╪⌐");
    } finally {
      setDoneId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">╪º┘ä╪▓┘è╪º╪▒╪º╪¬ ╪º┘ä┘à┘å╪▓┘ä┘è╪⌐</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">╪¼╪»┘ê┘ä╪⌐ ┘ê┘à╪¬╪º╪¿╪╣╪⌐ ╪│╪¡╪¿ ╪º┘ä╪╣┘è┘å╪º╪¬ ┘à┘å ┘à┘å╪▓┘ä ╪º┘ä┘à╪▒┘è╪╢</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />╪Ñ╪╢╪º┘ü╪⌐ ╪▓┘è╪º╪▒╪⌐
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"><XMarkIcon className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
          <input
            className={`${MODAL_INPUT_CLS} pr-9`}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="╪¿╪¡╪½ ╪¿╪º╪│┘à ╪º┘ä┘à╪▒┘è╪╢ ╪ú┘ê ╪º┘ä┘ç╪º╪¬┘ü..."
          />
        </div>
        <select className={`${MODAL_INPUT_CLS} w-auto`} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">┘â┘ä ╪º┘ä╪¡╪º┘ä╪º╪¬</option>
          <option value="SCHEDULED">{CULTURE_STATUS["SCHEDULED"]}</option>
          <option value="DONE">{CULTURE_STATUS["DONE"]}</option>
          <option value="CANCELLED">{CULTURE_STATUS["CANCELLED"]}</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">╪¼╪º╪▒┘ì ╪º┘ä╪¬╪¡┘à┘è┘ä...</div>
      ) : visits.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
          <Home className="w-10 h-10 mx-auto mb-3" />
          {search || status ? "┘ä╪º ╪¬┘ê╪¼╪» ┘å╪¬╪º╪ª╪¼ ┘à╪╖╪º╪¿┘é╪⌐" : "┘ä╪º ╪¬┘ê╪¼╪» ╪▓┘è╪º╪▒╪º╪¬ ┘à┘å╪▓┘ä┘è╪⌐ ╪¿╪╣╪» ΓÇö ╪ú╪╢┘ü ╪ú┘ê┘ä ╪▓┘è╪º╪▒╪⌐"}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                  <th className="text-right py-3 px-4">┘à╪▒┘è╪╢</th>
                  <th className="text-right py-3 px-4">┘ç╪º╪¬┘ü</th>
                  <th className="text-right py-3 px-4">╪╣┘å┘ê╪º┘å</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">┘à┘ê╪╣╪»</th>
                  <th className="text-right py-3 px-4">╪¡╪º┘ä╪⌐</th>
                  <th className="text-right py-3 px-4">┘à╪▒╪º╪¼╪╣╪⌐</th>
                  <th className="text-right py-3 px-4">╪Ñ╪¼╪▒╪º╪í</th>
                </tr>
              </thead>
              <tbody>
                {visits.map(v => (
                  <tr key={v.id} className="border-b dark:border-gray-700 last:border-b-0">
                    <td className="py-3 px-4 font-medium">{v.patientName}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{v.phone || "ΓÇö"}</td>
                    <td className="py-3 px-4">{v.address || "ΓÇö"}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{formatDate(v.visitDate)}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[v.status] || STATUS_STYLES["SCHEDULED"]}`}>
                        {CULTURE_STATUS[v.status as keyof typeof CULTURE_STATUS] || v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {v.reviewed ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">╪¬┘à╪¬ ╪º┘ä┘à╪▒╪º╪¼╪╣╪⌐</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">┘ä┘à ╪¬┘Å╪▒╪º╪¼╪╣</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        {v.status !== "DONE" && (
                          <button onClick={() => markDone(v)} disabled={doneId !== null} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg disabled:opacity-40" title="╪¬┘à╪¬">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => openEdit(v)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="╪¬╪╣╪»┘è┘ä">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(v)} disabled={removingId !== null} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-40" title="╪¡╪░┘ü">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
            <span>╪╣╪▒╪╢ {visits.length} ┘à┘å {total} ╪▓┘è╪º╪▒╪⌐</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600"
              >
                <ChevronRight className="w-4 h-4" />╪º┘ä╪│╪º╪¿┘é
              </button>
              <span className="px-2">╪╡┘ü╪¡╪⌐ {page} ┘à┘å {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600"
              >
                ╪º┘ä╪¬╪º┘ä┘è<ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && setModal(null)}>
          <div className={`${MODAL_CONTENT_CLS} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{modal.id ? "╪¬╪╣╪»┘è┘ä ╪▓┘è╪º╪▒╪⌐" : "╪▓┘è╪º╪▒╪⌐ ╪¼╪»┘è╪»╪⌐"}</h3>
              <button onClick={() => !saving && setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º╪│┘à ╪º┘ä┘à╪▒┘è╪╢ *</label>
                <input className={MODAL_INPUT_CLS} value={modal.patientName} onChange={e => setModal({ ...modal, patientName: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä┘ç╪º╪¬┘ü</label>
                  <input className={MODAL_INPUT_CLS} value={modal.phone} onChange={e => setModal({ ...modal, phone: e.target.value })} placeholder="┘à╪½╪º┘ä: 01001234567" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">┘à┘ê╪╣╪» ╪º┘ä╪▓┘è╪º╪▒╪⌐</label>
                  <input type="datetime-local" className={MODAL_INPUT_CLS} value={modal.visitDate} onChange={e => setModal({ ...modal, visitDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä╪╣┘å┘ê╪º┘å</label>
                <input className={MODAL_INPUT_CLS} value={modal.address} onChange={e => setModal({ ...modal, address: e.target.value })} placeholder="╪╣┘å┘ê╪º┘å ╪º┘ä┘à┘å╪▓┘ä" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä╪¡╪º┘ä╪⌐</label>
                  <select className={MODAL_INPUT_CLS} value={modal.status} onChange={e => setModal({ ...modal, status: e.target.value })}>
                    <option value="SCHEDULED">{CULTURE_STATUS["SCHEDULED"]}</option>
                    <option value="DONE">{CULTURE_STATUS["DONE"]}</option>
                    <option value="CANCELLED">{CULTURE_STATUS["CANCELLED"]}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">┘à┘ä╪º╪¡╪╕╪º╪¬</label>
                <textarea className={`${MODAL_INPUT_CLS} min-h-[80px]`} value={modal.notes} onChange={e => setModal({ ...modal, notes: e.target.value })} placeholder="┘à┘ä╪º╪¡╪╕╪º╪¬ ╪¡┘ê┘ä ╪º┘ä╪▓┘è╪º╪▒╪⌐..." />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">╪Ñ┘ä╪║╪º╪í</button>
              <button onClick={save} disabled={saving || !modal.patientName.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? "╪¼╪º╪▒┘ì ╪º┘ä╪¡┘ü╪╕..." : "╪¡┘ü╪╕"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
