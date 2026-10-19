import React, { useState } from 'react';
import { Scale, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { manufacturingApi } from '../manufacturingApi';

export const FabricActualWasteTab: React.FC = () => {
  const [unit, setUnit] = useState<'KG' | 'METER'>('KG');
  const [issuedTotal, setIssuedTotal] = useState<string>('600');
  const [consumedInAccepted, setConsumedInAccepted] = useState<string>('560');
  const [returnedGood, setReturnedGood] = useState<string>('30');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleCalculate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const issued = parseFloat(issuedTotal);
    const consumed = parseFloat(consumedInAccepted);
    const returned = returnedGood ? parseFloat(returnedGood) : 0;

    if (isNaN(issued) || issued <= 0) {
      setError('إجمالي المصروف مطلوب ويجب أن يكون رقمًا أكبر من الصفر');
      return;
    }
    if (isNaN(consumed) || consumed < 0) {
      setError('المستهلك في الإنتاج المقبول مطلوب ويجب أن يكون رقمًا موجبًا');
      return;
    }
    if (isNaN(returned) || returned < 0) {
      setError('المرتجع الصالح يجب أن يكون رقمًا موجبًا');
      return;
    }

    if (issued < consumed + returned) {
      setError(
        'يمنع تسجيل وحدة غير مبرمجة / قسمة على صفر أو نسبة هالك غير صالحة: إجمالي المصروف يجب أن يكون أكبر من أو يساوي مجموع المستهلك المقبول والمرتجع الصالح'
      );
      return;
    }

    try {
      setLoading(true);
      const res = await manufacturingApi.calculateActualWaste({
        issuedTotal: issued,
        consumedInAccepted: consumed,
        returnedGood: returned,
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء حساب الهالك الفعلي');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Unit Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-border/70">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            <span>حساب الهالك الفعلي والجرد (Actual Scrap & Reconciliation)</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            تسوية خامات أمر الإنتاج: المصروف − المستهلك في الإنتاج المقبول − المرتجع السليم
          </p>
        </div>

        {/* Unit Selector */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border/60 text-xs">
          <button
            type="button"
            onClick={() => setUnit('KG')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              unit === 'KG' ? 'bg-primary text-primary-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            بالكيلوجرام (كجم)
          </button>
          <button
            type="button"
            onClick={() => setUnit('METER')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              unit === 'METER' ? 'bg-primary text-primary-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            بالمتر الطولي (م)
          </button>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleCalculate} className="p-4 rounded-xl bg-card border border-border/70 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Issued Total */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              إجمالي المصروف من المخزن ({unit === 'KG' ? 'كجم' : 'متر'}) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={issuedTotal}
              onChange={(e) => setIssuedTotal(e.target.value)}
              placeholder="مثال: 600"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            />
            <span className="text-[10px] text-muted-foreground block mt-1">إجمالي ما صُرف بأذون الصرف الفعلية</span>
          </div>

          {/* Consumed in Accepted */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              المستهلك في الإنتاج المقبول ({unit === 'KG' ? 'كجم' : 'متر'}) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={consumedInAccepted}
              onChange={(e) => setConsumedInAccepted(e.target.value)}
              placeholder="مثال: 560"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            />
            <span className="text-[10px] text-muted-foreground block mt-1">القطع السليمة المستلمة × استهلاك القطعة</span>
          </div>

          {/* Returned Good */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              المرتجع الصالح للمخزن ({unit === 'KG' ? 'كجم' : 'متر'})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={returnedGood}
              onChange={(e) => setReturnedGood(e.target.value)}
              placeholder="مثال: 30"
              className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            />
            <span className="text-[10px] text-muted-foreground block mt-1">بواقي الأثواب السليمة المرتجعة للمستودع</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={() => {
              setIssuedTotal('');
              setConsumedInAccepted('');
              setReturnedGood('');
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
            <Scale className="w-3.5 h-3.5" />
            <span>{loading ? 'جارٍ الحساب...' : 'حساب الهالك الفعلي والتسوية'}</span>
          </button>
        </div>
      </form>

      {/* Error & Warning Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <div className="space-y-0.5">
            <span className="font-bold block">تحذير تسوية الجرد:</span>
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
              <span>نتيجة تسوية الهالك الفعلي لأمر التشغيل</span>
            </h3>
            <span className="text-[11px] font-mono text-muted-foreground">
              المصروف: {result.issuedTotal} {unit === 'KG' ? 'كجم' : 'متر'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Actual Waste Amount */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
              <span className="text-[11px] text-muted-foreground block mb-1">الهالك الفعلي غير المسترد</span>
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-amber-600">
                {result.actualWaste} <span className="text-xs font-normal text-muted-foreground">{unit === 'KG' ? 'كجم' : 'متر'}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">المصروف − المستهلك − المرتجع</span>
            </div>

            {/* Waste Percentage */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
              <span className="text-[11px] text-muted-foreground block mb-1">نسبة الهالك الفعلي</span>
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-foreground">
                {result.wastePercentFromIssued}% <span className="text-xs font-normal text-muted-foreground">من المصروف</span>
              </div>
              <span className="text-[10px] text-muted-foreground">(الهالك ÷ إجمالي المصروف) × 100</span>
            </div>

            {/* Reconciliation Status */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
              <span className="text-[11px] text-muted-foreground block mb-1">حالة التسوية المخزنية</span>
              <div className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>الكميات متوازنة ومقفلة</span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 block">جاهز للترحيل المخزني والمحاسبي</span>
            </div>
          </div>

          {/* Policy Note */}
          <div className="p-3 rounded-lg bg-muted/20 border border-border/60 text-xs text-foreground flex items-start gap-2">
            <span className="font-bold text-primary shrink-0">قاعدة الجرد والتسوية:</span>
            <span className="text-muted-foreground text-[11px] leading-relaxed">
              «الجرد والتسوية لكل أمر تشغيل: يمثل الهالك الفعلي غير المسترد أثناء القص والتشغيل (بقايا القص والهدر النهائي). يمنع إقفال أمر الإنتاج قبل إثبات المرتجع الصالح وقيد فرق الهالك على حساب الفاقد الصناعي».
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FabricActualWasteTab;
