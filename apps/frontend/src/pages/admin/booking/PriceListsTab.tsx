import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, FileText, Check, Tag, AlertCircle } from "lucide-react";
import { api, fetchJson, getAuthHeaders, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, PriceList, BookingService } from "./shared";

import PriceListModal, { PriceListRow, PriceListItemRow, ListForm, emptyForm } from "./PriceListModal";

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
    return <div className="text-center py-16 text-muted-foreground text-xs">جارٍ تحميل قوائم الأسعار...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">قوائم الأسعار التعاقدية</h2>
          <p className="text-xs text-muted-foreground">أسعار تعاقدية لكل عميل أو جهة، تورث تلقائياً من القائمة الأساسية</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>قائمة جديدة</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-destructive/10 text-destructive border border-destructive/20 rounded-xl px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-destructive/20 rounded-lg transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Price Lists */}
        <div className="lg:col-span-1 space-y-2">
          {lists.length === 0 && (
            <div className="bg-card border border-border/70 rounded-xl p-8 text-center text-muted-foreground text-xs">
              لا توجد قوائم أسعار بعد
            </div>
          )}
          {lists.map(l => (
            <div
              key={l.id}
              onClick={() => selectList(l.id)}
              className={`cursor-pointer bg-card rounded-xl border p-3.5 flex items-start justify-between gap-2 transition-all ${
                selectedId === l.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                  : "border-border/70 hover:border-border hover:bg-muted/30"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-semibold text-xs text-foreground truncate">{l.name}</h3>
                  {l.isBase && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                      أساسية
                    </span>
                  )}
                  {!l.isActive && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      معطلة
                    </span>
                  )}
                </div>
                {l.description && (
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{l.description}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1 font-mono tabular-nums">
                  أسعار مخصصة: {l.itemCount ?? 0}
                </p>
              </div>
              <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => openEdit(l)}
                  className="p-1 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  title="تعديل"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {!l.isBase && (
                  <button
                    onClick={() => deleteList(l)}
                    className="p-1 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Price List Details & Overrides */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-card border border-border/70 rounded-xl p-12 text-center text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-xs">اختر قائمة أسعار لعرض تفاصيلها</p>
            </div>
          ) : (
            <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border/70 bg-muted/20">
                <div>
                  <h3 className="font-semibold text-xs text-foreground">{selected.name}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedIsBase ? "هذه القائمة هي الأساس، تُطبَّق أسعار الخدمات كما هي" : "الأسعار غير المخصصة تورث من السعر الأساسي للخدمة"}
                  </p>
                </div>
              </div>

              {!selectedIsBase && (
                <div className="px-4 py-2.5 border-b border-border/70 bg-muted/30 flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-[10px] font-medium text-muted-foreground mb-1">الخدمة</label>
                    <select
                      className="w-full border border-border/70 rounded-lg px-2.5 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                      value={overrideServiceId}
                      onChange={e => {
                        setOverrideServiceId(e.target.value);
                        const svc = services.find(s => s.id === e.target.value);
                        const existing = svc ? itemMap.get(svc.id) : null;
                        setOverridePrice(existing ? String(existing.price) : (svc?.basePrice != null ? String(svc.basePrice) : ""));
                      }}
                    >
                      <option value="">اختر خدمة...</option>
                      {overrideOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-[10px] font-medium text-muted-foreground mb-1">السعر (ج.م)</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full border border-border/70 rounded-lg px-2.5 py-1 text-xs font-mono tabular-nums bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                      value={overridePrice}
                      onChange={e => setOverridePrice(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <button
                    onClick={saveOverride}
                    disabled={overrideSaving || !overrideServiceId || overridePrice === ""}
                    className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    حفظ السعر
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground text-[11px] font-medium">
                      <th className="text-right py-2.5 px-3">الخدمة</th>
                      <th className="text-right py-2.5 px-3 whitespace-nowrap">السعر الأساسي</th>
                      <th className="text-right py-2.5 px-3 whitespace-nowrap">السعر التعاقدي</th>
                      <th className="text-right py-2.5 px-3 whitespace-nowrap">السعر الفعلي</th>
                      {!selectedIsBase && <th className="text-right py-2.5 px-3">إجراء</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={selectedIsBase ? 4 : 5} className="py-10 text-center text-muted-foreground text-xs">
                          لا توجد خدمات
                        </td>
                      </tr>
                    )}
                    {rows.map(({ service, item, basePrice, effective, overridden }) => (
                      <tr key={service.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 font-medium text-foreground">
                          {service.name}
                          {service.durationMinutes ? (
                            <span className="text-[10px] text-muted-foreground font-mono tabular-nums mr-1">
                              ({service.durationMinutes} د)
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap font-mono tabular-nums text-muted-foreground">
                          {basePrice} ج.م
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {overridden ? (
                            <span className="text-primary font-mono tabular-nums font-semibold">
                              {item!.price} ج.م
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap font-mono tabular-nums font-semibold text-foreground">
                          {effective} ج.م
                          {overridden && basePrice !== effective && (
                            <span className={`text-[10px] mr-1.5 px-1.5 py-0.2 rounded font-medium ${
                              effective < basePrice
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-destructive/10 text-destructive"
                            }`}>
                              {effective < basePrice ? "خصم" : "زيادة"}
                            </span>
                          )}
                        </td>
                        {!selectedIsBase && (
                          <td className="py-2 px-3">
                            {overridden && (
                              <button
                                onClick={() => removeOverride(item!)}
                                className="text-[10px] px-2 py-0.5 bg-destructive/10 text-destructive border border-destructive/20 rounded hover:bg-destructive/20 transition-colors"
                              >
                                إزالة
                              </button>
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
        <PriceListModal
          listModal={listModal}
          lists={lists}
          saving={saving}
          onClose={() => setListModal(null)}
          onSave={saveList}
          onChange={setListModal}
        />
      )}
    </div>
  );
}
