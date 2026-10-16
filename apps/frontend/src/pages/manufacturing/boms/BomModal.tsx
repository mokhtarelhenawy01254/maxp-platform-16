import React, { useState, useEffect } from 'react';
import { X, Layers } from 'lucide-react';
import {
  manufacturingApi,
  BillOfMaterials,
  BomComponentItem,
  BomStandardStage,
  ProductOption,
} from '../manufacturingApi';
import { BomComponentsTable } from './components/BomComponentsTable';
import { BomStagesTable } from './components/BomStagesTable';

interface BomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialBom?: BillOfMaterials | null;
  mode?: 'create' | 'edit' | 'clone';
}

const DEFAULT_STAGES: BomStandardStage[] = [
  { name: 'مرحلة القص والتفصيل', stageType: 'CUTTING', sequence: 1, ratePerPiece: 5.0, standardMinutes: 15 },
  { name: 'مرحلة الخياطة والتجميع', stageType: 'SEWING', sequence: 2, ratePerPiece: 18.0, standardMinutes: 35 },
  { name: 'مرحلة التشطيب والتنظيف', stageType: 'FINISHING', sequence: 3, ratePerPiece: 4.0, standardMinutes: 10 },
  { name: 'مرحلة فحص الجودة (QC)', stageType: 'QC', sequence: 4, ratePerPiece: 2.0, standardMinutes: 5 },
  { name: 'مرحلة الكي والتعبئة', stageType: 'PACKAGING', sequence: 5, ratePerPiece: 3.0, standardMinutes: 8 },
];

export const BomModal: React.FC<BomModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialBom,
  mode = 'create',
}) => {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0');
  const [productId, setProductId] = useState('');
  const [baseQuantity, setBaseQuantity] = useState(1);
  const [wasteMarginPercent, setWasteMarginPercent] = useState(3.5);
  const [laborCostPerUnit, setLaborCostPerUnit] = useState(0);
  const [overheadCostPerUnit, setOverheadCostPerUnit] = useState(10.0);
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Components & Stages
  const [components, setComponents] = useState<BomComponentItem[]>([
    { rawMaterialId: 'raw_fabric_01', rawMaterialName: 'قماش ميلتون قطن شتوي', consumptionPerUnit: 1.6, unit: 'METER', scrapRate: 2.0, appliesToSizes: ['ALL'], appliesToColors: ['ALL'] },
    { rawMaterialId: 'raw_rib_02', rawMaterialName: 'ريب قطني للأسورة والياقة', consumptionPerUnit: 0.25, unit: 'METER', scrapRate: 1.0, appliesToSizes: ['ALL'], appliesToColors: ['ALL'] },
    { rawMaterialId: 'raw_zipper_03', rawMaterialName: 'سوستة معدنية عريضة 65 سم', consumptionPerUnit: 1.0, unit: 'PIECE', scrapRate: 0.0, appliesToSizes: ['ALL'], appliesToColors: ['ALL'] },
    { rawMaterialId: 'raw_thread_04', rawMaterialName: 'خيوط حياكة بوليستر متينة', consumptionPerUnit: 0.1, unit: 'SPOOL', scrapRate: 5.0, appliesToSizes: ['ALL'], appliesToColors: ['ALL'] },
  ]);

  const [standardStages, setStandardStages] = useState<BomStandardStage[]>(DEFAULT_STAGES);

  useEffect(() => {
    manufacturingApi.getProducts().then(setProducts).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialBom && isOpen) {
      setCode(mode === 'clone' ? `${initialBom.code}-V2` : initialBom.code);
      setName(mode === 'clone' ? `${initialBom.name} (نسخة)` : initialBom.name);
      setVersion(mode === 'clone' ? '2.0' : initialBom.version || '1.0');
      setProductId(initialBom.productId || '');
      setBaseQuantity(Number(initialBom.baseQuantity) || 1);
      setWasteMarginPercent(Number(initialBom.wasteMarginPercent) || 0);
      setLaborCostPerUnit(Number(initialBom.laborCostPerUnit) || 0);
      setOverheadCostPerUnit(Number(initialBom.overheadCostPerUnit) || 0);
      setNotes(initialBom.notes || '');
      setIsActive(initialBom.isActive !== false);

      if (initialBom.components && initialBom.components.length > 0) {
        setComponents(initialBom.components.map((c) => ({ ...c })));
      }
      if (initialBom.standardStages && initialBom.standardStages.length > 0) {
        setStandardStages(initialBom.standardStages.map((s) => ({ ...s })));
      }
    } else if (isOpen) {
      setCode(`BOM-GARMENT-${Date.now().toString().slice(-4)}`);
      setName('هودي كاجوال أوفر سايز');
      setVersion('1.0');
      setProductId('');
      setBaseQuantity(1);
      setWasteMarginPercent(3.5);
      setLaborCostPerUnit(32.0);
      setOverheadCostPerUnit(10.0);
      setNotes('');
      setIsActive(true);
      setStandardStages(DEFAULT_STAGES);
    }
  }, [initialBom, isOpen, mode]);

  if (!isOpen) return null;

  const handleAddComponent = () => {
    setComponents([
      ...components,
      {
        rawMaterialId: `raw_${Date.now()}`,
        rawMaterialName: '',
        consumptionPerUnit: 1.0,
        unit: 'PIECE',
        scrapRate: 0.0,
        appliesToSizes: ['ALL'],
        appliesToColors: ['ALL'],
      },
    ]);
  };

  const handleRemoveComponent = (idx: number) => {
    setComponents(components.filter((_, i) => i !== idx));
  };

  const handleComponentChange = (idx: number, field: keyof BomComponentItem, val: any) => {
    const updated = [...components];
    updated[idx] = { ...updated[idx], [field]: val };
    setComponents(updated);
  };

  const handleAddStage = () => {
    setStandardStages([
      ...standardStages,
      {
        name: 'مرحلة إضافية',
        stageType: 'CUSTOM',
        sequence: standardStages.length + 1,
        ratePerPiece: 5.0,
        standardMinutes: 10,
      },
    ]);
  };

  const handleRemoveStage = (idx: number) => {
    setStandardStages(standardStages.filter((_, i) => i !== idx));
  };

  const handleStageChange = (idx: number, field: keyof BomStandardStage, val: any) => {
    const updated = [...standardStages];
    updated[idx] = { ...updated[idx], [field]: val };
    setStandardStages(updated);
  };

  const totalCalculatedLabor = standardStages.reduce((sum, s) => sum + (Number(s.ratePerPiece) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError('كود قائمة المكونات مطلوب');
      return;
    }
    if (!name.trim()) {
      setError('اسم الموديل مطلوب');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        version,
        productId: productId || null,
        baseQuantity: Number(baseQuantity) || 1,
        wasteMarginPercent: Number(wasteMarginPercent) || 0,
        laborCostPerUnit: laborCostPerUnit > 0 ? laborCostPerUnit : totalCalculatedLabor,
        overheadCostPerUnit: Number(overheadCostPerUnit) || 0,
        notes: notes.trim() || null,
        isActive,
        components: components.filter((c) => c.rawMaterialName?.trim() || c.rawMaterialId),
        standardStages,
      };

      if (mode === 'edit' && initialBom) {
        await manufacturingApi.updateBom(initialBom.id, payload);
      } else {
        await manufacturingApi.createBom(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'فشل حفظ قائمة المكونات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-xl bg-card border border-border/70 shadow-2xl overflow-hidden text-foreground">
        {/* Modal Header */}
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {mode === 'edit' ? 'تعديل قائمة المكونات (BOM)' : mode === 'clone' ? 'استنساخ إصدار جديد من قائمة المكونات' : 'إنشاء قائمة مكونات جديدة (BOM)'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                تحديد بنود المواد الخام ومعدلات الاستهلاك ومراحل التشغيل لقطاع الملابس والتصنيع
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          {/* Section 1: General Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/10 border border-border/60">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">كود الـ BOM *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="BOM-HOODIE-V1"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">اسم الموديل / الوصف *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="هودي أوفر سايز شتوي"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">الإصدار</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">ربط بمنتج تام (اختياري)</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- غير مرتبط بمنتج محدد --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.sku ? `(${p.sku})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">نسبة الهالك المسموح بها %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={wasteMarginPercent}
                onChange={(e) => setWasteMarginPercent(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">الأعباء الصناعية MOH (ج.م/قطعة)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={overheadCostPerUnit}
                onChange={(e) => setOverheadCostPerUnit(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
          </div>

          {/* Section 2: Component Raw Materials */}
          <BomComponentsTable
            components={components}
            onAddComponent={handleAddComponent}
            onRemoveComponent={handleRemoveComponent}
            onChangeComponent={handleComponentChange}
          />

          {/* Section 3: Standard Stages */}
          <BomStagesTable
            standardStages={standardStages}
            onAddStage={handleAddStage}
            onRemoveStage={handleRemoveStage}
            onChangeStage={handleStageChange}
            totalCalculatedLabor={totalCalculatedLabor}
          />

          {/* Notes & Active status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">ملاحظات فنية للمصنع</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات حول طريقة القص، تعليمات الخياطة..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="isActiveBom"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="isActiveBom" className="text-xs font-semibold cursor-pointer">
                تفعيل الـ BOM لأوامر التشغيل الجديدة
              </label>
            </div>
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
              {saving ? 'جارٍ الحفظ...' : mode === 'edit' ? 'حفظ التعديلات' : mode === 'clone' ? 'استنساخ الـ BOM' : 'إنشاء قائمة المكونات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BomModal;
