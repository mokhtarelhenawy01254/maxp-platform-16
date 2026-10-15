import React from 'react';
import { Layers, Split, Target, Sparkles, CheckCircle2 } from 'lucide-react';
import { CreateAdTestData, FacebookCampaign } from '../../services/facebookAdsService';

interface CreateABTestReviewProps {
  formData: CreateAdTestData;
  campaigns: FacebookCampaign[];
  testTypes: Array<{ value: string; label: string; description: string }>;
}

export const CreateABTestReview: React.FC<CreateABTestReviewProps> = ({
  formData,
  campaigns,
  testTypes,
}) => {
  const selectedCampaign = (campaigns || []).find((c) => c.id === formData.campaignId);
  const selectedType = (testTypes || []).find((t) => t.value === formData.testType);

  return (
    <div className="space-y-4 text-xs">
      <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 border-b border-border/60">
          <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="w-4 h-4" />
          </span>
          <h3 className="text-sm font-bold text-foreground">مراجعة إعدادات الاختبار</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-muted-foreground text-[11px]">اسم الاختبار:</span>
            <p className="font-semibold text-foreground text-xs">{formData.name}</p>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground text-[11px]">نوع الاختبار:</span>
            <p className="font-semibold text-foreground text-xs">{selectedType?.label || formData.testType}</p>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground text-[11px]">الحملة المستهدفة:</span>
            <p className="font-semibold text-foreground text-xs">{selectedCampaign?.name || formData.campaignId}</p>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground text-[11px]">توزيع الزيارات (Traffic Split):</span>
            <p className="font-mono tabular-nums font-semibold text-foreground text-xs">
              {formData.trafficSplit}% / {100 - (formData.trafficSplit || 50)}%
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground text-[11px]">الحد الأدنى للنتائج للحسم:</span>
            <p className="font-mono tabular-nums font-semibold text-foreground text-xs">
              {formData.minimumResults || 100} نتيجة
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground text-[11px]">الترقية التلقائية للفائز:</span>
            <p className="font-semibold text-foreground text-xs">
              {formData.autoPromote ? 'مفعل (Auto Promote)' : 'معطل'}
            </p>
          </div>
        </div>

        {formData.description && (
          <div className="pt-2 border-t border-border/60">
            <span className="text-muted-foreground text-[11px]">الوصف:</span>
            <p className="text-foreground mt-0.5 leading-relaxed">{formData.description}</p>
          </div>
        )}
      </div>

      {/* Variants List */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-3 shadow-2xs">
        <h4 className="text-xs font-bold text-foreground">المتغيرات ({formData.variants.length})</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(formData.variants || []).map((v, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <span>{v.name || `Variant ${idx + 1}`}</span>
              </div>
              {v.adSetId && (
                <p className="font-mono text-[10px] text-muted-foreground">AdSet: {v.adSetId}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
