import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Package, Loader2 } from 'lucide-react';
import { manufacturingApi, SampleComponent } from '../../manufacturingApi';

export interface SampleComponentsTabProps {
  sampleId: string;
  /** مقفولة لو العينة اتحوّلت لأوردر — الباك إند بيرفض التعديل في الحالة دي */
  readOnly?: boolean;
}

interface DraftComponent {
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}

const EMPTY_DRAFT: DraftComponent = { name: '', quantity: '1', unit: 'قطعة', unitPrice: '' };

const toNumber = (value: string | number | null | undefined): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const formatMoney = (value: number | string) =>
  `${toNumber(value).toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;

const lineTotal = (quantity: string | number, unitPrice: string | number) =>
  Math.round(toNumber(quantity) * toNumber(unitPrice) * 100) / 100;

/**
 * تبويب «مكونات العينة» (Task 83791d03).
 * حقول: الاسم / الكمية / الوحدة / سعر الوحدة، والإجمالي محسوب تلقائيًا.
 * السعر بيتخزن كـsnapshot وقت الإدخال أو أي تعديل على سعر الوحدة.
 */
export const SampleComponentsTab: React.FC<SampleComponentsTabProps> = ({ sampleId, readOnly = false }) => {
  const [components, setComponents] = useState<SampleComponent[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<DraftComponent>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftComponent>(EMPTY_DRAFT);

  const load = useCallback(async () => {
    if (!sampleId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await manufacturingApi.listSampleComponents(sampleId);
      setComponents(data.components);
      setTotalCost(data.totalCost);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'تعذّر تحميل مكونات العينة');
    } finally {
      setLoading(false);
    }
  }, [sampleId]);

  useEffect(() => {
    load();
  }, [load]);

  const draftTotal = useMemo(
    () => lineTotal(draft.quantity, draft.unitPrice),
    [draft.quantity, draft.unitPrice]
  );

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || toNumber(draft.quantity) <= 0) {
      setError('اسم المكوّن والكمية مطلوبان (الكمية أكبر من صفر)');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await manufacturingApi.addSampleComponent(sampleId, {
        name: draft.name.trim(),
        quantity: toNumber(draft.quantity),
        unit: draft.unit.trim() || 'قطعة',
        unitPrice: toNumber(draft.unitPrice),
      });
      setDraft(EMPTY_DRAFT);
      setIsAdding(false);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'فشل إضافة المكوّن');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (component: SampleComponent) => {
    setEditingId(component.id);
    setEditDraft({
      name: component.name,
      quantity: String(component.quantity ?? ''),
      unit: component.unit || 'قطعة',
      unitPrice: String(component.unitPrice ?? ''),
    });
  };

  const handleSaveEdit = async (componentId: string) => {
    setSaving(true);
    setError(null);
    try {
      await manufacturingApi.updateSampleComponent(sampleId, componentId, {
        name: editDraft.name.trim(),
        quantity: toNumber(editDraft.quantity),
        unit: editDraft.unit.trim() || 'قطعة',
        unitPrice: toNumber(editDraft.unitPrice),
      });
      setEditingId(null);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'فشل تعديل المكوّن');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (componentId: string) => {
    if (!window.confirm('تأكيد حذف المكوّن من العينة؟')) return;
    setSaving(true);
    setError(null);
    try {
      await manufacturingApi.deleteSampleComponent(sampleId, componentId);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'فشل حذف المكوّن');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" />
          مكونات العينة
          <span className="tabular-nums text-muted-foreground">({components.length})</span>
        </span>

        {!readOnly && (
          <button
            type="button"
            onClick={() => setIsAdding((prev) => !prev)}
            className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> إضافة مكونات
          </button>
        )}
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-medium">
          {error}
        </div>
      )}

      {isAdding && !readOnly && (
        <form onSubmit={handleAdd} className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              required
              value={draft.name}
              onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="اسم المكوّن (مثال: قماش قطن)"
              className="col-span-2 w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="number"
              step="0.001"
              min="0.001"
              required
              value={draft.quantity}
              onChange={(e) => setDraft((prev) => ({ ...prev, quantity: e.target.value }))}
              placeholder="الكمية"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              value={draft.unit}
              onChange={(e) => setDraft((prev) => ({ ...prev, unit: e.target.value }))}
              placeholder="الوحدة (متر / كجم / قطعة)"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              value={draft.unitPrice}
              onChange={(e) => setDraft((prev) => ({ ...prev, unitPrice: e.target.value }))}
              placeholder="سعر الوحدة"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-border/60 bg-background text-xs">
              <span className="text-muted-foreground">الإجمالي</span>
              <span className="font-semibold tabular-nums">{formatMoney(draftTotal)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setDraft(EMPTY_DRAFT);
              }}
              className="px-2.5 py-1 text-xs rounded-md border hover:bg-muted"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-60 flex items-center gap-1"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />} إضافة
            </button>
          </div>
        </form>
      )}

      {loading && components.length === 0 ? (
        <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> جاري التحميل...
        </div>
      ) : components.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-border/70 text-center text-xs text-muted-foreground">
          مفيش مكونات مضافة على العينة دي
        </div>
      ) : (
        <div className="space-y-2">
          {components.map((component) => {
            const isEditing = editingId === component.id;

            return (
              <div
                key={component.id}
                className="p-3 rounded-xl border border-border/70 bg-card hover:border-border transition-all text-xs"
              >
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editDraft.name}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, name: e.target.value }))}
                      className="col-span-2 w-full px-2 py-1 rounded-md border border-border bg-background outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={editDraft.quantity}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, quantity: e.target.value }))}
                      className="w-full px-2 py-1 rounded-md border border-border bg-background outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input
                      type="text"
                      value={editDraft.unit}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-2 py-1 rounded-md border border-border bg-background outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editDraft.unitPrice}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, unitPrice: e.target.value }))}
                      className="w-full px-2 py-1 rounded-md border border-border bg-background outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex items-center justify-between px-2 py-1 rounded-md bg-muted/60">
                      <span className="text-muted-foreground">الإجمالي</span>
                      <span className="font-semibold tabular-nums">
                        {formatMoney(lineTotal(editDraft.quantity, editDraft.unitPrice))}
                      </span>
                    </div>
                    <div className="col-span-2 flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 rounded-md border hover:bg-muted flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> إلغاء
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSaveEdit(component.id)}
                        className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground font-medium flex items-center gap-1 disabled:opacity-60"
                      >
                        <Check className="w-3 h-3" /> حفظ
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{component.name}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {toNumber(component.quantity)} {component.unit} × {formatMoney(component.unitPrice)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold tabular-nums text-foreground">
                        {formatMoney(component.totalCost)}
                      </span>
                      {!readOnly && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(component)}
                            className="p-1.5 rounded-md border hover:bg-muted text-muted-foreground"
                            title="تعديل"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(component.id)}
                            className="p-1.5 rounded-md border border-rose-500/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="حذف"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/60 border border-border/60 text-xs">
        <span className="font-bold text-foreground">إجمالي تكلفة المكونات</span>
        <span className="font-bold tabular-nums text-primary">{formatMoney(totalCost)}</span>
      </div>
    </div>
  );
};

export default SampleComponentsTab;
