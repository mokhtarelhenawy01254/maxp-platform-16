import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import {
  manufacturingApi,
  ProductionStageTemplate,
  ProductionStageType,
  StageExecutionEntity,
  PartnerFactory,
} from '../../manufacturingApi';

interface StageTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTemplate?: ProductionStageTemplate | null;
}

const STAGE_TYPES: { value: ProductionStageType; label: string }[] = [
  { value: 'CUTTING', label: 'قص وتفصيل' },
  { value: 'PRINTING_EMBROIDERY', label: 'طباعة وتطريز' },
  { value: 'SEWING', label: 'خياطة وتجميع' },
  { value: 'FINISHING', label: 'تشطيب وكي' },
  { value: 'QC', label: 'فحص ومراقبة الجودة' },
  { value: 'PACKAGING', label: 'تعبئة وتغليف' },
  { value: 'CUSTOM', label: 'مرحلة مخصصة' },
];

export const StageTemplateModal: React.FC<StageTemplateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTemplate,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [stageType, setStageType] = useState<ProductionStageType>('SEWING');
  const [sequence, setSequence] = useState<number>(1);
  const [standardMinutes, setStandardMinutes] = useState<number>(15);
  const [ratePerPiece, setRatePerPiece] = useState<number>(5.0);
  const [executionEntity, setExecutionEntity] = useState<StageExecutionEntity>('INTERNAL');
  const [defaultPartnerFactoryId, setDefaultPartnerFactoryId] = useState<string>('');
  const [instructions, setInstructions] = useState('');
  const [isActive, setIsActive] = useState<boolean>(true);

  const [partnerFactories, setPartnerFactories] = useState<PartnerFactory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      manufacturingApi
        .listPartnerFactories()
        .then((res) => setPartnerFactories(res.filter((f) => f.isActive)))
        .catch(() => {});

      if (initialTemplate) {
        setCode(initialTemplate.code);
        setName(initialTemplate.name);
        setStageType(initialTemplate.stageType);
        setSequence(initialTemplate.sequence || 1);
        setStandardMinutes(Number(initialTemplate.standardMinutes) || 0);
        setRatePerPiece(Number(initialTemplate.ratePerPiece) || 0);
        setExecutionEntity(initialTemplate.executionEntity || 'INTERNAL');
        setDefaultPartnerFactoryId(initialTemplate.defaultPartnerFactoryId || '');
        setInstructions(initialTemplate.instructions || '');
        setIsActive(initialTemplate.isActive);
      } else {
        setCode(`PST-${Date.now().toString().slice(-4)}`);
        setName('');
        setStageType('SEWING');
        setSequence(1);
        setStandardMinutes(20);
        setRatePerPiece(6.0);
        setExecutionEntity('INTERNAL');
        setDefaultPartnerFactoryId('');
        setInstructions('');
        setIsActive(true);
      }
      setError(null);
    }
  }, [isOpen, initialTemplate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم مرحلة الإنتاج القياسية');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: Partial<ProductionStageTemplate> = {
        code: code.trim().toUpperCase() || undefined,
        name: name.trim(),
        stageType,
        sequence: Number(sequence) || 1,
        standardMinutes: Number(standardMinutes) || 0,
        ratePerPiece: Number(ratePerPiece) || 0,
        executionEntity,
        defaultPartnerFactoryId: executionEntity === 'EXTERNAL' ? defaultPartnerFactoryId || null : null,
        instructions: instructions.trim() || null,
        isActive,
      };

      if (initialTemplate) {
        await manufacturingApi.updateStageTemplate(initialTemplate.id, payload);
      } else {
        await manufacturingApi.createStageTemplate(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل حفظ قالب المرحلة');
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
              {initialTemplate ? 'تعديل قالب مرحلة إنتاج قياسية' : 'إنشاء قالب مرحلة إنتاج قياسية جديدة'}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              تعريف الأجر المعياري، الزمن القياسي، وجهة التنفيذ للاستدعاء المستقبلي
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:bg-muted/60 transition"
          >
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
                اسم المرحلة <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: خياطة ماكينة سنجر، قص ليزر، تشطيب..."
                required
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1">
                كود المرحلة (فريد بالشركة)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="PST-001"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 focus:outline-hidden focus:ring-1 focus:ring-primary text-xs font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1">نوع المرحلة</label>
              <select
                value={stageType}
                onChange={(e) => setStageType(e.target.value as ProductionStageType)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
              >
                {STAGE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1">الترتيب الافتراضي</label>
              <input
                type="number"
                min="1"
                value={sequence}
                onChange={(e) => setSequence(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 focus:outline-hidden focus:ring-1 focus:ring-primary text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1">
                أجر القطعة القياسي (ج.م)
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={ratePerPiece}
                onChange={(e) => setRatePerPiece(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 focus:outline-hidden focus:ring-1 focus:ring-primary text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1">
                الوقت المعياري للقطعة (بالدقائق)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={standardMinutes}
                onChange={(e) => setStandardMinutes(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 focus:outline-hidden focus:ring-1 focus:ring-primary text-xs font-mono"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/20 border border-border/70 space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1.5">جهة التنفيذ</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="executionEntity"
                    checked={executionEntity === 'INTERNAL'}
                    onChange={() => setExecutionEntity('INTERNAL')}
                    className="accent-primary"
                  />
                  <span>داخلي (بصالة الإنتاج)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="executionEntity"
                    checked={executionEntity === 'EXTERNAL'}
                    onChange={() => setExecutionEntity('EXTERNAL')}
                    className="accent-primary"
                  />
                  <span>خارجي (مصنع شريك / مقاول باطن)</span>
                </label>
              </div>
            </div>

            {executionEntity === 'EXTERNAL' && (
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">
                  المصنع الشريك الافتراضي (اختياري)
                </label>
                <select
                  value={defaultPartnerFactoryId}
                  onChange={(e) => setDefaultPartnerFactoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
                >
                  <option value="">-- بدون مصنع افتراضي (يُحدد وقت الأمر) --</option>
                  {partnerFactories.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.specialty ? `(${f.specialty})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-foreground mb-1">
              تعليمات التشغيل وملاحظات الجودة للمرحلة
            </label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="مثال: ضبط عيار الخيط، التأكد من استواء الحياكة، استخدام إبرة رقم 14..."
              className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded-sm border-border accent-primary"
              />
              <span className="font-semibold text-xs">تفعيل القالب في المكتبة للاستدعاء</span>
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
                <span>{loading ? 'جاري الحفظ...' : initialTemplate ? 'تحديث القالب' : 'إنشاء القالب'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
