import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X as XMarkIcon, Search, FileText } from "lucide-react";
import { api, getAuthHeaders, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, LabContract } from "./shared";

const DISCOUNT_TYPES = [
  { value: "PERCENTAGE", label: "┘å╪│╪¿╪⌐ ┘à╪ª┘ê┘è╪⌐" },
  { value: "CUSTOM", label: "╪│╪╣╪▒ ┘à╪«╪╡╪╡" },
  { value: "NONE", label: "╪¿╪»┘ê┘å ╪«╪╡┘à" },
];

const discountLabel = (type: string) =>
  DISCOUNT_TYPES.find(d => d.value === type)?.label || type || "ΓÇö";

interface ContractForm {
  id?: string;
  name: string;
  region: string;
  governorate: string;
  discountType: string;
  discountPercent: string;
  externalSample: boolean;
  isActive: boolean;
}

export default function ContractsTab() {
  const [contracts, setContracts] = useState<LabContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const [modal, setModal] = useState<ContractForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const requestRef = useRef(0);

  const loadContracts = useCallback(async (quiet = false) => {
    const reqId = ++requestRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (includeInactive) params.set("includeInactive", "true");
      const qs = params.toString();
      const res = await fetch(`${api("contracts")}${qs ? `&${qs}` : ""}`, { headers: getAuthHeaders() });
      const json = (await res.json()) as { success?: boolean; error?: string; message?: string; data?: LabContract[] };
      if (!json.success) throw new Error(json.error || json.message || "┘ü╪┤┘ä ╪º┘ä╪╣┘à┘ä┘è╪⌐");
      if (requestRef.current !== reqId) return;
      setContracts(json.data || []);
    } catch (e: unknown) {
      if (requestRef.current !== reqId) return;
      if (!quiet) setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä╪¬╪╣╪º┘é╪»╪º╪¬");
    } finally {
      if (requestRef.current === reqId) setLoading(false);
    }
  }, [search, includeInactive]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

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
    setModal({ name: "", region: "", governorate: "", discountType: "PERCENTAGE", discountPercent: "0", externalSample: false, isActive: true });
  };

  const openEdit = (c: LabContract) => {
    setError(null);
    setModal({
      id: c.id,
      name: c.name,
      region: c.region || "",
      governorate: c.governorate || "",
      discountType: c.discountType,
      discountPercent: String(c.discountPercent ?? 0),
      externalSample: c.externalSample,
      isActive: c.isActive,
    });
  };

  const save = async () => {
    if (!modal || saving) return;
    setError(null);
    if (!modal.name.trim()) { setError("╪º╪│┘à ╪º┘ä╪¬╪╣╪º┘é╪» ┘à╪╖┘ä┘ê╪¿"); return; }
    const percent = Number(modal.discountPercent);
    if (modal.discountPercent !== "" && (Number.isNaN(percent) || percent < 0 || percent > 100)) {
      setError("╪º┘ä┘å╪│╪¿╪⌐ ┘è╪¼╪¿ ╪ú┘å ╪¬┘â┘ê┘å ╪¿┘è┘å 0 ┘ê 100");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: modal.name.trim(),
        region: modal.region.trim() || undefined,
        governorate: modal.governorate.trim() || undefined,
        discountType: modal.discountType,
        discountPercent: percent,
        externalSample: modal.externalSample,
      };
      if (modal.id) {
        await mutate(`contracts/${modal.id}`, "PUT", { ...payload, isActive: modal.isActive });
      } else {
        await mutate("contracts", "POST", payload);
      }
      setModal(null);
      await loadContracts(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪º┘ä╪¡┘ü╪╕");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: LabContract) => {
    if (removingId) return;
    if (!window.confirm(`╪¬╪ú┘â┘è╪» ╪¡╪░┘ü ╪º┘ä╪¬╪╣╪º┘é╪» "${c.name}"╪ƒ`)) return;
    setRemovingId(c.id);
    try {
      await mutate(`contracts/${c.id}`, "DELETE");
      await loadContracts(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪░┘ü ╪º┘ä╪¬╪╣╪º┘é╪»");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">╪º┘ä╪¬╪╣╪º┘é╪»╪º╪¬</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">╪º┘ä╪┤╪▒┘â╪º╪¬ ┘ê╪º┘ä┘à╪╣╪º┘à┘ä ╪º┘ä╪«╪º╪▒╪¼┘è╪⌐ ╪º┘ä╪╖╪º┘ä╪¿╪⌐ ┘ä┘ä╪¬╪¡╪º┘ä┘è┘ä ┘à╪╣ ┘å┘ê╪╣ ╪º┘ä╪«╪╡┘à</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />╪Ñ╪╢╪º┘ü╪⌐ ╪¬╪╣╪º┘é╪»
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
            placeholder="╪¿╪¡╪½ ╪¿╪º┘ä╪º╪│┘à ╪ú┘ê ╪º┘ä┘à┘å╪╖┘é╪⌐..."
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

      {loading ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">╪¼╪º╪▒┘ì ╪º┘ä╪¬╪¡┘à┘è┘ä...</div>
      ) : contracts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-3" />
          {search ? "┘ä╪º ╪¬┘ê╪¼╪» ┘å╪¬╪º╪ª╪¼ ┘à╪╖╪º╪¿┘é╪⌐" : "┘ä╪º ╪¬┘ê╪¼╪» ╪¬╪╣╪º┘é╪»╪º╪¬ ╪¿╪╣╪» ΓÇö ╪ú╪╢┘ü ╪ú┘ê┘ä ╪¬╪╣╪º┘é╪»"}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                  <th className="text-right py-3 px-4">╪º╪│┘à</th>
                  <th className="text-right py-3 px-4">╪º┘ä┘à┘å╪╖┘é╪⌐</th>
                  <th className="text-right py-3 px-4">╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">┘å┘ê╪╣ ╪º┘ä╪«╪╡┘à</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">╪º┘ä┘å╪│╪¿╪⌐</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">╪º╪│╪¬┘ä╪º┘à ╪«╪º╪▒╪¼┘è</th>
                  <th className="text-right py-3 px-4">╪¡╪º┘ä╪⌐</th>
                  <th className="text-right py-3 px-4">╪Ñ╪¼╪▒╪º╪í</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => (
                  <tr key={c.id} className="border-b dark:border-gray-700 last:border-b-0">
                    <td className="py-3 px-4 font-medium">{c.name}</td>
                    <td className="py-3 px-4">{c.region || "ΓÇö"}</td>
                    <td className="py-3 px-4">{c.governorate || "ΓÇö"}</td>
                    <td className="py-3 px-4">{discountLabel(c.discountType)}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {c.discountType === "PERCENTAGE" ? `${c.discountPercent ?? 0}%` : "ΓÇö"}
                    </td>
                    <td className="py-3 px-4">
                      {c.externalSample ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">┘å╪╣┘à</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">┘ä╪º</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {c.isActive ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">┘å╪┤╪╖</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">┘à╪╣╪╖┘ä</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="╪¬╪╣╪»┘è┘ä">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(c)} disabled={removingId !== null} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-40" title="╪¡╪░┘ü">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && setModal(null)}>
          <div className={`${MODAL_CONTENT_CLS}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{modal.id ? "╪¬╪╣╪»┘è┘ä ╪¬╪╣╪º┘é╪»" : "╪¬╪╣╪º┘é╪» ╪¼╪»┘è╪»"}</h3>
              <button onClick={() => !saving && setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º╪│┘à ╪º┘ä╪¬╪╣╪º┘é╪» *</label>
                <input className={MODAL_INPUT_CLS} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} placeholder="┘à╪½╪º┘ä: ╪┤╪▒┘â╪⌐ ╪º┘ä╪ú┘à┘ä ┘ä┘ä┘à┘é╪º┘ê┘ä╪º╪¬" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä┘à┘å╪╖┘é╪⌐</label>
                  <input className={MODAL_INPUT_CLS} value={modal.region} onChange={e => setModal({ ...modal, region: e.target.value })} placeholder="┘à╪½╪º┘ä: ┘à╪»┘è┘å╪⌐ ┘å╪╡╪▒" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐</label>
                  <input className={MODAL_INPUT_CLS} value={modal.governorate} onChange={e => setModal({ ...modal, governorate: e.target.value })} placeholder="┘à╪½╪º┘ä: ╪º┘ä┘é╪º┘ç╪▒╪⌐" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">┘å┘ê╪╣ ╪º┘ä╪«╪╡┘à</label>
                  <select className={MODAL_INPUT_CLS} value={modal.discountType} onChange={e => setModal({ ...modal, discountType: e.target.value })}>
                    {DISCOUNT_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä┘å╪│╪¿╪⌐ (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={MODAL_INPUT_CLS}
                    value={modal.discountPercent}
                    onChange={e => setModal({ ...modal, discountPercent: e.target.value })}
                    disabled={modal.discountType === "NONE"}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={modal.externalSample}
                  onChange={e => setModal({ ...modal, externalSample: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                ╪º╪│╪¬┘ä╪º┘à ╪º┘ä╪╣┘è┘å╪⌐ ┘à┘å ╪¼┘ç╪⌐ ╪«╪º╪▒╪¼┘è╪⌐ (┘à╪╣┘à┘ä ╪Ñ┘ä┘ë ┘à╪╣┘à┘ä)
              </label>
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
