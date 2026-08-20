import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X as XMarkIcon, Search, ChevronRight, ChevronLeft, FlaskConical } from "lucide-react";
import { api, fetchJson, getAuthHeaders, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, LabTest } from "./shared";

interface TestRow extends LabTest {
  parameterCount?: number;
}

interface ParameterForm {
  name: string;
  unit: string;
  referenceRange: string;
  resultOptions: string;
  showFlag: boolean;
  sortOrder: number;
}

interface TestForm {
  id?: string;
  name: string;
  category: string;
  abbreviation: string;
  sampleType: string;
  price: string;
  isActive: boolean;
  parameters: ParameterForm[];
}

const emptyParameter = (sortOrder: number): ParameterForm => ({
  name: "",
  unit: "",
  referenceRange: "",
  resultOptions: "",
  showFlag: true,
  sortOrder,
});

const parseOptions = (value: string): string[] =>
  value.split(",").map(s => s.trim()).filter(Boolean);

export default function TestsTab() {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const [modal, setModal] = useState<TestForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingLoading, setEditingLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const requestRef = useRef(0);

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchJson<TestRow[]>(`${api("tests")}&limit=200&includeInactive=true`);
      const seen = new Map<string, boolean>();
      for (const t of data || []) {
        if (t.category) seen.set(t.category, true);
      }
      setCategories(Array.from(seen.keys()).sort((a, b) => a.localeCompare(b, "ar")));
    } catch {
      setCategories([]);
    }
  }, []);

  const loadTests = useCallback(async (quiet = false) => {
    const reqId = ++requestRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (includeInactive) params.set("includeInactive", "true");
      const res = await fetch(`${api("tests")}&${params.toString()}`, { headers: getAuthHeaders() });
      const json = (await res.json()) as { success?: boolean; error?: string; message?: string; data?: TestRow[]; total?: number; page?: number };
      if (!json.success) throw new Error(json.error || json.message || "┘ü╪┤┘ä ╪º┘ä╪╣┘à┘ä┘è╪⌐");
      if (requestRef.current !== reqId) return;
      setTests(json.data || []);
      setTotal(json.total ?? 0);
      if (json.page) setPage(json.page);
    } catch (e: unknown) {
      if (requestRef.current !== reqId) return;
      if (!quiet) setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä╪º╪«╪¬╪¿╪º╪▒╪º╪¬");
    } finally {
      if (requestRef.current === reqId) setLoading(false);
    }
  }, [page, limit, search, category, includeInactive]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, category, includeInactive]);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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

  const refreshAll = async (quiet = false) => {
    await Promise.all([loadTests(quiet), loadCategories()]);
  };

  const openCreate = () => {
    setError(null);
    setModal({
      name: "",
      category: "",
      abbreviation: "",
      sampleType: "",
      price: "",
      isActive: true,
      parameters: [],
    });
  };

  const openEdit = async (test: TestRow) => {
    setEditingLoading(true);
    setError(null);
    try {
      const full = await fetchJson<LabTest>(api(`tests/${test.id}`));
      const params = (full.parameters || [])
        .filter(p => p.isActive !== false)
        .map(p => ({
          name: p.name,
          unit: p.unit || "",
          referenceRange: p.referenceRange || "",
          resultOptions: Array.isArray(p.resultOptions) ? p.resultOptions.join(", ") : typeof p.resultOptions === "string" ? p.resultOptions : "",
          showFlag: p.showFlag !== false,
          sortOrder: p.sortOrder,
        }));
      setModal({
        id: full.id,
        name: full.name,
        category: full.category || "",
        abbreviation: full.abbreviation || "",
        sampleType: full.sampleType || "",
        price: String(full.price ?? 0),
        isActive: full.isActive,
        parameters: params,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä╪º╪«╪¬╪¿╪º╪▒");
    } finally {
      setEditingLoading(false);
    }
  };

  const save = async () => {
    if (!modal) return;
    if (saving) return;
    setError(null);
    if (!modal.name.trim()) { setError("╪º╪│┘à ╪º┘ä╪º╪«╪¬╪¿╪º╪▒ ┘à╪╖┘ä┘ê╪¿"); return; }
    const price = Number(modal.price);
    if (modal.price !== "" && (Number.isNaN(price) || price < 0)) { setError("╪º┘ä╪│╪╣╪▒ ╪║┘è╪▒ ╪╡╪¡┘è╪¡"); return; }

    const parameters = modal.parameters
      .filter(p => p.name.trim() !== "")
      .map((p, i) => ({
        name: p.name.trim(),
        unit: p.unit.trim() || undefined,
        referenceRange: p.referenceRange.trim() || undefined,
        resultOptions: parseOptions(p.resultOptions),
        showFlag: p.showFlag,
        sortOrder: p.sortOrder || i,
      }));

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: modal.name.trim(),
        category: modal.category.trim() || undefined,
        abbreviation: modal.abbreviation.trim() || undefined,
        sampleType: modal.sampleType.trim() || undefined,
        price,
        parameters,
      };
      if (modal.id) {
        await mutate(`tests/${modal.id}`, "PUT", { ...payload, isActive: modal.isActive });
      } else {
        await mutate("tests", "POST", payload);
      }
      setModal(null);
      await refreshAll(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪º┘ä╪¡┘ü╪╕");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (test: TestRow) => {
    if (removingId) return;
    if (!window.confirm(`╪¬╪ú┘â┘è╪» ╪¡╪░┘ü ╪º┘ä╪º╪«╪¬╪¿╪º╪▒ "${test.name}"╪ƒ`)) return;
    setRemovingId(test.id);
    try {
      await mutate(`tests/${test.id}`, "DELETE");
      await refreshAll(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪░┘ü ╪º┘ä╪º╪«╪¬╪¿╪º╪▒");
    } finally {
      setRemovingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (editingLoading) {
    return <div className="text-center py-16 text-gray-400 dark:text-gray-500">╪¼╪º╪▒┘ì ╪º┘ä╪¬╪¡┘à┘è┘ä...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">┘â╪¬╪º┘ä┘ê╪¼ ╪º┘ä╪º╪«╪¬╪¿╪º╪▒╪º╪¬</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä╪º╪«╪¬╪¿╪º╪▒╪º╪¬ ┘ê╪º┘ä╪¿╪º╪▒╪º┘à┘è╪¬╪▒╪º╪¬ ┘ê┘à╪»╪º┘ç╪º ╪º┘ä┘à╪▒╪¼╪╣┘è</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />╪Ñ╪╢╪º┘ü╪⌐ ╪º╪«╪¬╪¿╪º╪▒
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
            placeholder="╪¿╪¡╪½ ╪¿╪º┘ä╪º╪│┘à ╪ú┘ê ╪º┘ä┘ü╪ª╪⌐ ╪ú┘ê ╪º┘ä╪º╪«╪¬╪╡╪º╪▒..."
          />
        </div>
        <select className={`${MODAL_INPUT_CLS} w-auto`} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">┘â┘ä ╪º┘ä┘ü╪ª╪º╪¬</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
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
      ) : tests.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
          <FlaskConical className="w-10 h-10 mx-auto mb-3" />
          {search || category ? "┘ä╪º ╪¬┘ê╪¼╪» ┘å╪¬╪º╪ª╪¼ ┘à╪╖╪º╪¿┘é╪⌐" : "┘ä╪º ╪¬┘ê╪¼╪» ╪º╪«╪¬╪¿╪º╪▒╪º╪¬ ╪¿╪╣╪» ΓÇö ╪ú╪╢┘ü ╪ú┘ê┘ä ╪º╪«╪¬╪¿╪º╪▒"}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                  <th className="text-right py-3 px-4">╪º╪│┘à</th>
                  <th className="text-right py-3 px-4">╪º┘ä┘ü╪ª╪⌐</th>
                  <th className="text-right py-3 px-4">╪º┘ä╪º╪«╪¬╪╡╪º╪▒</th>
                  <th className="text-right py-3 px-4">┘å┘ê╪╣ ╪º┘ä╪╣┘è┘å╪⌐</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">╪º┘ä╪│╪╣╪▒</th>
                  <th className="text-right py-3 px-4">#╪¿╪º╪▒╪º┘à┘è╪¬╪▒╪º╪¬</th>
                  <th className="text-right py-3 px-4">╪¡╪º┘ä╪⌐</th>
                  <th className="text-right py-3 px-4">╪Ñ╪¼╪▒╪º╪í</th>
                </tr>
              </thead>
              <tbody>
                {tests.map(t => (
                  <tr key={t.id} className="border-b dark:border-gray-700 last:border-b-0">
                    <td className="py-3 px-4 font-medium">{t.name}</td>
                    <td className="py-3 px-4">{t.category || "ΓÇö"}</td>
                    <td className="py-3 px-4">{t.abbreviation || "ΓÇö"}</td>
                    <td className="py-3 px-4">{t.sampleType || "ΓÇö"}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{t.price ?? 0} ╪¼.┘à</td>
                    <td className="py-3 px-4">{t.parameterCount ?? 0}</td>
                    <td className="py-3 px-4">
                      {t.isActive ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">┘å╪┤╪╖</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">┘à╪╣╪╖┘ä</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(t)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="╪¬╪╣╪»┘è┘ä">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(t)} disabled={removingId !== null} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-40" title="╪¡╪░┘ü">
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
            <span>╪╣╪▒╪╢ {tests.length} ┘à┘å {total} ╪º╪«╪¬╪¿╪º╪▒</span>
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
              <h3 className="text-lg font-bold">{modal.id ? "╪¬╪╣╪»┘è┘ä ╪º╪«╪¬╪¿╪º╪▒" : "╪º╪«╪¬╪¿╪º╪▒ ╪¼╪»┘è╪»"}</h3>
              <button onClick={() => !saving && setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º╪│┘à ╪º┘ä╪º╪«╪¬╪¿╪º╪▒ *</label>
                <input className={MODAL_INPUT_CLS} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä┘ü╪ª╪⌐</label>
                  <input className={MODAL_INPUT_CLS} value={modal.category} onChange={e => setModal({ ...modal, category: e.target.value })} placeholder="┘à╪½╪º┘ä: ╪»┘à╪î ┘â┘è┘à┘è╪º╪í" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä╪º╪«╪¬╪╡╪º╪▒</label>
                  <input className={MODAL_INPUT_CLS} value={modal.abbreviation} onChange={e => setModal({ ...modal, abbreviation: e.target.value })} placeholder="┘à╪½╪º┘ä: CBC" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">┘å┘ê╪╣ ╪º┘ä╪╣┘è┘å╪⌐</label>
                  <input className={MODAL_INPUT_CLS} value={modal.sampleType} onChange={e => setModal({ ...modal, sampleType: e.target.value })} placeholder="┘à╪½╪º┘ä: ╪»┘à ┘ê╪▒┘è╪»┘è" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä╪│╪╣╪▒ (╪¼.┘à)</label>
                  <input type="number" min={0} className={MODAL_INPUT_CLS} value={modal.price} onChange={e => setModal({ ...modal, price: e.target.value })} />
                </div>
              </div>

              <div className="border-t dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm">╪º┘ä╪¿╪º╪▒╪º┘à┘è╪¬╪▒╪º╪¬</h4>
                  <button
                    onClick={() => setModal({ ...modal, parameters: [...modal.parameters, emptyParameter(modal.parameters.length)] })}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 border dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <Plus className="w-4 h-4" />╪Ñ╪╢╪º┘ü╪⌐ ╪¿╪º╪▒╪º┘à┘è╪¬╪▒
                  </button>
                </div>

                {modal.parameters.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center border border-dashed dark:border-gray-700 rounded-lg">
                    ┘ä╪º ╪¬┘ê╪¼╪» ╪¿╪º╪▒╪º┘à┘è╪¬╪▒╪º╪¬ ╪¿╪╣╪»
                  </p>
                ) : (
                  <div className="space-y-3">
                    {modal.parameters.map((p, i) => (
                      <div key={i} className="border dark:border-gray-700 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">╪º┘ä╪¿╪º╪▒╪º┘à┘è╪¬╪▒ {i + 1}</span>
                          <button
                            onClick={() => setModal({ ...modal, parameters: modal.parameters.filter((_, idx) => idx !== i) })}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                            title="╪Ñ╪▓╪º┘ä╪⌐ ╪º┘ä╪¿╪º╪▒╪º┘à┘è╪¬╪▒"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">╪º╪│┘à ╪º┘ä╪¿╪º╪▒╪º┘à┘è╪¬╪▒ *</label>
                          <input
                            className={MODAL_INPUT_CLS}
                            value={p.name}
                            onChange={e => setModal({ ...modal, parameters: modal.parameters.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x) })}
                            placeholder="┘à╪½╪º┘ä: ┘ç┘è┘à┘ê╪¼┘ä┘ê╪¿┘è┘å"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">╪º┘ä┘ê╪¡╪»╪⌐</label>
                            <input className={MODAL_INPUT_CLS} value={p.unit} onChange={e => setModal({ ...modal, parameters: modal.parameters.map((x, idx) => idx === i ? { ...x, unit: e.target.value } : x) })} placeholder="┘à╪½╪º┘ä: g/dL" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">╪º┘ä┘à╪»┘ë ╪º┘ä┘à╪▒╪¼╪╣┘è</label>
                            <input className={MODAL_INPUT_CLS} value={p.referenceRange} onChange={e => setModal({ ...modal, parameters: modal.parameters.map((x, idx) => idx === i ? { ...x, referenceRange: e.target.value } : x) })} placeholder="┘à╪½╪º┘ä: 13-17" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">╪«┘è╪º╪▒╪º╪¬ ╪º┘ä┘å╪¬╪º╪ª╪¼ (┘à┘ü╪╡┘ê┘ä╪⌐ ╪¿┘ü╪º╪╡┘ä╪⌐)</label>
                          <input className={MODAL_INPUT_CLS} value={p.resultOptions} onChange={e => setModal({ ...modal, parameters: modal.parameters.map((x, idx) => idx === i ? { ...x, resultOptions: e.target.value } : x) })} placeholder="┘à╪½╪º┘ä: ╪│╪º┘ä╪¿, ┘à┘ê╪¼╪¿" />
                        </div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={p.showFlag}
                            onChange={e => setModal({ ...modal, parameters: modal.parameters.map((x, idx) => idx === i ? { ...x, showFlag: e.target.checked } : x) })}
                            className="rounded border-gray-300 dark:border-gray-600"
                          />
                          ╪Ñ╪╕┘ç╪º╪▒ ╪¬┘é┘è┘è┘à ╪º┘ä┘å╪¬┘è╪¼╪⌐ (┘à╪▒╪¬┘ü╪╣/┘à┘å╪«┘ü╪╢/╪¡╪▒╪¼)
                        </label>
                      </div>
                    ))}
                  </div>
                )}
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
