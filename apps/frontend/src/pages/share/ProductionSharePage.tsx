import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Package, Calendar, Layers, CheckCircle2, Clock, AlertTriangle, Factory } from 'lucide-react';
import { publicProductionApi, PublicProductionOrderData } from '../manufacturing/manufacturingApi';

const fmt = (d?: string | null) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('ar-EG');
};

export const ProductionSharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicProductionOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);

    if (!token) {
      setError('الرابط غير صالح');
      setLoading(false);
      return;
    }
    publicProductionApi
      .get(token)
      .then((res) => {
        setData(res);
        document.title = `أمر إنتاج ${res.orderNumber} | متابعة`;
      })
      .catch((err: any) => setError(err?.response?.data?.error || 'الرابط غير صالح أو تم إلغاؤه'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
        <div className="max-w-sm w-full text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h1 className="text-lg font-bold text-foreground">الرابط غير صالح</h1>
          <p className="text-sm text-muted-foreground">{error || 'مش قادرين نلاقي أمر الإنتاج ده'}</p>
        </div>
      </div>
    );
  }

  const planned = Number(data.plannedQuantity) || 0;
  const produced = Number(data.producedQuantity) || 0;
  const pct = planned > 0 ? Math.min(100, Math.round((produced / planned) * 100)) : 0;

  return (
    <div className="min-h-screen bg-background py-6 px-4" dir="rtl">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Factory className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-semibold">متابعة أمر الإنتاج</p>
                <h1 className="text-base font-bold text-foreground font-mono">{data.orderNumber}</h1>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              {data.statusLabelAr}
            </span>
          </div>

          {data.brandName && (
            <p className="text-xs text-muted-foreground">البراند: <span className="font-semibold text-foreground">{data.brandName}</span></p>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[10px] text-muted-foreground mb-1">الكمية المخططة</p>
              <p className="text-sm font-bold">{planned.toLocaleString('ar-EG')} قطعة</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[10px] text-muted-foreground mb-1">تم إنتاجه</p>
              <p className="text-sm font-bold">{produced.toLocaleString('ar-EG')} قطعة</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-muted-foreground">نسبة التنفيذ</span>
              <span className="font-bold">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> التسليم: {fmt(data.dueDate)}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> آخر تحديث: {fmt(data.updatedAt)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" /> مراحل التشغيل
          </h2>
          {data.stages.length === 0 ? (
            <p className="text-xs text-muted-foreground">لسه مفيش مراحل مسجلة على الأمر.</p>
          ) : (
            <ol className="space-y-2.5">
              {data.stages.map((s, i) => {
                const done = s.status === 'COMPLETED' || s.status === 'completed';
                return (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Package className="w-3 h-3" />}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{s.name}</p>
                      {s.completedAt && <p className="text-[10px] text-muted-foreground">{fmt(s.completedAt)}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground">تم إنشاء الرابط بواسطة MaxP — للاستفسار تواصل مع المصنع.</p>
      </div>
    </div>
  );
};

export default ProductionSharePage;
