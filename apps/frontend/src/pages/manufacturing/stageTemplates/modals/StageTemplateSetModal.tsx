import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Plus, Check } from 'lucide-react';
import {
  manufacturingApi,
  ProductionStageTemplate,
  ProductionStageTemplateSet,
} from '../../manufacturingApi';

interface StageTemplateSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialSet?: ProductionStageTemplateSet | null;
}

export const StageTemplateSetModal: React.FC<StageTemplateSetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialSet,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [availableTemplates, setAvailableTemplates] = useState<ProductionStageTemplate[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      manufacturingApi
        .listStageTemplates({ isActive: true })
        .then(setAvailableTemplates)
        .catch(() => {});

      if (initialSet) {
        setCode(initialSet.code);
        setName(initialSet.name);
        setDescription(initialSet.description || '');
        setIsActive(initialSet.isActive);
        setSelectedTemplateIds([]);
      } else {
        setCode(`SET-${Date.now().toString().slice(-4)}`);
        setName('');
        setDescription('');
        setIsActive(true);
        setSelectedTemplateIds([]);
      }
      setError(null);
    }
  }, [isOpen, initialSet]);

  if (!isOpen) return null;

  const toggleTemplateSelection = (id: string) => {
    if (selectedTemplateIds.includes(id)) {
      setSelectedTemplateIds(selectedTemplateIds.filter((tId) => tId !== id));
    } else {
      setSelectedTemplateIds([...selectedTemplateIds, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم مجموعة المراحل القياسية');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (initialSet) {
        await manufacturingApi.updateStageTemplateSet(initialSet.id, {
          code: code.trim().toUpperCase() || undefined,
          name: name.trim(),
          description: description.trim() || null,
          isActive,
        });
      } else {
        await manufacturingApi.createStageTemplateSet({
          code: code.trim().toUpperCase() || undefined,
          name: name.trim(),
          description: description.trim() || null,
          isActive,
          itemTemplateIds: selectedTemplateIds,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل حفظ مجموعة المراحل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-2xl bg-card border border-border/80 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/70 bg-muted/20">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              {initialSet ? 'تعديل مجموعة مسار الإنتاج القياسي' : 'إنشاء مجموعة مسار إنتاج قياسي جديدة (Standard Set)'}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              تجميع مراحل تشغيل متسلسلة للمنتج (مثل: مسار هودي، مسار قميص كلاسيك، مسار بنطلون جينز)
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:bg-muted/60 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1">
                اسم المجموعة / المسار <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: مسار هودي كاجوال، مسار بولو شيرت..."
                required
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1">كود المجموعة القياسية</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SET-001"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 focus:outline-hidden focus:ring-1 focus:ring-primary text-xs font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-foreground mb-1">وصف المسار والمنتجات المستهدفة</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر لمسار التشغيل القياسي واستخداماته..."
              className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
            />
          </div>

          {!initialSet && (
            <div className="border border-border/70 rounded-xl p-3 bg-muted/20">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-bold text-[11px] text-foreground">اختيار مراحل للبدء في هذا المسار</h4>
                  <p className="text-[10px] text-muted-foreground">
                    يمكنك اختيار قوالب جاهزة من المكتبة، أو إضافتها وترتيبها لاحقاً
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  محدد: {selectedTemplateIds.length}
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 no-scrollbar pr-1">
                {availableTemplates.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground py-3 text-center">
                    لا توجد قوالب مراحل نشطة في المكتبة حالياً
                  </p>
                ) : (
                  availableTemplates.map((t) => {
                    const isSelected = selectedTemplateIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleTemplateSelection(t.id)}
                        className={`p-2 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-primary/5 border-primary/40 text-foreground'
                            : 'bg-card border-border/60 hover:bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded-sm border flex items-center justify-center ${
                              isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">{t.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono mr-2">({t.code})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-mono">
                          <span>{Number(t.ratePerPiece).toFixed(2)} ج.م</span>
                          <span>{t.standardMinutes} دقيقة</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded-sm border-border accent-primary"
              />
              <span className="font-semibold text-xs">تفعيل المجموعة للاستدعاء الفوري</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-border/70 text-muted-foreground hover:bg-muted/60 transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{loading ? 'جاري الحفظ...' : initialSet ? 'تحديث المسار' : 'إنشاء المسار'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
