import { useCallback, useEffect, useState } from "react";
import { PlusIcon, PencilIcon, TrashIcon, X as XMarkIcon, Building2 as BuildingIcon } from "lucide-react";
import { api, fetchJson, getAuthHeaders, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, InsuranceCompany, PriceList } from "./shared";

interface InsuranceCompanyRow extends InsuranceCompany {
  priceList?: { id: string; name: string; isBase?: boolean; isActive?: boolean };
}

interface CompanyForm {
  id?: string;
  name: string;
  priceListId: string;
  phone1: string;
  fax: string;
  contactName: string;
  contactPhone: string;
  isActive: boolean;
}

const emptyForm = (): CompanyForm => ({
  name: "", priceListId: "", phone1: "", fax: "", contactName: "", contactPhone: "", isActive: true
});

export default function InsuranceCompaniesTab() {
  const [companies, setCompanies] = useState<InsuranceCompanyRow[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyForm | null>(null);
  const [saving, setSaving] = useState(false);

  const loadCompanies = useCallback(async () => {
    const data = await fetchJson<InsuranceCompanyRow[]>(api("insurance-companies"));
    setCompanies(data || []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        await Promise.all([
          loadCompanies(),
          fetchJson<PriceList[]>(api("price-lists")).then(setPriceLists).catch(() => setPriceLists([]))
        ]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬╪¡┘à┘è┘ä ╪┤╪▒┘â╪º╪¬ ╪º┘ä╪¬╪ú┘à┘è┘å");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadCompanies]);

  const mutate = async (url: string, method: string, body?: Record<string, unknown>) => {
    const res = await fetch(url, { method, headers: getAuthHeaders(), body: body ? JSON.stringify(body) : undefined });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || data.message || "┘ü╪┤┘ä╪¬ ╪º┘ä╪╣┘à┘ä┘è╪⌐");
    return data.data;
  };

  const openCreate = () => setForm(emptyForm());
  const openEdit = (c: InsuranceCompanyRow) => setForm({
    id: c.id,
    name: c.name,
    priceListId: c.priceListId || "",
    phone1: c.phone1 || "",
    fax: c.fax || "",
    contactName: c.contactName || "",
    contactPhone: c.contactPhone || "",
    isActive: c.isActive
  });

  const saveCompany = async () => {
    if (!form) return;
    setSaving(true);
    try {
      if (form.id) {
        await mutate(api(`insurance-companies/${form.id}`), "PUT", {
          name: form.name,
          priceListId: form.priceListId || null,
          phone1: form.phone1 || null,
          fax: form.fax || null,
          contactName: form.contactName || null,
          contactPhone: form.contactPhone || null,
          isActive: form.isActive
        });
      } else {
        await mutate(api("insurance-companies"), "POST", {
          name: form.name,
          priceListId: form.priceListId || undefined,
          phone1: form.phone1 || undefined,
          fax: form.fax || undefined,
          contactName: form.contactName || undefined,
          contactPhone: form.contactPhone || undefined
        });
      }
      setForm(null);
      await loadCompanies();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡┘ü╪╕ ╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å");
    } finally {
      setSaving(false);
    }
  };

  const deleteCompany = async (c: InsuranceCompanyRow) => {
    if (!window.confirm(`╪¬╪ú┘â┘è╪» ╪¡╪░┘ü ╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å "${c.name}"╪ƒ`)) return;
    try {
      await mutate(api(`insurance-companies/${c.id}`), "DELETE");
      await loadCompanies();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡╪░┘ü ╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å");
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-400 dark:text-gray-500">╪¼╪º╪▒┘ì ╪º┘ä╪¬╪¡┘à┘è┘ä...</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold">╪┤╪▒┘â╪º╪¬ ╪º┘ä╪¬╪ú┘à┘è┘å</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">╪Ñ╪»╪º╪▒╪⌐ ╪┤╪▒┘â╪º╪¬ ╪º┘ä╪¬╪ú┘à┘è┘å ╪º┘ä╪¬╪╣╪º┘é╪»┘è╪⌐ ┘ê╪▒╪¿╪╖┘ç╪º ╪¿┘é┘ê╪º╪ª┘à ╪º┘ä╪ú╪│╪╣╪º╪▒</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />╪┤╪▒┘â╪⌐ ╪¼╪»┘è╪»╪⌐</button>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"><XMarkIcon className="w-4 h-4" /></button>
        </div>
      )}

      {companies.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
          <BuildingIcon className="w-10 h-10 mx-auto mb-3" />
          ┘ä╪º ╪¬┘ê╪¼╪» ╪┤╪▒┘â╪º╪¬ ╪¬╪ú┘à┘è┘å ╪¿╪╣╪»
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                <th className="text-right py-3 px-4">╪º╪│┘à</th>
                <th className="text-right py-3 px-4 whitespace-nowrap">┘é╪º╪ª┘à╪⌐ ╪º┘ä╪ú╪│╪╣╪º╪▒</th>
                <th className="text-right py-3 px-4 whitespace-nowrap">╪¬┘ä┘è┘ü┘ê┘å 1</th>
                <th className="text-right py-3 px-4">┘ü╪º┘â╪│</th>
                <th className="text-right py-3 px-4">┘à╪│╪ñ┘ê┘ä</th>
                <th className="text-right py-3 px-4">╪¡╪º┘ä╪⌐</th>
                <th className="text-right py-3 px-4">╪Ñ╪¼╪▒╪º╪í</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(c => (
                <tr key={c.id} className="border-b dark:border-gray-700 last:border-b-0">
                  <td className="py-3 px-4 font-medium">{c.name}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {c.priceList ? (
                      <span className="text-blue-600 dark:text-blue-400">{c.priceList.name}</span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">ΓÇö</span>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">{c.phone1 || "ΓÇö"}</td>
                  <td className="py-3 px-4">{c.fax || "ΓÇö"}</td>
                  <td className="py-3 px-4">
                    {c.contactName ? (
                      <div>
                        <div>{c.contactName}</div>
                        {c.contactPhone && <div className="text-xs text-gray-400 dark:text-gray-500">{c.contactPhone}</div>}
                      </div>
                    ) : "ΓÇö"}
                  </td>
                  <td className="py-3 px-4">
                    {c.isActive ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">┘å╪┤╪╖</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">┘à╪╣╪╖┘ä╪⌐</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="╪¬╪╣╪»┘è┘ä"><PencilIcon className="w-4 h-4" /></button>
                      <button onClick={() => deleteCompany(c)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="╪¡╪░┘ü"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setForm(null)}>
          <div className={`${MODAL_CONTENT_CLS}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{form.id ? "╪¬╪╣╪»┘è┘ä ╪┤╪▒┘â╪⌐ ╪¬╪ú┘à┘è┘å" : "╪┤╪▒┘â╪⌐ ╪¬╪ú┘à┘è┘å ╪¼╪»┘è╪»╪⌐"}</h3>
              <button onClick={() => setForm(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä╪º╪│┘à</label>
                <input className={MODAL_INPUT_CLS} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">┘é╪º╪ª┘à╪⌐ ╪º┘ä╪ú╪│╪╣╪º╪▒</label>
                <select className={MODAL_INPUT_CLS} value={form.priceListId} onChange={e => setForm({ ...form, priceListId: e.target.value })}>
                  <option value="">╪¿╪»┘ê┘å ┘é╪º╪ª┘à╪⌐ ╪ú╪│╪╣╪º╪▒</option>
                  {priceLists
                    .filter(l => l.isActive || l.id === form.priceListId)
                    .map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪¬┘ä┘è┘ü┘ê┘å 1</label>
                  <input className={MODAL_INPUT_CLS} value={form.phone1} onChange={e => setForm({ ...form, phone1: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">┘ü╪º┘â╪│</label>
                  <input className={MODAL_INPUT_CLS} value={form.fax} onChange={e => setForm({ ...form, fax: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º╪│┘à ╪º┘ä┘à╪│╪ñ┘ê┘ä</label>
                  <input className={MODAL_INPUT_CLS} value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪¬┘ä┘è┘ü┘ê┘å ╪º┘ä┘à╪│╪ñ┘ê┘ä</label>
                  <input className={MODAL_INPUT_CLS} value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} />
                </div>
              </div>
              {form.id && (
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                  ┘à┘ü╪╣┘æ┘ä╪⌐
                </label>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setForm(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">╪Ñ┘ä╪║╪º╪í</button>
              <button onClick={saveCompany} disabled={saving || !form.name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">╪¡┘ü╪╕</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
