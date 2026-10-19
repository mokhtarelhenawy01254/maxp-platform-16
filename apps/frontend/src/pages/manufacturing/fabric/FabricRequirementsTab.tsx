import React, { useState } from 'react';
import { Calculator, CheckCircle2, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';
import { manufacturingApi } from '../manufacturingApi';

interface FabricRequirementsTabProps {
  initialWidth?: string;
  initialGsm?: string;
  initialConsumption?: string;
  initialPieces?: string;
}

export const FabricRequirementsTab: React.FC<FabricRequirementsTabProps> = ({
  initialWidth = '1.6',
  initialGsm = '240',
  initialConsumption = '1.4',
  initialPieces = '1000',
}) => {
  const [pieces, setPieces] = useState<string>(initialPieces);
  const [metersPerPiece, setMetersPerPiece] = useState<string>(initialConsumption);
  const [totalBaseMeters, setTotalBaseMeters] = useState<string>('');
  const [wastePercent, setWastePercent] = useState<string>('5');
  const [widthM, setWidthM] = useState<string>(initialWidth);
  const [gsm, setGsm] = useState<string>(initialGsm);
  const [pricePerKg, setPricePerKg] = useState<string>('180');
  const [pricePerM, setPricePerM] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const loadClientExample = () => {
    setPieces('1000');
    setMetersPerPiece('1.4');
    setTotalBaseMeters('');
    setWastePercent('5');
    setWidthM('1.6');
    setGsm('240');
    setPricePerKg('180');
    setPricePerM('');
    setError(null);
  };

  const handleCalculate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const waste = parseFloat(wastePercent);
    if (isNaN(waste) || waste < 0) {
      setError('نسبة الهالك لا يمكن أن تكون سالبة');
      return;
    }
    if (waste >= 100) {
      setError('يمنع تسجيل وحدة غير مبرمجة / قسمة على صفر أو نسبة هالك غير صالحة: نسبة الهالك يجب أن تكون أقل من 100%');
      return;
    }

    const w = parseFloat(widthM);
    if (!w || w <= 0) {
      setError('عرض القماش بالمتر مطلوب ويجب أن يكون رقمًا أكبر من الصفر');
      return;
    }

    const g = parseFloat(gsm);
    if (!g || g <= 0) {
      setError('وزن المتر المربع (GSM) مطلوب ويجب أن يكون رقمًا أكبر من الصفر');
      return;
    }

    const p = pieces ? parseFloat(pieces) : null;
    const m = metersPerPiece ? parseFloat(metersPerPiece) : null;
    const tb = totalBaseMeters ? parseFloat(totalBaseMeters) : null;

    if (!tb && (!p || !m)) {
      setError('يجب إدخال إجمالي الأمتار الأساسية أو (عدد القطع مع استهلاك القطعة بالمتر) بقيم أكبر من الصفر');
      return;
    }

    try {
      setLoading(true);
      const res = await manufacturingApi.calculateFabricRequirements({
        pieces: p,
        metersPerPiece: m,
        totalBaseMeters: tb,
        wastePercent: waste,
        widthM: w,
        gsm: g,
        pricePerKg: pricePerKg ? parseFloat(pricePerKg) : null,
        pricePerM: pricePerM ? parseFloat(pricePerM) : null,
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'حدث خطأ في حساب احتياجات وتكلفة القماش');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Preset Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-border/70">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" />
            <span>احتياجات القماش وتكلفة أمر التشغيل (Fabric Requirements & Costing)</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            حساب الأمتار المطلوبة شاملة الهالك، إجمالي الوزن المتوقع بالكيلوجرام، وتكلفة القماش للقطعة الواحدة
          </p>
        </div>

        <button
          type="button"
          onClick={loadClientExample}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition border border-primary/20"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>مثال العميل المعتمد (1000 قطعة × 1.4م)</span>
        </button>
      </div>

      {/* Input Form */}
      <form onSubmit={handleCalculate} className="p-4 rounded-xl bg-card border border-border/70 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Pieces */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              عدد القطع المطلوب إنتاجها (Pieces)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              value={pieces}
              onChange={(e) => setPieces(e.target.value)}
              placeholder="مثال: 1000"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            />
            <span className="text-[10px] text-muted-foreground block mt-1">حجم أمر الإنتاج أو الباتش</span>
          </div>

          {/* Consumption per piece */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              استهلاك القطعة بالمتر (Consumption - م)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={metersPerPiece}
              onChange={(e) => setMetersPerPiece(e.target.value)}
              placeholder="مثال: 1.40"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            />
            <span className="text-[10px] text-muted-foreground block mt-1">المتر الطولي الصافي للقطعة</span>
          </div>

          {/* Total base meters (alternative) */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              أو إجمالي الأمتار الأساسية (اختياري)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={totalBaseMeters}
              onChange={(e) => setTotalBaseMeters(e.target.value)}
              placeholder="مثال: 1400"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            />
            <span className="text-[10px] text-muted-foreground block mt-1">يُحسب تلقائيًا لو تُرك فارغًا</span>
          </div>

          {/* Waste Percent */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              نسبة الهالك % من المصروف (Waste %) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="99.9"
              required
              value={wastePercent}
              onChange={(e) => setWastePercent(e.target.value)}
              placeholder="مثال: 5"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            />
            <span className="text-[10px] text-muted-foreground block mt-1">هالك القص والتشغيل (أقل من 100%)</span>
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
              placeholder="مثال: 240"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            />
          </div>

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
              placeholder="مثال: 1.60"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Price per Kg */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              سعر الكيلو (ج.م / كجم)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={pricePerKg}
              onChange={(e) => setPricePerKg(e.target.value)}
              placeholder="مثال: 180"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Price per Meter */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              أو سعر المتر (ج.م / متر)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={pricePerM}
              onChange={(e) => setPricePerM(e.target.value)}
              placeholder="مثال: 70"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={() => {
              setPieces('');
              setMetersPerPiece('');
              setTotalBaseMeters('');
              setWastePercent('5');
              setPricePerKg('');
              setPricePerM('');
              setResult(null);
              setError(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition rounded-lg hover:bg-muted/40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>تفريغ الحقول</span>
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>{loading ? 'جارٍ الحساب...' : 'حساب الاحتياجات والتكلفة'}</span>
          </button>
        </div>
      </form>

      {/* Error & Warning Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <div className="space-y-0.5">
            <span className="font-bold block">تحذير تدقيق المعادلة:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="p-4 rounded-xl bg-card border border-border/70 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>مخرجات التخطيط والتكاليف المعتمدة</span>
            </h3>
            <span className="text-[11px] font-mono text-muted-foreground">
              الأساسي: {result.baseMeters} م · الهالك: {result.wastePercent}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Required Meters with Waste */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
              <span className="text-[11px] text-muted-foreground block mb-1">المطلوب شامل الهالك</span>
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-foreground">
                {result.metersWithWaste} <span className="text-xs font-normal text-muted-foreground">متر</span>
              </div>
              <span className="text-[10px] text-muted-foreground">الأساسي ÷ (1 − الهالك%)</span>
            </div>

            {/* Expected Weight in Kg */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
              <span className="text-[11px] text-muted-foreground block mb-1">الوزن المتوقع للطلب</span>
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-emerald-600">
                {result.expectedWeightKg} <span className="text-xs font-normal text-muted-foreground">كجم</span>
              </div>
              <span className="text-[10px] text-muted-foreground">المطلوب × العرض × GSM ÷ 1000</span>
            </div>

            {/* Total Cost */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
              <span className="text-[11px] text-muted-foreground block mb-1">تكلفة القماش الإجمالية</span>
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-primary">
                {result.totalCost !== null ? `${result.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}{' '}
                <span className="text-xs font-normal text-muted-foreground">ج.م</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {result.costByKg !== null ? 'بناءً على سعر الكيلو' : 'بناءً على سعر المتر'}
              </span>
            </div>

            {/* Cost Per Piece */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
              <span className="text-[11px] text-muted-foreground block mb-1">تكلفة القماش / قطعة</span>
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-foreground">
                {result.costPerPiece !== null ? `${result.costPerPiece.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}{' '}
                <span className="text-xs font-normal text-muted-foreground">ج.م/قطعة</span>
              </div>
              <span className="text-[10px] text-muted-foreground">التكلفة الإجمالية ÷ عدد القطع</span>
            </div>
          </div>

          {/* Equation Breakdown Box */}
          <div className="p-3 rounded-lg bg-muted/20 border border-border/60 text-[11px] space-y-1.5 text-muted-foreground font-mono">
            <div className="font-sans font-semibold text-foreground text-xs mb-1">تفصيل المعادلات الرياضية المطبقة:</div>
            <div>• الأساسي = {result.pieces ? `${result.pieces} قطعة × ${result.metersPerPiece} م = ${result.baseMeters} م` : `${result.baseMeters} م`}</div>
            <div>• المطلوب شامل الهالك = {result.baseMeters} ÷ (1 − {result.wastePercent}/100) = <strong className="text-foreground">{result.metersWithWaste} م</strong></div>
            <div>• الوزن المتوقع = {result.metersWithWaste} × {result.widthM}م × {result.gsm}GSM ÷ 1000 = <strong className="text-foreground">{result.expectedWeightKg} كجم</strong></div>
            {result.totalCost !== null && (
              <div>• التكلفة = {result.costByKg !== null ? `${result.expectedWeightKg} كجم × ${result.pricePerKg} ج = ` : `${result.metersWithWaste} م × ${result.pricePerM} ج = `}<strong className="text-primary">{result.totalCost} ج.م</strong> ({result.costPerPiece} ج.م للقطعة)</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FabricRequirementsTab;
