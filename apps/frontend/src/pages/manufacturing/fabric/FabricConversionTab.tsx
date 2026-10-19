import React, { useState } from 'react';
import { ArrowLeftRight, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { manufacturingApi } from '../manufacturingApi';

interface FabricConversionTabProps {
  initialWidth?: string;
  initialGsm?: string;
}

export const FabricConversionTab: React.FC<FabricConversionTabProps> = ({
  initialWidth = '1.6',
  initialGsm = '240',
}) => {
  const [mode, setMode] = useState<'both' | 'kg' | 'm'>('both');
  const [widthM, setWidthM] = useState<string>(initialWidth);
  const [gsm, setGsm] = useState<string>(initialGsm);
  const [lengthM, setLengthM] = useState<string>('1000');
  const [weightKg, setWeightKg] = useState<string>('384');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleCalculate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const w = parseFloat(widthM);
    const g = parseFloat(gsm);

    if (!w || w <= 0) {
      setError('عرض القماش بالمتر مطلوب ويجب أن يكون رقمًا أكبر من الصفر');
      return;
    }
    if (!g || g <= 0) {
      setError('وزن المتر المربع (GSM) مطلوب ويجب أن يكون رقمًا أكبر من الصفر');
      return;
    }

    try {
      setLoading(true);
      const res = await manufacturingApi.convertFabric({
        mode,
        widthM: w,
        gsm: g,
        lengthM: lengthM ? parseFloat(lengthM) : null,
        weightKg: weightKg ? parseFloat(weightKg) : null,
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء إجراء عملية التحويل');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setWidthM('1.6');
    setGsm('240');
    setLengthM('');
    setWeightKg('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Header and Mode Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-border/70">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-primary" />
            <span>تحويل الكيلو ↔ المتر (Textile Metric Conversion)</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            حساب وزن المتر الطولي، التحويل بين الأمتار والكيلوجرامات، ومقارنة الوزن الفعلي بالنظري للأثواب
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border/60 text-xs">
          <button
            type="button"
            onClick={() => setMode('both')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              mode === 'both' ? 'bg-primary text-primary-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            كلاهما (مع المقارنة)
          </button>
          <button
            type="button"
            onClick={() => setMode('kg')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              mode === 'kg' ? 'bg-primary text-primary-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            أمتار ← كجم
          </button>
          <button
            type="button"
            onClick={() => setMode('m')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              mode === 'm' ? 'bg-primary text-primary-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            كجم ← أمتار
          </button>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleCalculate} className="p-4 rounded-xl bg-card border border-border/70 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Width */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              عرض القماش بالمتر (Width - م) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={widthM}
              onChange={(e) => setWidthM(e.target.value)}
              placeholder="مثال: 1.60 أو 1.80"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            />
            <span className="text-[10px] text-muted-foreground block mt-1">عرض الثوب مفتوحًا بالمتر</span>
          </div>

          {/* GSM */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              وزن المتر المربع (GSM - جم/م²) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="1"
              min="1"
              required
              value={gsm}
              onChange={(e) => setGsm(e.target.value)}
              placeholder="مثال: 180 أو 240 أو 320"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            />
            <span className="text-[10px] text-muted-foreground block mt-1">Grams per Square Meter</span>
          </div>

          {/* Length */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              الطول بالمتر (Length - م) {mode === 'kg' && <span className="text-destructive">*</span>}
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={lengthM}
              onChange={(e) => setLengthM(e.target.value)}
              disabled={mode === 'm'}
              placeholder="مثال: 1000"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none disabled:opacity-50"
            />
            <span className="text-[10px] text-muted-foreground block mt-1">طول الثوب أو الطلبية</span>
          </div>

          {/* Weight */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              الوزن بالكيلوجرام (Weight - كجم) {mode === 'm' && <span className="text-destructive">*</span>}
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              disabled={mode === 'kg'}
              placeholder="مثال: 384"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none disabled:opacity-50"
            />
            <span className="text-[10px] text-muted-foreground block mt-1">الوزن الفعلي المسجل للثوب</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition rounded-lg hover:bg-muted/40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>تصفير الحقول</span>
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>{loading ? 'جارٍ الحساب...' : 'حساب التحويل والأوزان'}</span>
          </button>
        </div>
      </form>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="p-4 rounded-xl bg-card border border-border/70 space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>نتائج التحويل الحسابية المعتمدة</span>
            </h3>
            <span className="text-[11px] font-mono text-muted-foreground">
              العرض: {result.widthM} م · الكثافة: {result.gsm} GSM
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Weight per linear meter */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
              <span className="text-[11px] text-muted-foreground block mb-1">وزن المتر الطولي (Linear M)</span>
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-foreground">
                {result.display?.weightPerMeter ?? result.weightPerMeter} <span className="text-xs font-normal text-muted-foreground">كجم/م</span>
              </div>
              <span className="text-[10px] text-muted-foreground">العرض × GSM ÷ 1000</span>
            </div>

            {/* Computed Weight */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
              <span className="text-[11px] text-muted-foreground block mb-1">الوزن النظري المحسوب</span>
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-emerald-600">
                {result.display?.computedWeight ?? result.computedWeight ?? '—'} <span className="text-xs font-normal text-muted-foreground">كجم</span>
              </div>
              <span className="text-[10px] text-muted-foreground">الطول × العرض × GSM ÷ 1000</span>
            </div>

            {/* Computed Length */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
              <span className="text-[11px] text-muted-foreground block mb-1">الطول النظري المحسوب</span>
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-primary">
                {result.display?.computedLength ?? result.computedLength ?? '—'} <span className="text-xs font-normal text-muted-foreground">متر</span>
              </div>
              <span className="text-[10px] text-muted-foreground">الوزن × 1000 ÷ (GSM × العرض)</span>
            </div>

            {/* Weight Difference */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
              <span className="text-[11px] text-muted-foreground block mb-1">فرق الوزن عن النظري</span>
              <div
                className={`text-base sm:text-lg font-bold font-mono tabular-nums ${
                  result.weightDiff === null || result.weightDiff === undefined
                    ? 'text-muted-foreground'
                    : result.weightDiff > 0
                    ? 'text-amber-600'
                    : result.weightDiff < 0
                    ? 'text-destructive'
                    : 'text-emerald-600'
                }`}
              >
                {result.weightDiff !== null && result.weightDiff !== undefined ? (
                  <>
                    {result.weightDiff > 0 ? `+${result.display?.weightDiff ?? result.weightDiff}` : result.display?.weightDiff ?? result.weightDiff}{' '}
                    <span className="text-xs font-normal text-muted-foreground">كجم</span>
                  </>
                ) : (
                  '—'
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">الوزن الفعلي − الوزن النظري</span>
            </div>
          </div>

          {/* Operational Policy Note */}
          <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-[11px] text-foreground flex items-center gap-2">
            <span className="font-semibold text-primary">قاعدة التشغيل:</span>
            <span>القياس الفعلي يُحفظ منفصلًا عن النظري لضبط استلامات الأثواب والجرد الفعلي وتفادي الفروق الخفية في القص.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FabricConversionTab;
