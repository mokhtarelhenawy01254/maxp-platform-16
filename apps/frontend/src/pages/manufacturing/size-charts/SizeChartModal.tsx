import React, { useState, useEffect } from 'react';
import { X, Ruler, Plus, Trash2, AlertTriangle, Layers, RotateCcw } from 'lucide-react';
import {
  manufacturingApi,
  SizeChart,
  SizeChartRow,
  SizeChartUnit,
  SizeChartMeasurementMethod,
  SizeChartRowSource,
  TechPack,
  ProductOption,
} from '../manufacturingApi';

interface SizeChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated?: SizeChart) => void;
  initialSizeChart?: SizeChart | null;
  mode?: 'create' | 'edit' | 'clone';
}

const DEFAULT_ROWS: SizeChartRow[] = [
  { sizeLabel: 'S', measurementKey: 'CHEST', value: 54.0, tolerance: 1.0, source: 'CUSTOMER' },
  { sizeLabel: 'S', measurementKey: 'LENGTH', value: 70.0, tolerance: 1.0, source: 'CUSTOMER' },
  { sizeLabel: 'M', measurementKey: 'CHEST', value: 56.0, tolerance: 1.0, source: 'CUSTOMER' },
  { sizeLabel: 'M', measurementKey: 'LENGTH', value: 72.0, tolerance: 1.0, source: 'CUSTOMER' },
  { sizeLabel: 'L', measurementKey: 'CHEST', value: 58.0, tolerance: 1.0, source: 'CUSTOMER' },
  { sizeLabel: 'L', measurementKey: 'LENGTH', value: 74.0, tolerance: 1.0, source: 'CUSTOMER' },
  { sizeLabel: 'XL', measurementKey: 'CHEST', value: 60.0, tolerance: 1.0, source: 'CUSTOMER' },
  { sizeLabel: 'XL', measurementKey: 'LENGTH', value: 76.0, tolerance: 1.0, source: 'CUSTOMER' },
];

export const SizeChartModal: React.FC<SizeChartModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialSizeChart,
  mode = 'create',
}) => {
  const [techPacks, setTechPacks] = useState<TechPack[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<SizeChartUnit>('CM');
  const [measurementMethod, setMeasurementMethod] = useState<SizeChartMeasurementMethod>('FLAT');
  const [productId, setProductId] = useState('');
  const [techPackId, setTechPackId] = useState('');
  const [notes, setNotes] = useState('');

  // Active Source Filter Tab
  const [activeSource, setActiveSource] = useState<SizeChartRowSource>('CUSTOMER');

  // Rows State
  const [rows, setRows] = useState<SizeChartRow[]>([]);

  useEffect(() => {
    manufacturingApi.listTechPacks().then(setTechPacks).catch(() => {});
    manufacturingApi.getProducts().then(setProducts).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialSizeChart && isOpen) {
      setCode(mode === 'clone' ? `${initialSizeChart.code}-V2` : initialSizeChart.code);
      setName(mode === 'clone' ? `${initialSizeChart.name} (نسخة)` : initialSizeChart.name);
      setUnit(initialSizeChart.unit || 'CM');
      setMeasurementMethod(initialSizeChart.measurementMethod || 'FLAT');
      setProductId(initialSizeChart.productId || '');
      setTechPackId(initialSizeChart.techPackId || '');
      setNotes(initialSizeChart.notes || '');
      setRows(initialSizeChart.rows ? initialSizeChart.rows.map((r) => ({ ...r })) : []);
    } else if (isOpen) {
      setCode(`SC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
      setName('جدول مقاسات الهودي الشتوي الأساسي');
      setUnit('CM');
      setMeasurementMethod('FLAT');
      setProductId('');
      setTechPackId('');
      setNotes('');
      setRows(DEFAULT_ROWS.map((r) => ({ ...r })));
    }
  }, [initialSizeChart, isOpen, mode]);

  if (!isOpen) return null;

  const isApproved = initialSizeChart?.status === 'APPROVED' && mode === 'edit';

  const visibleRows = rows.filter((r) => r.source === activeSource);

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        sizeLabel: 'M',
        measurementKey: 'CHEST',
        value: 50.0,
        tolerance: 1.0,
        source: activeSource,
      },
    ]);
  };

  const handleRemoveRow = (globalIdx: number) => {
    setRows(rows.filter((_, i) => i !== globalIdx));
  };

  const handleRowChange = (globalIdx: number, field: keyof SizeChartRow, val: any) => {
    const updated = [...rows];
    updated[globalIdx] = {
      ...updated[globalIdx],
      [field]: val,
    };
    setRows(updated);
  };

  const handleCopyCustomerToActive = () => {
    if (activeSource === 'CUSTOMER') return;
    const customerRows = rows.filter((r) => r.source === 'CUSTOMER');
    if (customerRows.length === 0) {
      alert('لا توجد صفوف في نسخة العميل لنسخها');
      return;
    }

    const withoutActive = rows.filter((r) => r.source !== activeSource);
    const newCopies = customerRows.map((r) => ({
      ...r,
      id: undefined,
      source: activeSource,
    }));

    setRows([...withoutActive, ...newCopies]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('اسم جدول المقاسات مطلوب');
      return;
    }

    if (rows.length === 0) {
      setError('يرجى إضافة قياس واحد على الأقل لجدول المقاسات');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        unit,
        measurementMethod,
        productId: productId || null,
        techPackId: techPackId || null,
        notes: notes.trim() || null,
        rows: rows.map((r) => ({
          sizeLabel: r.sizeLabel,
          measurementKey: r.measurementKey,
          value: Number(r.value) || 0,
          tolerance: Number(r.tolerance) || 1.0,
          source: r.source,
        })),
      };

      let resultChart: SizeChart | undefined;
      if (mode === 'edit' && initialSizeChart) {
        const res = await manufacturingApi.updateSizeChart(initialSizeChart.id, payload);
        resultChart = res.sizeChart;
      } else {
        resultChart = await manufacturingApi.createSizeChart(payload);
      }

      onClose();
      onSuccess(resultChart);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'فشل حفظ جدول المقاسات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-xl bg-card border border-border/70 shadow-2xl overflow-hidden text-foreground">
        {/* Header */}
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Ruler className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {mode === 'edit'
                  ? 'تعديل جدول المقاسات (Size Chart)'
                  : mode === 'clone'
                  ? 'استنساخ إصدار جديد من جدول المقاسات'
                  : 'إنشاء جدول مقاسات جديد (Size Chart)'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                إدارة أبعاد المقاسات لثلاث نسخ مترابطة: العميل، الباترون الفعلي، ومقاسات المصنع
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          {isApproved && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>تنبيه إصدار معتمد:</strong> جدول المقاسات هذا معتمد. حفظ أي تعديل هنا سينشئ تلقائياً <strong>نسخة مسودة جديدة برقم إصدار تالٍ (V{(initialSizeChart?.version || 1) + 1})</strong> مع الاحتفاظ بالنسخة المعتمدة دون أي تعديل.
              </div>
            </div>
          )}

          {/* Basic Header Info */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">كود جدول المقاسات</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SC-YYYY-XXXXX"
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-border bg-background focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">اسم جدول المقاسات *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: جدول مقاسات هودي أوفر سايز 2026"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">وحدة القياس</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as SizeChartUnit)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
              >
                <option value="CM">سنتيمتر (CM)</option>
                <option value="INCH">بوصة (INCH)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">طريقة القياس</label>
              <select
                value={measurementMethod}
                onChange={(e) => setMeasurementMethod(e.target.value as SizeChartMeasurementMethod)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
              >
                <option value="FLAT">فلات / مسطح نصف المحيط (FLAT)</option>
                <option value="ROUND">دائري / كامل المحيط (ROUND)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">ربط بملف فني (Tech Pack)</label>
              <select
                value={techPackId}
                onChange={(e) => setTechPackId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
              >
                <option value="">-- بدون ربط بـ Tech Pack --</option>
                {techPacks.map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.name} ({tp.code} V{tp.version})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">ربط بمنتج من الكتالوج</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
              >
                <option value="">-- اختياري --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Three-Linked Source Matrix Editor */}
          <div className="border border-border/70 rounded-xl p-3 bg-muted/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5">
              <div>
                <span className="font-bold text-xs text-foreground block">
                  مصفوفة القياسات للنسخ الثلاث المترابطة (إجمالي: {rows.length} قياس)
                </span>
                <span className="text-[10px] text-muted-foreground">
                  اختر النسخة المستهدفة للإدخال، أو انسخ قياسات العميل بضغطة زر
                </span>
              </div>

              {/* Source Switcher Tab */}
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setActiveSource('CUSTOMER')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    activeSource === 'CUSTOMER'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  نسخة العميل (CUSTOMER)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSource('PATTERN')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    activeSource === 'PATTERN'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  نسخة الباترون (PATTERN)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSource('FACTORY')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    activeSource === 'FACTORY'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  نسخة المصنع (FACTORY)
                </button>
              </div>
            </div>

            {/* Sub-actions for active source */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground">
                القياسات الحالية لنسخة{' '}
                <strong className="text-foreground">
                  {activeSource === 'CUSTOMER' ? 'العميل' : activeSource === 'PATTERN' ? 'الباترون الفعلي' : 'المصنع'}
                </strong>{' '}
                ({visibleRows.length})
              </span>

              <div className="flex items-center gap-2">
                {activeSource !== 'CUSTOMER' && (
                  <button
                    type="button"
                    onClick={handleCopyCustomerToActive}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-border/70 hover:bg-muted transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>نسخ من قياسات العميل</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-2xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>إضافة قياس</span>
                </button>
              </div>
            </div>

            {/* Matrix Table for Active Source */}
            <div className="rounded-lg border border-border/70 overflow-hidden bg-card">
              {visibleRows.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-muted-foreground space-y-2">
                  <p>لا توجد قياسات مدخلة لهذه النسخة ({activeSource}).</p>
                  {activeSource !== 'CUSTOMER' && (
                    <button
                      type="button"
                      onClick={handleCopyCustomerToActive}
                      className="px-3 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs transition"
                    >
                      استيراد قياسات نسخة العميل كبداية
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-right text-xs">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                    <tr>
                      <th className="p-2 font-semibold">المقاس (Size)</th>
                      <th className="p-2 font-semibold">القياس (Measurement)</th>
                      <th className="p-2 font-semibold">القيمة ({unit})</th>
                      <th className="p-2 font-semibold">نسبة التفاوت ± (Tolerance)</th>
                      <th className="p-2 font-semibold text-center w-12">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {rows.map((row, globalIdx) => {
                      if (row.source !== activeSource) return null;
                      return (
                        <tr key={globalIdx} className="hover:bg-muted/20">
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.sizeLabel}
                              onChange={(e) => handleRowChange(globalIdx, 'sizeLabel', e.target.value.toUpperCase())}
                              placeholder="M"
                              className="w-20 px-2 py-1 text-xs font-mono font-bold rounded border border-border bg-background focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.measurementKey}
                              onChange={(e) => handleRowChange(globalIdx, 'measurementKey', e.target.value.toUpperCase())}
                              placeholder="CHEST / LENGTH..."
                              className="w-36 px-2 py-1 text-xs font-mono font-medium rounded border border-border bg-background focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.1"
                              value={row.value}
                              onChange={(e) => handleRowChange(globalIdx, 'value', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 text-xs font-mono font-bold rounded border border-border bg-background focus:outline-none tabular-nums"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.1"
                              value={row.tolerance}
                              onChange={(e) => handleRowChange(globalIdx, 'tolerance', parseFloat(e.target.value) || 1.0)}
                              className="w-20 px-2 py-1 text-xs font-mono rounded border border-border bg-background focus:outline-none tabular-nums"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(globalIdx)}
                              className="p-1 text-muted-foreground hover:text-destructive transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">ملاحظات التفاوت الفني</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="تنبيهات حول ترييح القماش، انكماش الغسيل..."
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-t border-border/60 flex items-center justify-end gap-2 bg-muted/10 -mx-5 -mb-5 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-border/70 hover:bg-muted transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            >
              {saving ? 'جارٍ الحفظ...' : mode === 'edit' ? (isApproved ? 'حفظ وإنشاء إصدار جديد' : 'حفظ التعديلات') : 'إنشاء جدول المقاسات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
