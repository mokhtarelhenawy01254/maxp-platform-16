import React, { useEffect, useState } from 'react';
import { X, GitBranch, CheckCircle2, Clock, Archive, Ruler, ArrowRight } from 'lucide-react';
import { manufacturingApi, SizeChart } from '../manufacturingApi';

interface SizeChartVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sizeChart: SizeChart | null;
}

export const SizeChartVersionsModal: React.FC<SizeChartVersionsModalProps> = ({
  isOpen,
  onClose,
  sizeChart,
}) => {
  const [versions, setVersions] = useState<SizeChart[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sizeChart) {
      setLoading(true);
      setError(null);
      manufacturingApi
        .getSizeChartVersions(sizeChart.id)
        .then((data) => setVersions(data))
        .catch(() => setError('تعذر تحميل سجل الإصدارات'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, sizeChart]);

  if (!isOpen || !sizeChart) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-xl flex flex-col rounded-xl bg-card border border-border/70 shadow-2xl overflow-hidden text-foreground">
        {/* Header */}
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">سجل إصدارات جدول المقاسات ({sizeChart.code})</h2>
              <p className="text-[11px] text-muted-foreground">{sizeChart.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">جارٍ تحميل سلسلة الإصدارات...</div>
          ) : error ? (
            <div className="py-4 text-center text-xs text-destructive">{error}</div>
          ) : versions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">لا توجد إصدارات مسجلة</div>
          ) : (
            <div className="space-y-2.5">
              {versions.map((ver) => {
                const isCurrent = ver.id === sizeChart.id;
                return (
                  <div
                    key={ver.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isCurrent
                        ? 'border-primary/50 bg-primary/5 shadow-xs'
                        : 'border-border/70 bg-card hover:bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border/60">
                          V{ver.version}
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                          {ver.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-semibold text-primary px-1.5 py-0.2 rounded bg-primary/10">
                            الحالي
                          </span>
                        )}
                      </div>
                      <div>
                        {ver.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            معتمد
                          </span>
                        )}
                        {ver.status === 'DRAFT' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-2.5 h-2.5" />
                            مسودة
                          </span>
                        )}
                        {ver.status === 'ARCHIVED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-muted text-muted-foreground border border-border/60">
                            <Archive className="w-2.5 h-2.5" />
                            مؤرشف
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <div>
                        <span>الوحدة: </span>
                        <strong className="text-foreground">{ver.unit}</strong>
                      </div>
                      <div>
                        <span>القياس: </span>
                        <strong className="text-foreground">{ver.measurementMethod === 'FLAT' ? 'فلات (مسطح)' : 'دائري'}</strong>
                      </div>
                      <div>
                        <span>الصفوف: </span>
                        <strong className="text-foreground">{ver.rows?.length || 0}</strong>
                      </div>
                      <div>
                        <span>تاريخ الإنشاء: </span>
                        <span className="text-foreground tabular-nums">
                          {new Date(ver.createdAt).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </div>

                    {ver.supersedesId && (
                      <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span>مستنسخ من الإصدار السابق (ID: {ver.supersedesId.slice(-6)})</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
