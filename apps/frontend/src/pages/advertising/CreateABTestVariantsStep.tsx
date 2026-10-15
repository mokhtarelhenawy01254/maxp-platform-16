import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CreateAdTestData, FacebookCampaign } from '../../services/facebookAdsService';

interface CreateABTestVariantsStepProps {
  formData: CreateAdTestData;
  campaigns: FacebookCampaign[];
  loadingCampaigns: boolean;
  onInputChange: (field: keyof CreateAdTestData, value: any) => void;
  onVariantChange: (index: number, field: string, value: any) => void;
  onAddVariant: () => void;
  onRemoveVariant: (index: number) => void;
}

export const CreateABTestVariantsStep: React.FC<CreateABTestVariantsStepProps> = ({
  formData,
  campaigns,
  loadingCampaigns,
  onInputChange,
  onVariantChange,
  onAddVariant,
  onRemoveVariant,
}) => {
  return (
    <div className="space-y-4 text-xs">
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">
          الحملة الإعلانية <span className="text-destructive">*</span>
        </label>
        {loadingCampaigns ? (
          <p className="text-muted-foreground text-xs">جاري تحميل الحملات…</p>
        ) : (
          <select
            value={formData.campaignId}
            onChange={(e) => onInputChange("campaignId", e.target.value)}
            className="w-full px-3 py-2 text-xs border border-border/70 rounded-xl bg-muted/20 text-foreground focus:outline-hidden"
          >
            <option value="">اختر حملة نشطة للاختبار</option>
            {(campaigns || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.status})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-3 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">المتغيرات (Variants)</span>
          <button
            type="button"
            onClick={onAddVariant}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة متغير
          </button>
        </div>

        {(formData.variants || []).map((v, idx) => (
          <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/60">
            <span className="font-mono font-bold text-foreground text-xs w-6 text-center">
              {String.fromCharCode(65 + idx)}
            </span>
            <input
              type="text"
              value={v.name}
              onChange={(e) => onVariantChange(idx, "name", e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border/70 bg-card text-foreground"
              placeholder={`اسم المتغير ${idx + 1}`}
            />
            {formData.variants.length > 2 && (
              <button
                type="button"
                onClick={() => onRemoveVariant(idx)}
                className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            توزيع الزيارات ({formData.trafficSplit}%)
          </label>
          <input
            type="range"
            min="20"
            max="80"
            step="5"
            value={formData.trafficSplit}
            onChange={(e) => onInputChange("trafficSplit", Number(e.target.value))}
            className="w-full accent-primary cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">الحد الأدنى للنتائج للحسم</label>
          <input
            type="number"
            min="50"
            step="10"
            value={formData.minimumResults}
            onChange={(e) => onInputChange("minimumResults", Number(e.target.value))}
            className="w-full px-3 py-1.5 text-xs border border-border/70 rounded-xl bg-muted/20 font-mono tabular-nums text-foreground"
          />
        </div>
      </div>
    </div>
  );
};
