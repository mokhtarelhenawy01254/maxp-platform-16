import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Factory } from 'lucide-react';
import {
  manufacturingApi,
  BillOfMaterials,
  VariantRequirementResolution,
  WarehouseOption,
  ProductionOrder,
} from '../manufacturingApi';
import { WizardVariantMatrixStep } from './wizard/WizardVariantMatrixStep';
import { WizardRequirementsPreviewStep } from './wizard/WizardRequirementsPreviewStep';

interface NewOrderWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (order: ProductionOrder) => void;
}

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const DEFAULT_COLORS = ['أسود', 'رمادي ميلانج', 'أبيض', 'كحلي'];

export const NewOrderWizardModal: React.FC<NewOrderWizardModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedBomId, setSelectedBomId] = useState<string>('');
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>('');
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Matrix quantities: size_color -> qty
  const [matrix, setMatrix] = useState<Record<string, number>>({
    'M_أسود': 20,
    'L_أسود': 30,
    'XL_أسود': 25,
    'M_رمادي ميلانج': 15,
    'L_رمادي ميلانج': 20,
  });

  // Resolved materials preview
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<VariantRequirementResolution | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        manufacturingApi.listBoms({ isActive: true }).catch(() => []),
        manufacturingApi.getWarehouses().catch(() => []),
      ]).then(([bomsList, whList]) => {
        setBoms(bomsList);
        setWarehouses(whList);
        if (bomsList.length > 0 && !selectedBomId) {
          setSelectedBomId(bomsList[0].id);
        }
        if (whList.length > 0) {
          setSourceWarehouseId(whList[0].id);
          if (whList.length > 1) {
            setTargetWarehouseId(whList[1].id);
          } else {
            setTargetWarehouseId(whList[0].id);
          }
        }
        setLoading(false);
      });
    }
  }, [isOpen]);

  const selectedBom = useMemo(() => {
    return boms.find((b) => b.id === selectedBomId) || null;
  }, [boms, selectedBomId]);

  const getMatrixQty = (size: string, color: string) => matrix[`${size}_${color}`] || 0;
  const setMatrixQty = (size: string, color: string, qty: number) => {
    setMatrix((prev) => ({ ...prev, [`${size}_${color}`]: Math.max(0, qty) }));
  };

  const totalPlannedQty = useMemo(() => {
    return Object.values(matrix).reduce((sum, q) => sum + (q || 0), 0);
  }, [matrix]);

  const variantList = useMemo(() => {
    const list: Array<{ size: string; color: string; plannedQuantity: number; sku?: string }> = [];
    Object.entries(matrix).forEach(([key, qty]) => {
      if (qty > 0) {
        const [size, color] = key.split('_');
        list.push({
          size,
          color,
          plannedQuantity: qty,
          sku: selectedBom ? `${selectedBom.code}-${size}-${color}` : undefined,
        });
      }
    });
    return list;
  }, [matrix, selectedBom]);

  const handleNextToStep3 = async () => {
    if (totalPlannedQty <= 0) {
      setError('يرجى إدخال كمية مخططة واحدة على الأقل في مصفوفة المقاسات والألوان');
      return;
    }
    setError(null);
    setResolving(true);
    try {
      const res = await manufacturingApi.resolveVariantRequirements(selectedBomId, variantList);
      setResolved(res);
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'فشل احتساب احتياجات الخامات');
    } finally {
      setResolving(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!selectedBomId || variantList.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const newOrder = await manufacturingApi.createOrder({
        bomId: selectedBomId,
        productId: selectedBom?.productId || null,
        plannedQuantity: totalPlannedQty,
        sourceWarehouseId: sourceWarehouseId || null,
        targetWarehouseId: targetWarehouseId || null,
        dueDate: dueDate || null,
        notes: notes || null,
        variantMatrix: variantList,
        stages: selectedBom?.standardStages || [],
      });
      onCreated(newOrder);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'فشل إنشاء أمر الإنتاج');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-xl bg-card border border-border/70 shadow-2xl overflow-hidden text-foreground">
        {/* Header */}
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Factory className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">معالج إنشاء أمر إنتاج جديد (Production Order Wizard)</h2>
              <p className="text-[11px] text-muted-foreground">اختيار نمط التشغيل، تخصيص مصفوفة المقاسات والألوان، ومعاينة استهلاك الخامات</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Steps Navigation */}
        <div className="px-5 py-3 border-b border-border/60 bg-muted/10 flex items-center justify-between text-xs shrink-0">
          <div className={`flex items-center gap-1.5 font-medium ${step >= 1 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</span>
            <span>المواصفات والـ BOM</span>
          </div>
          <div className="h-0.5 w-12 bg-border/60" />
          <div className={`flex items-center gap-1.5 font-medium ${step >= 2 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</span>
            <span>مصفوفة المقاس واللون</span>
          </div>
          <div className="h-0.5 w-12 bg-border/60" />
          <div className={`flex items-center gap-1.5 font-medium ${step === 3 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>3</span>
            <span>المتطلبات والاعتماد</span>
          </div>
        </div>

        {/* Wizard Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-xs space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          {/* STEP 1: Select BOM & Warehouses */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">قائمة المكونات المعتمدة (BOM) *</label>
                <select
                  value={selectedBomId}
                  onChange={(e) => setSelectedBomId(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                >
                  <option value="">-- اختر قائمة مكونات معتمدة --</option>
                  {boms.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.name} (v{b.version})
                    </option>
                  ))}
                </select>
              </div>

              {selectedBom && (
                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">{selectedBom.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{selectedBom.code}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                    <div>هالك مسموح: <span className="font-mono font-bold text-foreground">{selectedBom.wasteMarginPercent}%</span></div>
                    <div>أجر العمالة: <span className="font-mono font-bold text-foreground">{selectedBom.laborCostPerUnit} ج.م</span></div>
                    <div>أعباء MOH: <span className="font-mono font-bold text-foreground">{selectedBom.overheadCostPerUnit} ج.م</span></div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">مستودع صرف الخامات</label>
                  <select
                    value={sourceWarehouseId}
                    onChange={(e) => setSourceWarehouseId(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none"
                  >
                    <option value="">-- المستودع الافتراضي --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">مستودع استلام الإنتاج التام</label>
                  <select
                    value={targetWarehouseId}
                    onChange={(e) => setTargetWarehouseId(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none"
                  >
                    <option value="">-- المستودع الافتراضي --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">تاريخ التسليم المستهدف</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">ملاحظات التشغيل والطلب</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="تشغيل لصالح الموسم الشتوي، أوردر عاجل..."
                    className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Size x Color Matrix */}
          {step === 2 && (
            <WizardVariantMatrixStep
              selectedBom={selectedBom}
              totalPlannedQty={totalPlannedQty}
              sizes={DEFAULT_SIZES}
              colors={DEFAULT_COLORS}
              getMatrixQty={getMatrixQty}
              setMatrixQty={setMatrixQty}
            />
          )}

          {/* STEP 3: Requirements Preview & Confirmation */}
          {step === 3 && (
            <WizardRequirementsPreviewStep
              selectedBom={selectedBom}
              totalPlannedQty={totalPlannedQty}
              variantCount={variantList.length}
              resolved={resolved}
            />
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-4 border-t border-border/60 flex items-center justify-between bg-muted/20 shrink-0">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition text-xs font-semibold"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>الخطوة السابقة</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition text-xs font-medium"
            >
              إلغاء
            </button>

            {step === 1 && (
              <button
                type="button"
                disabled={!selectedBomId}
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
              >
                <span>متابعة لمصفوفة المقاسات</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                disabled={totalPlannedQty <= 0 || resolving}
                onClick={handleNextToStep3}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
              >
                <span>{resolving ? 'جارٍ احتساب الخامات...' : 'معاينة متطلبات الخامات'}</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                disabled={loading}
                onClick={handleCreateOrder}
                className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition shadow-md disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{loading ? 'جارٍ إنشاء أمر التشغيل...' : 'اعتماد وإنشاء أمر الإنتاج'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewOrderWizardModal;
