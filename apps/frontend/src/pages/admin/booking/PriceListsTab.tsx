import { useCallback, useEffect, useMemo, useState } from "react";
import { PlusIcon, PencilIcon, TrashIcon, X as XMarkIcon, FileText as DocumentTextIcon } from "lucide-react";
import { api, fetchJson, getAuthHeaders, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, PriceList, BookingService } from "./shared";

interface PriceListRow extends PriceList {
  itemCount?: number;
  isBase?: boolean;
}

interface PriceListItemRow {
  id: string;
  priceListId: string;
  serviceId: string;
  price: number;
  isActive: boolean;
  effectivePrice?: number;
  service?: { id: string; name: string; basePrice?: number; durationMinutes?: number };
}

interface ListForm {
  id?: string;
  name: string;
  description: string;
  baseListId: string;
  isActive: boolean;
}

const emptyForm = (): ListForm => ({ name: "", description: "", baseListId: "", isActive: true });

export default function PriceListsTab() {
  const [lists, setLists] = useState<PriceListRow[]>([]);
  const [services, setServices] = useState<BookingService[]>([]);
  const [items, setItems] = useState<PriceListItemRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listModal, setListModal] = useState<ListForm | null>(null);
  const [saving, setSaving] = useState(false);

  const [overrideServiceId, setOverrideServiceId] = useState("");
  const [overridePrice, setOverridePrice] = useState("");
  const [overrideSaving, setOverrideSaving] = useState(false);

  const selected = useMemo(() => lists.find(l => l.id === selectedId) || null, [lists, selectedId]);
  const selectedIsBase = !!selected && selected.isBase !== false && !selected.baseListId;

  const loadLists = useCallback(async () => {
    const data = await fetchJson<PriceListRow[]>(api("price-lists"));
    setLists(data || []);
    setSelectedId(prev => {
      if (data?.some(l => l.id === prev)) return prev;
      return data?.[0]?.id || "";
    });
  }, []);

  const loadServices = useCallback(async () => {
    const data = await fetchJson<BookingService[]>(api("services"));
    setServices(data || []);
  }, []);

  const loadItems = useCallback(async (listId: string) => {
    if (!listId) { setItems([]); return; }
    const data = await fetchJson<PriceListItemRow[]>(api(`price-lists/${listId}/items`));
    setItems(data || []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        await loadLists();
        await loadServices();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "حدث خطأ في تحميل قوائم الأسعار");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadLists, loadServices]);

  useEffect(() => {
    if (!selectedId) return;
    loadItems(selectedId).catch(() => setItems([]));
  }, [selectedId, loadItems]);

  const mutate = async (url: string, method: string, body?: Record<string, unknown>) => {
    const res = await fetch(url, { method, headers: getAuthHeaders(), body: body ? JSON.stringify(body) : undefined });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || data.message || "فشلت العملية");
    return data.data;
  };

  const selectList = (id: string) => setSelectedId(id);

  const openCreate = () => setListModal(emptyForm());
  const openEdit = (l: PriceListRow) => setListModal({ id: l.id, name: l.name, description: l.description || "", baseListId: l.baseListId || "", isActive: l.isActive });

  const saveList = async () => {
    if (!listModal) return;
    setSaving(true);
    try {
      if (listModal.id) {
        await mutate(api(`price-lists/${listModal.id}`), "PUT", { name: listModal.name, description: listModal.description || undefined, isActive: listModal.isActive });
      } else {
        const created = await mutate(api("price-lists"), "POST", {
          name: listModal.name,
          description: listModal.description || undefined,
          baseListId: listModal.baseListId || undefined
        });
        setSelectedId(created.id);
      }
      setListModal(null);
      await loadLists();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ في حفظ القائمة");
    } finally {
      setSaving(false);
    }
  };

  const deleteList = async (l: PriceListRow) => {
    if (!window.confirm(`تأكيد حذف القائمة "${l.name}"؟`)) return;
    try {
      await mutate(api(`price-lists/${l.id}`), "DELETE");
      if (selectedId === l.id) setSelectedId("");
      await loadLists();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ في حذف القائمة");
    }
  };

  const saveOverride = async () => {
    if (!selected || selectedIsBase || !overrideServiceId) return;
    const price = Number(overridePrice);
    if (Number.isNaN(price) || price < 0) { setError("السعر غير صحيح"); return; }
    setOverrideSaving(true);
    try {
      await mutate(api(`price-lists/${selected.id}/items/${overrideServiceId}`), "PUT", { price });
      setOverrideServiceId("");
      setOverridePrice("");
      await loadItems(selected.id);
      await loadLists();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ في حفظ السعر");
    } finally {
      setOverrideSaving(false);
    }
  };

  const removeOverride = async (item: PriceListItemRow) => {
    if (!selected) return;
    try {
      await mutate(api(`price-lists/${selected.id}/items/${item.serviceId}`), "DELETE");
      await loadItems(selected.id);
      await loadLists();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ في إزالة السعر");
    }
  };

  const itemMap = useMemo(() => new Map(items.map(i => [i.serviceId, i])), [items]);

  const rows = useMemo(() => services
    .map(s => {
      const item = itemMap.get(s.id);
      const basePrice = s.basePrice ?? 0;
      const effective = selectedIsBase || !item ? basePrice : item.price;
      return { service: s, item: item || null, basePrice, effective, overridden: !!item && !selectedIsBase };
    })
    .sort((a, b) => a.service.name.localeCompare(b.service.name, "ar")), [services, itemMap, selectedIsBase]);

  const overrideOptions = useMemo(() => services.filter(s => !itemMap.has(s.id)), [services, itemMap]);

  if (loading) {
    return <div className="text-center py-16 text-gray-400 dark:text-gray-500">جارٍ التحميل...</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold">قوائم الأسعار التعاقدية</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">أسعار تعاقدية لكل عميل أو جهة، تورث من القائمة الأساسية</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />قائمة جديدة</button>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"><XMarkIcon className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          {lists.length === 0 && <p className="text-gray-400 dark:text-gray-500 text-center py-8 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">لا توجد قوائم أسعار بعد</p>}
          {lists.map(l => (
            <div
              key={l.id}
              onClick={() => selectList(l.id)}
              className={`cursor-pointer bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 flex items-start justify-between gap-2 ${selectedId === l.id ? "border-blue-500 ring-1 ring-blue-500" : "hover:bg-gray-50 dark:hover:bg-gray-750"}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold truncate">{l.name}</h3>
                  {l.isBase && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 whitespace-nowrap">أساسية</span>}
                  {!l.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 whitespace-nowrap">معطلة</span>}
                </div>
                {l.description && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{l.description}</p>}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">أسعار مخصصة: {l.itemCount ?? 0}</p>
              </div>
              <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                <button onClick={() => openEdit(l)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="تعديل"><PencilIcon className="w-4 h-4" /></button>
                {!l.isBase && (
                  <button onClick={() => deleteList(l)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="حذف"><TrashIcon className="w-4 h-4" /></button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
              <DocumentTextIcon className="w-10 h-10 mx-auto mb-3" />
              اختر قائمة أسعار لعرض تفاصيلها
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b dark:border-gray-700">
                <div>
                  <h3 className="font-bold">{selected.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedIsBase ? "هذه القائمة هي الأساس، تُطبَّق أسعار الخدمات كما هي" : "الأسعار غير المخصصة تورث من السعر الأساسي للخدمة"}</p>
                </div>
              </div>

              {!selectedIsBase && (
                <div className="px-4 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">الخدمة</label>
                    <select className={MODAL_INPUT_CLS} value={overrideServiceId} onChange={e => {
                      setOverrideServiceId(e.target.value);
                      const svc = services.find(s => s.id === e.target.value);
                      const existing = svc ? itemMap.get(svc.id) : null;
                      setOverridePrice(existing ? String(existing.price) : (svc?.basePrice != null ? String(svc.basePrice) : ""));
                    }}>
                      <option value="">اختر خدمة...</option>
                      {overrideOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="w-28">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">السعر (ج.م)</label>
                    <input type="number" min={0} className={MODAL_INPUT_CLS} value={overridePrice} onChange={e => setOverridePrice(e.target.value)} placeholder="0" />
                  </div>
                  <button onClick={saveOverride} disabled={overrideSaving || !overrideServiceId || overridePrice === ""} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">حفظ السعر</button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                      <th className="text-right py-3 px-4">الخدمة</th>
                      <th className="text-right py-3 px-4 whitespace-nowrap">السعر الأساسي</th>
                      <th className="text-right py-3 px-4 whitespace-nowrap">السعر التعاقدي</th>
                      <th className="text-right py-3 px-4 whitespace-nowrap">السعر الفعلي</th>
                      {!selectedIsBase && <th className="text-right py-3 px-4">إجراء</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr><td colSpan={selectedIsBase ? 4 : 5} className="py-12 text-center text-gray-400 dark:text-gray-500">لا توجد خدمات</td></tr>
                    )}
                    {rows.map(({ service, item, basePrice, effective, overridden }) => (
                      <tr key={service.id} className="border-b dark:border-gray-700 last:border-b-0">
                        <td className="py-3 px-4 font-medium">{service.name}{service.durationMinutes ? <span className="text-xs text-gray-400 mr-1">({service.durationMinutes} د)</span> : null}</td>
                        <td className="py-3 px-4 whitespace-nowrap">{basePrice} ج.م</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {overridden ? (
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">{item!.price} ج.م</span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-semibold">
                          {effective} ج.م
                          {overridden && basePrice !== effective && <span className={`text-xs mr-1 ${effective < basePrice ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>{effective < basePrice ? "خصم" : "زيادة"}</span>}
                        </td>
                        {!selectedIsBase && (
                          <td className="py-3 px-4">
                            {overridden && (
                              <button onClick={() => removeOverride(item!)} className="text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50">إزالة</button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {listModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setListModal(null)}>
          <div className={`${MODAL_CONTENT_CLS}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{listModal.id ? "تعديل قائمة أسعار" : "قائمة أسعار جديدة"}</h3>
              <button onClick={() => setListModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم</label>
                <input className={MODAL_INPUT_CLS} value={listModal.name} onChange={e => setListModal({ ...listModal, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف</label>
                <textarea className={MODAL_INPUT_CLS} rows={2} value={listModal.description} onChange={e => setListModal({ ...listModal, description: e.target.value })} />
              </div>
              {!listModal.id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">القائمة الأساسية (تُورث منها الأسعار غير المخصصة)</label>
                  <select className={MODAL_INPUT_CLS} value={listModal.baseListId} onChange={e => setListModal({ ...listModal, baseListId: e.target.value })}>
                    <option value="">تلقائي (أول قائمة تصبح أساسية)</option>
                    {lists.filter(l => l.isBase && l.isActive).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              )}
              {listModal.id && (
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={listModal.isActive} onChange={e => setListModal({ ...listModal, isActive: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                  مفعّلة
                </label>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setListModal(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
              <button onClick={saveList} disabled={saving || !listModal.name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
