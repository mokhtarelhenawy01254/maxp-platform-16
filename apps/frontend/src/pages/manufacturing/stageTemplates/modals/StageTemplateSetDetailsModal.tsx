import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Building2,
  Clock,
  Coins,
  CheckCircle2,
} from 'lucide-react';
import {
  manufacturingApi,
  ProductionStageTemplate,
  ProductionStageTemplateSet,
} from '../../manufacturingApi';

interface StageTemplateSetDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshSets: () => void;
  setId: string | null;
}

export const StageTemplateSetDetailsModal: React.FC<StageTemplateSetDetailsModalProps> = ({
  isOpen,
  onClose,
  onRefreshSets,
  setId,
}) => {
  const [set, setSet] = useState<ProductionStageTemplateSet | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<ProductionStageTemplate[]>([]);
  const [selectedTemplateToAdd, setSelectedTemplateToAdd] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSetDetails = async () => {
    if (!setId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await manufacturingApi.getStageTemplateSetById(setId);
      setSet(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل تحميل تفاصيل المجموعة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && setId) {
      fetchSetDetails();
      manufacturingApi
        .listStageTemplates({ isActive: true })
        .then(setAvailableTemplates)
        .catch(() => {});
    }
  }, [isOpen, setId]);

  if (!isOpen || !setId) return null;

  const items = set?.items || [];
  const totalStandardMinutes = items.reduce(
    (sum, it) => sum + (Number(it.template?.standardMinutes) || 0),
    0
  );
  const totalLaborCost = items.reduce(
    (sum, it) => sum + (Number(it.template?.ratePerPiece) || 0),
    0
  );

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateToAdd) return;
    try {
      setError(null);
      await manufacturingApi.addStageTemplateSetItem(setId, {
        templateId: selectedTemplateToAdd,
      });
      setSelectedTemplateToAdd('');
      await fetchSetDetails();
      onRefreshSets();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل إضافة المرحلة للمسار');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      setError(null);
      await manufacturingApi.removeSetItem(setId, itemId);
      await fetchSetDetails();
      onRefreshSets();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل حذف المرحلة من المسار');
    }
  };

  const handleMove = async (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const orderedIds = newItems.map((it) => it.id);
    try {
      setError(null);
      await manufacturingApi.reorderStageTemplateSetItems(setId, orderedIds);
      await fetchSetDetails();
      onRefreshSets();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل إعادة ترتيب المراحل');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl bg-card border border-border/80 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/70 bg-muted/20">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">
                {set?.name || 'تفاصيل وترتيب مسار الإنتاج'}
              </h2>
              {set?.code && (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                  {set.code}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              ترتيب تسلسل المراحل، إضافة مراحل جديدة، ومعاينة التكلفة والزمن الإجمالي
            </p>
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

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/20 border border-border/70">
            <div>
              <span className="text-[10px] text-muted-foreground block">عدد المراحل بالمسار</span>
              <span className="font-bold text-sm text-foreground font-mono tabular-nums">{items.length}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">إجمالي الوقت القياسي</span>
              <span className="font-bold text-sm text-foreground font-mono tabular-nums">
                {totalStandardMinutes.toFixed(1)} <span className="text-[10px] font-sans">دقيقة</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">إجمالي أجور العمالة المعيارية</span>
              <span className="font-bold text-sm text-emerald-600 font-mono tabular-nums">
                {totalLaborCost.toFixed(2)} <span className="text-[10px] font-sans">ج.م/قطعة</span>
              </span>
            </div>
          </div>

          {/* Add Stage Form */}
          <form onSubmit={handleAddItem} className="flex items-center gap-2 p-2.5 rounded-xl border border-border/70 bg-card">
            <select
              value={selectedTemplateToAdd}
              onChange={(e) => setSelectedTemplateToAdd(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-border/70 focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
            >
              <option value="">-- اختر مرحلة من المكتبة لإضافتها إلى هذا المسار --</option>
              {availableTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code}) — {Number(t.ratePerPiece).toFixed(2)} ج.م / {t.standardMinutes} دقيقة
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!selectedTemplateToAdd}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition disabled:opacity-50 text-xs whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة للمسار</span>
            </button>
          </form>

          {/* Items List */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs text-foreground">تسلسل المراحل التشغيلية:</h4>
            {items.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground border border-dashed border-border/70 rounded-xl">
                هذا المسار فارغ حالياً — أضف مراحل من القائمة أعلاه
              </div>
            ) : (
              items.map((item, index) => {
                const tmpl = item.template;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/70 shadow-2xs hover:border-border transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-mono font-bold text-xs text-muted-foreground">
                        {item.sequence}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-xs">{tmpl?.name || 'مرحلة'}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">({tmpl?.code})</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                              tmpl?.executionEntity === 'EXTERNAL'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}
                          >
                            {tmpl?.executionEntity === 'EXTERNAL' ? 'خارجي' : 'داخلي'}
                          </span>
                        </div>
                        {tmpl?.instructions && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                            {tmpl.instructions}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-left font-mono text-[11px] tabular-nums">
                        <span className="text-emerald-600 font-bold ml-2">
                          {Number(tmpl?.ratePerPiece || 0).toFixed(2)} ج.م
                        </span>
                        <span className="text-muted-foreground">
                          {tmpl?.standardMinutes || 0} د
                        </span>
                      </div>

                      <div className="flex items-center gap-1 border-r border-border/60 pr-2">
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'UP')}
                          disabled={index === 0}
                          title="تحريك لأعلى"
                          className="p-1 rounded text-muted-foreground hover:bg-muted disabled:opacity-30 transition"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'DOWN')}
                          disabled={index === items.length - 1}
                          title="تحريك لأسفل"
                          className="p-1 rounded text-muted-foreground hover:bg-muted disabled:opacity-30 transition"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          title="حذف من المسار"
                          className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition mr-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border/70 bg-muted/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-muted text-foreground font-semibold hover:bg-muted/80 transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
