import React from 'react';
import { SampleOrder } from '../manufacturingApi';
import { FlaskConical, Clock, CheckCircle2, XCircle, ArrowRightLeft } from 'lucide-react';

interface SampleMetricsBarProps {
  samples: SampleOrder[];
}

export const SampleMetricsBar: React.FC<SampleMetricsBarProps> = ({ samples }) => {
  const total = samples.length;
  const draftOrProgress = samples.filter((s) => s.status === 'DRAFT' || s.status === 'IN_PROGRESS').length;
  const approved = samples.filter((s) => s.status === 'APPROVED').length;
  const converted = samples.filter((s) => s.status === 'CONVERTED').length;
  const rejected = samples.filter((s) => s.status === 'REJECTED').length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
      <div className="bg-card border border-border/70 rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">إجمالي العينات</p>
          <p className="text-xl font-bold tracking-tight text-foreground tabular-nums mt-0.5">{total}</p>
        </div>
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <FlaskConical className="w-4 h-4" />
        </div>
      </div>

      <div className="bg-card border border-border/70 rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">قيد التجهيز / مسودة</p>
          <p className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums mt-0.5">
            {draftOrProgress}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <Clock className="w-4 h-4" />
        </div>
      </div>

      <div className="bg-card border border-border/70 rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">معتمدة جاهزة للتحويل</p>
          <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
            {approved}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      </div>

      <div className="bg-card border border-border/70 rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">محوّلة لأوامر تصنيع</p>
          <p className="text-xl font-bold tracking-tight text-purple-600 dark:text-purple-400 tabular-nums mt-0.5">
            {converted}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
          <ArrowRightLeft className="w-4 h-4" />
        </div>
      </div>

      <div className="bg-card border border-border/70 rounded-xl p-3 flex items-center justify-between col-span-2 sm:col-span-1">
        <div>
          <p className="text-xs text-muted-foreground font-medium">مرفوضة</p>
          <p className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
            {rejected}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <XCircle className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
