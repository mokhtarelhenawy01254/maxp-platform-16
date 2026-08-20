import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X as XMarkIcon, Search, ChevronRight, ChevronLeft, Dna } from "lucide-react";
import { api, fetchJson, getAuthHeaders, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, LabCulture } from "./shared";

interface CultureRow extends LabCulture {
  organismCount?: number;
  antibioticCount?: number;
}

interface ChildForm {
  name: string;
}

interface CultureForm {
  id?: string;
  name: string;
  category: string;
  sampleType: string;
  price: string;
  isActive: boolean;
  organisms: ChildForm[];
  antibiotics: ChildForm[];
}

const emptyChild = (): ChildForm => ({ name: "" });

export default function CulturesTab() {
  const [cultures, setCultures] = useState<CultureRow[]>([]);
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

  const [modal, setModal] = useState<CultureForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingLoading, setEditingLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const requestRef = useRef(0);

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchJson<CultureRow[]>(`${api("cultures")}&limit=200&includeInactive=true`);
      const seen = new Map<string, boolean>();
      for (const c of data || []) {
        if (c.category) seen.set(c.category, true);
      }
      setCategories(Array.from(seen.keys()).sort((a, b) => a.localeCompare(b, "ar")));
    } catch {
      setCategories([]);
    }
  }, []);

  const loadCultures = useCallback(async (quiet = false) => {
    const reqId = ++requestRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (includeInactive) params.set("includeInactive", "true");
      const res = await fetch(`${api("cultures")}&${params.toString()}`, { headers: getAuthHeaders() });
      const json = (await res.json()) as { success?: boolean; error?: string; message?: string; data?: CultureRow[]; total?: number; page?: number };
      if (!json.success) throw new Error(json.error || json.message || "┘ü╪┤┘ä ╪º┘ä╪╣┘à┘ä┘è╪⌐");
      if (requestRef.current !== reqId) return;
      setCultures(json.data || []);
      setTotal(json.total ?? 0);
      if (json.page) setPage(json.page);
    } catch (e: unknown) {
      if (requestRef.current !== reqId) return;
      if (!quiet) setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä┘à╪▓╪º╪▒╪╣");
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
    loadCultures();
  }, [loadCultures]);

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
    await Promise.all([loadCultures(quiet), loadCategories()]);
  };

  const openCreate = () => {
    setError(null);
    setModal({
      name: "",
      category: "",
      sampleType: "",
      price: "",
      isActive: true,
      organisms: [],
      antibiotics: [],
    });
  };

  const openEdit = async (culture: CultureRow) => {
    setEditingLoading(true);
    setError(null);
    try {
      const full = await fetchJson<LabCulture>(api(`cultures/${culture.id}`));
      setModal({
        id: full.id,
        name: full.name,
        category: full.category || "",
        sampleType: full.sampleType || "",
        price: String(full.price ?? 0),
        isActive: full.isActive,
        organisms: (full.organisms || []).map(o => ({ name: o.name })),
        antibiotics: (full.antibiotics || []).map(a => ({ name: a.name })),
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä┘à╪▓╪▒╪╣╪⌐");
    } finally {
      setEditingLoading(false);
    }
  };

  const save = async () => {
    if (!modal) return;
    if (saving) return;
    setError(null);
    if (!modal.name.trim()) { setError("╪º╪│┘à ╪º┘ä┘à╪▓╪▒╪╣╪⌐ ┘à╪╖┘ä┘ê╪¿"); return; }
    const price = Number(modal.price);
    if (modal.price !== "" && (Number.isNaN(price) || price < 0)) { setError("╪º┘ä╪│╪╣╪▒ ╪║┘è╪▒ ╪╡╪¡┘è╪¡"); return; }

    const organisms = modal.organisms.filter(o => o.name.trim() !== "").map(o => ({ name: o.name.trim() }));
    const antibiotics = modal.antibiotics.filter(a => a.name.trim() !== "").map(a => ({ name: a.name.trim() }));

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: modal.name.trim(),
        category: modal.category.trim() || undefined,
        sampleType: modal.sampleType.trim() || undefined,
        price,
        organisms,
        antibiotics,
      };
      if (modal.id) {
        await mutate(`cultures/${modal.id}`, "PUT", { ...payload, isActive: modal.isActive });
      } else {
        await mutate("cultures", "POST", payload);
      }
      setModal(null);
      await refreshAll(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪º┘ä╪¡┘ü╪╕");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (culture: CultureRow) => {
    if (removingId) return;
    if (!window.confirm(`╪¬╪ú┘â┘è╪» ╪¡╪░┘ü ╪º┘ä┘à╪▓╪▒╪╣╪⌐ "${culture.name}"╪ƒ`)) return;
    setRemovingId(culture.id);
    try {
      await mutate(`cultures/${culture.id}`, "DELETE");
      await refreshAll(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪░┘ü ╪º┘ä┘à╪▓╪▒╪╣╪⌐");
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
          <h2 className="text-xl font-bold">╪º┘ä┘à╪▓╪º╪▒╪╣</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä┘à╪▓╪º╪▒╪╣ (Culture) ┘ê╪º┘ä┘â╪º╪ª┘å╪º╪¬ ╪º┘ä╪»┘é┘è┘é╪⌐ ┘ê┘ä┘ê╪¡╪º╪¬ ╪º┘ä┘à╪╢╪º╪»╪º╪¬ ╪º┘ä╪¡┘è┘ê┘è╪⌐</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />╪Ñ╪╢╪º┘ü╪⌐ ┘à╪▓╪▒╪╣╪⌐
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
            placeholder="╪¿╪¡╪½ ╪¿╪º┘ä╪º╪│┘à ╪ú┘ê ╪º┘ä┘ü╪ª╪⌐ ╪ú┘ê ┘å┘ê╪╣ ╪º┘ä╪╣┘è┘å╪⌐..."
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
      ) : cultures.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
          <Dna className="w-10 h-10 mx-auto mb-3" />
          {search || category ? "┘ä╪º ╪¬┘ê╪¼╪» ┘å╪¬╪º╪ª╪¼ ┘à╪╖╪º╪¿┘é╪⌐" : "┘ä╪º ╪¬┘ê╪¼╪» ┘à╪▓╪º╪▒╪╣ ╪¿╪╣╪» ΓÇö ╪ú╪╢┘ü ╪ú┘ê┘ä ┘à╪▓╪▒╪╣╪⌐"}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                  <th className="text-right py-3 px-4">╪º╪│┘à</th>
                  <th className="text-right py-3 px-4">╪º┘ä┘ü╪ª╪⌐</th>
                  <th className="text-right py-3 px-4">┘å┘ê╪╣ ╪º┘ä╪╣┘è┘å╪⌐</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">╪º┘ä╪│╪╣╪▒</th>
                  <th className="text-right py-3 px-4">#┘â╪º╪ª┘å╪º╪¬</th>
                  <th className="text-right py-3 px-4">#┘à╪╢╪º╪»╪º╪¬</th>
                  <th className="text-right py-3 px-4">╪¡╪º┘ä╪⌐</th>
                  <th className="text-right py-3 px-4">╪Ñ╪¼╪▒╪º╪í</th>
                </tr>
              </thead>
              <tbody>
                {cultures.map(c => (
                  <tr key={c.id} className="border-b dark:border-gray-700 last:border-b-0">
                    <td className="py-3 px-4 font-medium">{c.name}</td>
                    <td className="py-3 px-4">{c.category || "ΓÇö"}</td>
                    <td className="py-3 px-4">{c.sampleType || "ΓÇö"}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{c.price ?? 0} ╪¼.┘à</td>
                    <td className="py-3 px-4">{c.organismCount ?? 0}</td>
                    <td className="py-3 px-4">{c.antibioticCount ?? 0}</td>
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
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
            <span>╪╣╪▒╪╢ {cultures.length} ┘à┘å {total} ┘à╪▓╪▒╪╣╪⌐</span>
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
              <h3 className="text-lg font-bold">{modal.id ? "╪¬╪╣╪»┘è┘ä ┘à╪▓╪▒╪╣╪⌐" : "┘à╪▓╪▒╪╣╪⌐ ╪¼╪»┘è╪»╪⌐"}</h3>
              <button onClick={() => !saving && setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º╪│┘à ╪º┘ä┘à╪▓╪▒╪╣╪⌐ *</label>
                <input className={MODAL_INPUT_CLS} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä┘ü╪ª╪⌐</label>
                  <input className={MODAL_INPUT_CLS} value={modal.category} onChange={e => setModal({ ...modal, category: e.target.value })} placeholder="┘à╪½╪º┘ä: ┘à┘è┘â╪▒┘ê╪¿┘è┘ê┘ä┘ê╪¼┘è╪º" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">┘å┘ê╪╣ ╪º┘ä╪╣┘è┘å╪⌐</label>
                  <input className={MODAL_INPUT_CLS} value={modal.sampleType} onChange={e => setModal({ ...modal, sampleType: e.target.value })} placeholder="┘à╪½╪º┘ä: ╪¿┘ê┘ä╪î ╪»┘à" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä╪│╪╣╪▒ (╪¼.┘à)</label>
                  <input type="number" min={0} className={MODAL_INPUT_CLS} value={modal.price} onChange={e => setModal({ ...modal, price: e.target.value })} />
                </div>
              </div>

              <div className="border-t dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm">╪º┘ä┘â╪º╪ª┘å╪º╪¬ ╪º┘ä╪»┘é┘è┘é╪⌐</h4>
                  <button
                    onClick={() => setModal({ ...modal, organisms: [...modal.organisms, emptyChild()] })}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 border dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <Plus className="w-4 h-4" />╪Ñ╪╢╪º┘ü╪⌐ ┘â╪º╪ª┘å
                  </button>
                </div>

                {modal.organisms.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center border border-dashed dark:border-gray-700 rounded-lg">
                    ┘ä╪º ╪¬┘ê╪¼╪» ┘â╪º╪ª┘å╪º╪¬ ╪»┘é┘è┘é╪⌐ ╪¿╪╣╪»
                  </p>
                ) : (
                  <div className="space-y-2">
                    {modal.organisms.map((o, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          className={MODAL_INPUT_CLS}
                          value={o.name}
                          onChange={e => setModal({ ...modal, organisms: modal.organisms.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x) })}
                          placeholder="┘à╪½╪º┘ä: ╪Ñ┘è ┘â┘ê┘ä╪º┘è╪î ┘à┘â┘ê╪▒╪º╪¬ ╪╣┘å┘é┘ê╪»┘è╪⌐"
                        />
                        <button
                          onClick={() => setModal({ ...modal, organisms: modal.organisms.filter((_, idx) => idx !== i) })}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg shrink-0"
                          title="╪Ñ╪▓╪º┘ä╪⌐ ╪º┘ä┘â╪º╪ª┘å"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm">╪º┘ä┘à╪╢╪º╪»╪º╪¬ ╪º┘ä╪¡┘è┘ê┘è╪⌐</h4>
                  <button
                    onClick={() => setModal({ ...modal, antibiotics: [...modal.antibiotics, emptyChild()] })}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 border dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <Plus className="w-4 h-4" />╪Ñ╪╢╪º┘ü╪⌐ ┘à╪╢╪º╪»
                  </button>
                </div>

                {modal.antibiotics.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center border border-dashed dark:border-gray-700 rounded-lg">
                    ┘ä╪º ╪¬┘ê╪¼╪» ┘à╪╢╪º╪»╪º╪¬ ╪¡┘è┘ê┘è╪⌐ ╪¿╪╣╪»
                  </p>
                ) : (
                  <div className="space-y-2">
                    {modal.antibiotics.map((a, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          className={MODAL_INPUT_CLS}
                          value={a.name}
                          onChange={e => setModal({ ...modal, antibiotics: modal.antibiotics.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x) })}
                          placeholder="┘à╪½╪º┘ä: ╪ú┘à┘ê┘â╪│┘è╪│┘è┘ä┘è┘å╪î ╪│┘è┘ü╪¬╪▒┘è╪º┘â╪│┘ê┘å"
                        />
                        <button
                          onClick={() => setModal({ ...modal, antibiotics: modal.antibiotics.filter((_, idx) => idx !== i) })}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg shrink-0"
                          title="╪Ñ╪▓╪º┘ä╪⌐ ╪º┘ä┘à╪╢╪º╪»"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
