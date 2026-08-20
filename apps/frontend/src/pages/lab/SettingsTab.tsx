import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X as XMarkIcon, Search, FlaskConical, Settings } from "lucide-react";
import { api, getAuthHeaders, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, LabSampleType } from "./shared";

interface SampleTypeForm {
  id?: string;
  name: string;
  instructions: string;
  isActive: boolean;
}

export default function SettingsTab() {
  const [sampleTypes, setSampleTypes] = useState<LabSampleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const [modal, setModal] = useState<SampleTypeForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const requestRef = useRef(0);

  const loadSampleTypes = useCallback(async (quiet = false) => {
    const reqId = ++requestRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (includeInactive) params.set("includeInactive", "true");
      const qs = params.toString();
      const res = await fetch(`${api("sample-types")}${qs ? `&${qs}` : ""}`, { headers: getAuthHeaders() });
      const json = (await res.json()) as { success?: boolean; error?: string; message?: string; data?: LabSampleType[] };
      if (!json.success) throw new Error(json.error || json.message || "┘ü╪┤┘ä ╪º┘ä╪╣┘à┘ä┘è╪⌐");
      if (requestRef.current !== reqId) return;
      setSampleTypes(json.data || []);
    } catch (e: unknown) {
      if (requestRef.current !== reqId) return;
      if (!quiet) setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪ú┘å┘ê╪º╪╣ ╪º┘ä╪╣┘è┘å╪º╪¬");
    } finally {
      if (requestRef.current === reqId) setLoading(false);
    }
  }, [search, includeInactive]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    loadSampleTypes();
  }, [loadSampleTypes]);

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
    setModal({ name: "", instructions: "", isActive: true });
  };

  const openEdit = (sampleType: LabSampleType) => {
    setError(null);
    setModal({
      id: sampleType.id,
      name: sampleType.name,
      instructions: sampleType.instructions || "",
      isActive: sampleType.isActive,
    });
  };

  const save = async () => {
    if (!modal) return;
    if (saving) return;
    setError(null);
    if (!modal.name.trim()) { setError("╪º╪│┘à ┘å┘ê╪╣ ╪º┘ä╪╣┘è┘å╪⌐ ┘à╪╖┘ä┘ê╪¿"); return; }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: modal.name.trim(),
        instructions: modal.instructions.trim() || undefined,
      };
      if (modal.id) {
        await mutate(`sample-types/${modal.id}`, "PUT", { ...payload, isActive: modal.isActive });
      } else {
        await mutate("sample-types", "POST", payload);
      }
      setModal(null);
      await loadSampleTypes(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪º┘ä╪¡┘ü╪╕");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (sampleType: LabSampleType) => {
    if (removingId) return;
    if (!window.confirm(`╪¬╪ú┘â┘è╪» ╪¡╪░┘ü ┘å┘ê╪╣ ╪º┘ä╪╣┘è┘å╪⌐ "${sampleType.name}"╪ƒ`)) return;
    setRemovingId(sampleType.id);
    try {
      await mutate(`sample-types/${sampleType.id}`, "DELETE");
      await loadSampleTypes(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪░┘ü ┘å┘ê╪╣ ╪º┘ä╪╣┘è┘å╪⌐");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">╪ú┘å┘ê╪º╪╣ ╪º┘ä╪╣┘è┘å╪º╪¬ ┘ê╪¬╪╣┘ä┘è┘à╪º╪¬ ╪¬╪¼┘à┘è╪╣┘ç╪º</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />╪Ñ╪╢╪º┘ü╪⌐ ┘å┘ê╪╣ ╪╣┘è┘å╪⌐
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"><XMarkIcon className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h3 className="font-semibold">╪ú┘å┘ê╪º╪╣ ╪º┘ä╪╣┘è┘å╪º╪¬</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
              <input
                className={`${MODAL_INPUT_CLS} pr-9`}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="╪¿╪¡╪½ ╪¿╪º┘ä╪º╪│┘à..."
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={e => setIncludeInactive(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              ╪╣╪▒╪╢ ╪º┘ä┘à╪╣╪╖┘ä┘è┘å
            </label>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">╪¼╪º╪▒┘ì ╪º┘ä╪¬╪¡┘à┘è┘ä...</div>
        ) : sampleTypes.length === 0 ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500">
            <FlaskConical className="w-10 h-10 mx-auto mb-3" />
            {search ? "┘ä╪º ╪¬┘ê╪¼╪» ┘å╪¬╪º╪ª╪¼ ┘à╪╖╪º╪¿┘é╪⌐" : "┘ä╪º ╪¬┘ê╪¼╪» ╪ú┘å┘ê╪º╪╣ ╪╣┘è┘å╪º╪¬ ╪¿╪╣╪» ΓÇö ╪ú╪╢┘ü ╪ú┘ê┘ä ┘å┘ê╪╣ ╪╣┘è┘å╪⌐"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                  <th className="text-right py-3 px-4">╪º┘ä╪º╪│┘à</th>
                  <th className="text-right py-3 px-4">╪º┘ä╪¬╪╣┘ä┘è┘à╪º╪¬</th>
                  <th className="text-right py-3 px-4">╪º┘ä╪¡╪º┘ä╪⌐</th>
                  <th className="text-right py-3 px-4">╪Ñ╪¼╪▒╪º╪í</th>
                </tr>
              </thead>
              <tbody>
                {sampleTypes.map(s => (
                  <tr key={s.id} className="border-b dark:border-gray-700 last:border-b-0">
                    <td className="py-3 px-4 font-medium">{s.name}</td>
                    <td className="py-3 px-4">{s.instructions || "ΓÇö"}</td>
                    <td className="py-3 px-4">
                      {s.isActive ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">┘å╪┤╪╖</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">┘à╪╣╪╖┘ä</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(s)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="╪¬╪╣╪»┘è┘ä">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(s)} disabled={removingId !== null} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-40" title="╪¡╪░┘ü">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
        ╪│┘è╪¬┘à ╪Ñ╪╢╪º┘ü╪⌐ ╪º┘ä┘à╪▓┘è╪» ┘à┘å ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬ ┘ü┘è ╪º┘ä┘à╪▒╪º╪¡┘ä ╪º┘ä┘é╪º╪»┘à╪⌐: ╪º┘ä┘à╪▓╪º╪▒╪╣╪î ╪º┘ä╪▓┘è╪º╪▒╪º╪¬ ╪º┘ä┘à┘å╪▓┘ä┘è╪⌐╪î ╪º┘ä┘ü╪▒┘ê╪╣╪î ┘ê┘é┘ê╪º╪ª┘à ╪º┘ä╪ú╪│╪╣╪º╪▒.
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && setModal(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{modal.id ? "╪¬╪╣╪»┘è┘ä ┘å┘ê╪╣ ╪╣┘è┘å╪⌐" : "┘å┘ê╪╣ ╪╣┘è┘å╪⌐ ╪¼╪»┘è╪»"}</h3>
              <button onClick={() => !saving && setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º╪│┘à ┘å┘ê╪╣ ╪º┘ä╪╣┘è┘å╪⌐ *</label>
                <input className={MODAL_INPUT_CLS} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} placeholder="┘à╪½╪º┘ä: ╪»┘à ┘ê╪▒┘è╪»┘è" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪¬╪╣┘ä┘è┘à╪º╪¬ ╪º┘ä╪¬╪¼┘à┘è╪╣</label>
                <textarea
                  className={`${MODAL_INPUT_CLS} min-h-[100px] resize-y`}
                  value={modal.instructions}
                  onChange={e => setModal({ ...modal, instructions: e.target.value })}
                  placeholder="┘à╪½╪º┘ä: ┘è╪ñ╪«╪░ ╪╣┘ä┘ë ┘à╪╣╪»╪⌐ ┘ü╪º╪▒╪║╪⌐╪î ╪¿╪¬╪▒┘â┘è╪▓ ┘à┘å 8 ╪Ñ┘ä┘ë 12 ╪│╪º╪╣╪⌐"
                />
              </div>
              {modal.id && (
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={modal.isActive} onChange={e => setModal({ ...modal, isActive: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                  ┘à┘ü╪╣┘æ┘ä
                </label>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">╪Ñ┘ä╪║╪º╪í</button>
              <button onClick={save} disabled={saving || !modal.name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? "╪¼╪º╪▒┘ì ╪º┘ä╪¡┘ü╪╕..." : "╪¡┘ü╪╕"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
