import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Coins,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  manufacturingApi,
  ProductionStageTemplateSet,
  BomStandardStage,
} from '../../manufacturingApi';

interface ApplyStageSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'ORDER' | 'BOM';
  targetId?: string;
  targetLabel?: string;
  hasExistingStages?: boolean;
  onSuccess: () => void;
  /**
   * Optional local callback when applying in client-side BOM creation modal before saving
   */
  onApplyLocalStages?: (stages: BomStandardStage[]) => void;
}

export const ApplyStageSetModal: React.FC<ApplyStageSetModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetLabel,
  hasExistingStages = false,
  onSuccess,
  onApplyLocalStages,
}) => {
  const [sets, setSets] = useState<ProductionStageTemplateSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [selectedSet, setSelectedSet] = useState<ProductionStageTemplateSet | null>(null);

  // Modes
  // For Order: 'APPEND' | 'REPLACE_IF_EMPTY'
  // For BOM: 'APPEND' | 'REPLACE_ALL'
  const [orderMode, setOrderMode] = useState<'APPEND' | 'REPLACE_IF_EMPTY'>(
    hasExistingStages ? 'APPEND' : 'REPLACE_IF_EMPTY'
  );
  const [bomMode, setBomMode] = useState<'APPEND' | 'REPLACE_ALL'>('APPEND');

  const [loading, setLoading] = useState(false);
  const [loadingSets, setLoadingSets] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoadingSets(true);
      setError(null);
      manufacturingApi
        .listStageTemplateSets({ isActive: true })
        .then((data) => {
          setSets(data);
          if (data.length > 0) {
            setSelectedSetId(data[0].id);
            setSelectedSet(data[0]);
          }
        })
        .catch((err) => {
          setError(err?.response?.data?.message || 'فشل تحميل مجموعات المراحل القياسية');
        })
        .finally(() => setLoadingSets(false));

      setOrderMode(hasExistingStages ? 'APPEND' : 'REPLACE_IF_EMPTY');
      setBomMode('APPEND');
    }
  }, [isOpen, hasExistingStages]);

  const handleSelectSet = (id: string) => {
    setSelectedSetId(id);
    const found = sets.find((s) => s.id === id) || null;
    setSelectedSet(found);
  };

  if (!isOpen) return null;

  const items = selectedSet?.items || [];
  const totalStandardMinutes = items.reduce(
    (sum, it) => sum + (Number(it.template?.standardMinutes) || 0),
    0
  );
  const totalLaborCost = items.reduce(
    (sum, it) => sum + (Number(it.template?.ratePerPiece) || 0),
    0
  );

  const handleApply = async () => {
    if (!selectedSetId) {
      setError('يرجى اختيار مجموعة مراحل قياسية أولاً');
      return;
    }
    if (items.length === 0) {
      setError('المجموعة المحددة لا تحتوي على أي مراحل');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (targetType === 'ORDER' && targetId) {
        await manufacturingApi.applyStageSetToOrder(targetId, {
          setId: selectedSetId,
          mode: orderMode,
        });
        onSuccess();
        onClose();
      } else if (targetType === 'BOM') {
        if (targetId) {
          await manufacturingApi.applyStageSetToBom(targetId, {
            setId: selectedSetId,
            mode: bomMode,
          });
          onSuccess();
          onClose();
        } else if (onApplyLocalStages) {
          // Client-side local application in BOM modal
          const newStages: BomStandardStage[] = items.map((it, idx) => ({
            name: it.template?.name || `مرحلة ${idx + 1}`,
            stageType: it.template?.stageType || 'CUSTOM',
            sequence: idx + 1,
            ratePerPiece: Number(it.template?.ratePerPiece) || 0,
            standardMinutes: Number(it.template?.standardMinutes) || 0,
          }));
          onApplyLocalStages(newStages);
          onSuccess();
          onClose();
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل استدعاء وتطبيق المراحل القياسية');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-2xl bg-card border border-border/80 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/70 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                استدعاء مراحل إنتاج قياسية (Snapshot Import)
              </h2>
              <p className="text-[11px] text-muted-foreground">
                نسخ مراحل معيارية جاهزة إلى {targetType === 'ORDER' ? 'أمر التشغيل' : 'قائمة المكونات (BOM)'}{' '}
                {targetLabel && <span className="font-semibold text-foreground">({targetLabel})</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:bg-muted/60 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Set Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-foreground mb-1.5">
              اختر المسار / المجموعة القياسية (Standard Set)
            </label>
            {loadingSets ? (
              <div className="py-3 text-center text-muted-foreground">جاري تحميل المجموعات...</div>
            ) : sets.length === 0 ? (
              <div className="p-3 rounded-lg border border-dashed border-border/70 text-center text-muted-foreground">
                لا توجد مجموعات مراحل قياسية نشطة حالياً. يرجى إنشاء مجموعة في مكتبة المراحل أولاً.
              </div>
            ) : (
              <select
                value={selectedSetId}
                onChange={(e) => handleSelectSet(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 focus:outline-hidden focus:ring-1 focus:ring-primary text-xs font-semibold"
              >
                {sets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) — {s.items?.length || 0} مراحل
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Mode Selector */}
          {targetType === 'ORDER' ? (
            <div className="p-3 rounded-xl bg-muted/20 border border-border/70 space-y-2">
              <span className="block text-[11px] font-semibold text-foreground">طريقة التطبيق على أمر التشغيل:</span>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="orderMode"
                    value="APPEND"
                    checked={orderMode === 'APPEND'}
                    onChange={() => setOrderMode('APPEND')}
                    className="accent-primary"
                  />
                  <div>
                    <span className="font-semibold text-foreground">إلحاق بالمراحل الحالية (APPEND)</span>
                    <span className="block text-[10px] text-muted-foreground">
                      إضافة هذه المراحل في نهاية جدول مراحل الأمر دون مساس بالمراحل الموجودة
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="orderMode"
                    value="REPLACE_IF_EMPTY"
                    checked={orderMode === 'REPLACE_IF_EMPTY'}
                    onChange={() => setOrderMode('REPLACE_IF_EMPTY')}
                    className="accent-primary"
                  />
                  <div>
                    <span className="font-semibold text-foreground">
                      تطبيق كمسار أساسي (REPLACE_IF_EMPTY)
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      مسموح فقط إذا كان الأمر فارغاً من أي مراحل سابقة
                    </span>
                  </div>
                </label>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-muted/20 border border-border/70 space-y-2">
              <span className="block text-[11px] font-semibold text-foreground">طريقة التطبيق على الـBOM:</span>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="bomMode"
                    value="APPEND"
                    checked={bomMode === 'APPEND'}
                    onChange={() => setBomMode('APPEND')}
                    className="accent-primary"
                  />
                  <span className="font-semibold text-foreground">إلحاق بالمراحل القياسية الحالية (APPEND)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="bomMode"
                    value="REPLACE_ALL"
                    checked={bomMode === 'REPLACE_ALL'}
                    onChange={() => setBomMode('REPLACE_ALL')}
                    className="accent-primary"
                  />
                  <span className="font-semibold text-foreground">استبدال كافة المراحل القديمة (REPLACE_ALL)</span>
                </label>
              </div>
            </div>
          )}

          {/* Preview of Set Items */}
          {selectedSet && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-foreground">
                  معاينة المراحل التي سيتم نسخها ({items.length} مرحلة):
                </h4>
                <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums">
                  <span className="text-emerald-600 font-bold">{totalLaborCost.toFixed(2)} ج.م/قطعة</span>
                  <span className="text-muted-foreground">{totalStandardMinutes.toFixed(1)} دقيقة</span>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
                <table className="w-full text-right text-xs">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                    <tr>
                      <th className="p-2 w-10 text-center font-semibold">#</th>
                      <th className="p-2 font-semibold">المرحلة</th>
                      <th className="p-2 font-semibold">الجهة</th>
                      <th className="p-2 font-semibold">الأجر المعياري</th>
                      <th className="p-2 font-semibold">الوقت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-muted-foreground">
                          المجموعة فارغة
                        </td>
                      </tr>
                    ) : (
                      items.map((it, idx) => (
                        <tr key={it.id} className="hover:bg-muted/20">
                          <td className="p-2 text-center font-mono text-muted-foreground">{idx + 1}</td>
                          <td className="p-2 font-semibold text-foreground">
                            {it.template?.name}
                            {it.template?.instructions && (
                              <span className="block text-[10px] text-muted-foreground font-normal truncate max-w-xs">
                                {it.template.instructions}
                              </span>
                            )}
                          </td>
                          <td className="p-2">
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                                it.template?.executionEntity === 'EXTERNAL'
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                                  : 'bg-primary/10 text-primary border border-primary/20'
                              }`}
                            >
                              {it.template?.executionEntity === 'EXTERNAL' ? 'خارجي' : 'داخلي'}
                            </span>
                          </td>
                          <td className="p-2 font-mono text-emerald-600 font-bold tabular-nums">
                            {Number(it.template?.ratePerPiece || 0).toFixed(2)} ج.م
                          </td>
                          <td className="p-2 font-mono text-muted-foreground tabular-nums">
                            {it.template?.standardMinutes || 0} د
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  <strong>مبدأ اللقطة (Snapshot):</strong> سيتم نسخ هذه القيم كما هي إلى الأمر؛ وتعديل القالب لاحقاً لن يغيّر هذه المراحل إطلاقاً.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border/70 bg-muted/20 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border/70 text-muted-foreground hover:bg-muted/60 transition"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={loading || !selectedSetId || items.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{loading ? 'جاري الاستدعاء...' : 'تأكيد واستدعاء المراحل الآن'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
